#!/usr/bin/env node
/**
 * Backfill pre-generated WebP renditions for every original in the `art-images`
 * bucket. For each `artworks/<hash>.<ext>` original it writes:
 *   renditions/w800/artworks/<hash>.webp   (grid / cards)
 *   renditions/w1400/artworks/<hash>.webp  (detail hero)
 *
 * The full-size originals are left untouched (still used for the Pro download and
 * the detail-page zoom). Serving the renditions is gated in the app by
 * NEXT_PUBLIC_USE_IMAGE_RENDITIONS=1 — flip that only after this backfill finishes.
 *
 * Run:
 *   npm run images:renditions
 *   # or: node --env-file=.env.local scripts/generate-image-renditions.mjs
 *
 * Requires SUPABASE_SERVICE_KEY + NEXT_PUBLIC_SUPABASE_URL in the env, and `sharp`.
 * The script is RESUMABLE and idempotent: it skips any rendition that already
 * exists, so it is safe to re-run (e.g. on a schedule) to cover newly-added images.
 *
 * Keep VARIANTS in sync with IMAGE_RENDITIONS in lib/utils.ts.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const BUCKET = "art-images";
const SOURCE_PREFIX = "artworks";
const RENDITION_PREFIX = "renditions";
const CONCURRENCY = 8;
const PAGE_SIZE = 1000;

/** Optional `--limit=N` (or RENDITION_LIMIT env) to process only the first N originals — for testing. */
const LIMIT = (() => {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  const raw = arg ? arg.slice("--limit=".length) : process.env.RENDITION_LIMIT;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
})();

/** Must match IMAGE_RENDITIONS in lib/utils.ts. */
const VARIANTS = [
  { key: "w800", width: 800, quality: 75 },
  { key: "w1400", width: 1400, quality: 80 },
];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY. " +
      "Run via `npm run images:renditions` (loads .env.local)."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

/** List every file key under a storage prefix (folders are skipped), paginated. */
async function listAll(prefix) {
  const keys = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      // Files carry an `id`; folder placeholders have `id === null`.
      if (item.id) keys.push(`${prefix}/${item.name}`);
    }
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return keys;
}

/** artworks/<hash>.jpg -> renditions/<variant>/artworks/<hash>.webp */
function renditionKey(variantKey, sourceKey) {
  const webp = sourceKey.replace(/\.[a-z0-9]+$/i, ".webp");
  return `${RENDITION_PREFIX}/${variantKey}/${webp}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Network blips (ECONNRESET, undici "terminated", timeouts, 5xx) — worth retrying. */
function isTransient(err) {
  const msg = String(err?.message ?? err ?? "");
  return /terminated|ECONNRESET|ETIMEDOUT|EPIPE|fetch failed|socket hang up|network|timeout|\b5\d\d\b/i.test(msg);
}

/** Retry an async op with exponential backoff, but only for transient errors. */
async function withRetry(fn, attempts = 5) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!isTransient(e) || i >= attempts - 1) throw e;
      await sleep(Math.min(500 * 2 ** i, 8000));
    }
  }
}

async function processOne(sourceKey, existing) {
  const missing = VARIANTS.filter((v) => !existing.has(renditionKey(v.key, sourceKey)));
  if (missing.length === 0) return { status: "skip" };

  try {
    // Download (with the array-buffer read) is retried as a unit so a mid-stream
    // abort just starts the download over rather than crashing the run.
    const input = await withRetry(async () => {
      const { data, error } = await supabase.storage.from(BUCKET).download(sourceKey);
      if (error) throw new Error(`download: ${error.message}`);
      return Buffer.from(await data.arrayBuffer());
    });

    for (const v of missing) {
      let out;
      try {
        out = await sharp(input)
          .rotate() // honour EXIF orientation
          .resize({ width: v.width, withoutEnlargement: true })
          .webp({ quality: v.quality })
          .toBuffer();
      } catch (e) {
        return { status: "error", key: sourceKey, error: `sharp(${v.key}): ${e.message}` };
      }
      await withRetry(async () => {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(renditionKey(v.key, sourceKey), out, {
            contentType: "image/webp",
            upsert: true,
          });
        if (error) throw new Error(`upload(${v.key}): ${error.message}`);
      });
    }
    return { status: "done" };
  } catch (e) {
    // Never let a single image take down the whole run.
    return { status: "error", key: sourceKey, error: e?.message ?? String(e) };
  }
}

async function run() {
  console.log("Listing source originals…");
  let sources = await listAll(SOURCE_PREFIX);
  console.log(`Found ${sources.length} originals under ${SOURCE_PREFIX}/.`);
  if (LIMIT) {
    sources = sources.slice(0, LIMIT);
    console.log(`--limit active: processing only ${sources.length}.`);
  }

  console.log("Listing existing renditions (for resume)…");
  const existing = new Set();
  for (const v of VARIANTS) {
    const keys = await listAll(`${RENDITION_PREFIX}/${v.key}/${SOURCE_PREFIX}`);
    for (const k of keys) existing.add(k);
  }
  console.log(`Found ${existing.size} existing rendition files.`);

  let done = 0;
  let skip = 0;
  let err = 0;
  let cursor = 0;
  const errors = [];
  const startedAt = Date.now();

  async function worker() {
    while (cursor < sources.length) {
      const key = sources[cursor++];
      const r = await processOne(key, existing);
      if (r.status === "done") done++;
      else if (r.status === "skip") skip++;
      else {
        err++;
        errors.push(r);
      }
      const total = done + skip + err;
      if (total % 200 === 0) {
        const rate = total / ((Date.now() - startedAt) / 1000);
        console.log(
          `progress ${total}/${sources.length}  done=${done} skip=${skip} err=${err}  (${rate.toFixed(1)}/s)`
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nFinished in ${((Date.now() - startedAt) / 1000).toFixed(0)}s. done=${done} skip=${skip} err=${err}`);
  if (errors.length) {
    console.log(`\nFirst ${Math.min(20, errors.length)} errors:`);
    for (const e of errors.slice(0, 20)) console.log(` - ${e.key}: ${e.error}`);
    console.log("\nRe-run the script to retry failed items (already-done ones are skipped).");
    process.exitCode = 1;
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
