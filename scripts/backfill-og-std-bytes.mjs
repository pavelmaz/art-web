#!/usr/bin/env node
/**
 * Backfill artworks.std_bytes with the TRUE size of the og1200 JPEG rendition —
 * the file the free-download button actually serves now. std_bytes previously
 * held a 1400px WebP-or-JPEG-q90 size from an earlier rendition, which overstates
 * (or understates) the real og1200 file — showing it would mislead the visitor
 * about what they're about to download.
 *
 * The og1200 rendition is already a real, pre-generated file in storage (see
 * generate-image-renditions.mjs), so this needs no download/re-encode: it lists
 * the rendition folder for size metadata only (zero bytes transferred), then
 * updates each row's std_bytes to match. Resumable via a local cursor file.
 *
 * Run: nohup node --env-file=.env.local scripts/backfill-og-std-bytes.mjs &
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "art-images";
const OG_PREFIX = "renditions/og1200/artworks";
const PAGE_SIZE = 1000;
const CONCURRENCY = 25;
const CURSOR = "/private/tmp/claude-502/-Users-pavelm-Desktop-art-web-main/cfb5e529-46ad-481e-9adc-49afc177a88f/scratchpad/og-std-bytes-cursor.txt";
const SIZE_MAP_LOG = "/private/tmp/claude-502/-Users-pavelm-Desktop-art-web-main/cfb5e529-46ad-481e-9adc-49afc177a88f/scratchpad/og-std-bytes-progress.log";

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  try {
    writeFileSync(SIZE_MAP_LOG, line + "\n", { flag: "a" });
  } catch {}
}

/** artworks/<hash>.<ext> -> <hash> (matches renditionKey's source-hash logic). */
function hashFromImageId(imageId) {
  if (!imageId?.includes("/art-images/artworks/")) return null;
  const m = imageId.match(/\/art-images\/artworks\/([^/?]+)\.[a-z0-9]+(?:\?.*)?$/i);
  return m ? m[1] : null;
}

async function buildSizeMap() {
  log("Listing renditions/og1200/artworks for size metadata (no downloads)…");
  const map = new Map();
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(OG_PREFIX, { limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      if (!item.id || !item.metadata?.size) continue;
      const hash = item.name.replace(/\.[a-z0-9]+$/i, "");
      map.set(hash, item.metadata.size);
    }
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (map.size % 50000 < PAGE_SIZE) log(`  listed ${map.size} og1200 files so far…`);
  }
  log(`Size map built: ${map.size} og1200 renditions.`);
  return map;
}

async function run() {
  const sizeMap = await buildSizeMap();

  let cursor = existsSync(CURSOR) ? readFileSync(CURSOR, "utf-8").trim() : "";
  let done = 0, skip = 0, noRendition = 0, fail = 0;
  const startedAt = Date.now();

  async function processOne(row) {
    const hash = hashFromImageId(row.image_id);
    if (!hash) { skip++; return; }
    const size = sizeMap.get(hash);
    if (!size) { noRendition++; return; }
    if (row.std_bytes === size) { skip++; return; }
    const { error } = await supabase.from("artworks").update({ std_bytes: size }).eq("id", row.id);
    if (error) { fail++; return; }
    done++;
  }

  for (;;) {
    const { data: rows, error } = await supabase
      .from("artworks")
      .select("id, image_id, std_bytes")
      .gt("id", cursor)
      .order("id", { ascending: true })
      .limit(1000);
    if (error) throw error;
    if (!rows?.length) break;

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      await Promise.all(rows.slice(i, i + CONCURRENCY).map(processOne));
    }
    cursor = rows[rows.length - 1].id;
    writeFileSync(CURSOR, cursor);

    const total = done + skip + noRendition + fail;
    const rate = total / ((Date.now() - startedAt) / 1000);
    log(`progress ${total}  done=${done} skip=${skip} noRendition=${noRendition} fail=${fail}  (${rate.toFixed(0)}/s) @ ${cursor}`);
  }

  log(`OG STD_BYTES BACKFILL COMPLETE done=${done} skip=${skip} noRendition=${noRendition} fail=${fail}`);
}

run().catch((e) => {
  log(`FATAL: ${e?.message ?? e}`);
  process.exit(1);
});
