#!/usr/bin/env node
/**
 * APPLY pass for the Artvee→Commons source upgrades. Consumes the dry-run
 * report (verdict MATCH only), and for each artwork:
 *   1. downloads the Commons file (capped at 6000px via thumb API — larger
 *      originals are museum-scan overkill; 6000px ≫ the "4K" promise)
 *   2. uploads it as artworks/<sha256>.jpg to Supabase storage
 *   3. regenerates w800/w1400/og1200 renditions
 *   4. updates the artworks row (image_id + dims + bytes)
 *   5. records the OLD storage keys in a deletion list — do NOT delete
 *      immediately (cached pages reference old URLs for up to 24h);
 *      run the sweep script ~48h later.
 *
 * Run: node --env-file=.env.local scripts/upgrade-artvee-sources-apply.mjs <report.json>
 */
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const UA = "FineArtFree-upgrade/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
const BUCKET = "art-images";
const MAX_WIDTH = 6000;
const CONCURRENCY = Number(process.env.UPGRADE_CONCURRENCY ?? 1);
const SUPABASE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;

const reportPath = process.argv[2];
if (!reportPath) {
  console.error("usage: node scripts/upgrade-artvee-sources-apply.mjs <report.json>");
  process.exit(1);
}
const DELETION_LIST = reportPath.replace(/\.json$/, "") + "-old-keys.txt";

const VARIANTS = [
  { key: "w800", width: 800, quality: 75, format: "webp" },
  { key: "w1400", width: 1400, quality: 80, format: "webp" },
  { key: "og1200", width: 1200, quality: 80, format: "jpeg" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsDownloadUrl(fileName, origWidth) {
  const params = new URLSearchParams({
    action: "query", titles: `File:${fileName}`, prop: "imageinfo",
    iiprop: "url|size", format: "json", origin: "*",
  });
  if (origWidth > MAX_WIDTH) {
    params.set("iiurlwidth", String(MAX_WIDTH));
  }
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": UA },
  });
  const page = Object.values((await res.json())?.query?.pages ?? {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) throw new Error("no imageinfo");
  // Prefer the capped thumb (always jpg) when the original is oversized or not a jpg.
  if (origWidth > MAX_WIDTH || !/\.jpe?g$/i.test(ii.url)) {
    if (!ii.thumburl) throw new Error("no thumb for oversized/non-jpg file");
    return ii.thumburl;
  }
  return ii.url;
}

let done = 0, fail = 0;
const failures = [];

async function processOne(item) {
  // Skip if already upgraded (resumable): this artwork's original is now big.
  const pre = await supabase.from("artworks").select("img_width").eq("slug", item.slug).single();
  if (pre.data?.img_width && pre.data.img_width >= 1800) return "skip";

  const dlUrl = await commonsDownloadUrl(item.commonsFile, item.commonsWidth);
  let buf = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(dlUrl, { headers: { "User-Agent": UA } });
    if (res.ok) { buf = Buffer.from(await res.arrayBuffer()); break; }
    if (res.status === 429 || res.status >= 500) { await sleep(3000 * attempt); continue; }
    throw new Error(`download ${res.status}`);
  }
  if (!buf) throw new Error("download 429 after retries");

  const meta = await sharp(buf, { limitInputPixels: false }).metadata();
  if (!meta.width || meta.width < 1800) throw new Error(`downloaded file too small (${meta.width}px)`);

  const sha = createHash("sha256").update(buf).digest("hex");
  const newKey = `artworks/${sha}.jpg`;

  // Normalize to JPEG (thumbs already are; some "originals" are PNG).
  const jpegBuf = /\.jpe?g$/i.test(dlUrl)
    ? buf
    : await sharp(buf, { limitInputPixels: false }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();

  const up = await supabase.storage.from(BUCKET).upload(newKey, jpegBuf, {
    contentType: "image/jpeg", upsert: true,
  });
  if (up.error) throw new Error(`upload: ${up.error.message}`);

  let stdBytes = null;
  for (const v of VARIANTS) {
    const out = await sharp(jpegBuf, { limitInputPixels: false })
      .rotate()
      .resize({ width: v.width, withoutEnlargement: true })
      [v.format === "jpeg" ? "jpeg" : "webp"]({ quality: v.quality, ...(v.format === "jpeg" ? { mozjpeg: true } : {}) })
      .toBuffer();
    if (v.key === "w1400") stdBytes = out.length;
    const rendKey = `renditions/${v.key}/artworks/${sha}.${v.format === "jpeg" ? "jpg" : "webp"}`;
    const ru = await supabase.storage.from(BUCKET).upload(rendKey, out, {
      contentType: v.format === "jpeg" ? "image/jpeg" : "image/webp", upsert: true,
    });
    if (ru.error) throw new Error(`rendition ${v.key}: ${ru.error.message}`);
  }

  // Old keys for the deferred deletion sweep (original + its renditions).
  const { data: row, error: rowErr } = await supabase
    .from("artworks").select("image_id").eq("slug", item.slug).single();
  if (rowErr) throw new Error(rowErr.message);
  const oldKeyMatch = row.image_id?.match(/\/art-images\/(artworks\/[^?]+)/);
  if (oldKeyMatch) {
    const oldKey = oldKeyMatch[1];
    const oldBase = oldKey.replace(/^artworks\//, "").replace(/\.[a-z0-9]+$/i, "");
    appendFileSync(DELETION_LIST, [
      oldKey,
      `renditions/w800/artworks/${oldBase}.webp`,
      `renditions/w1400/artworks/${oldBase}.webp`,
      `renditions/og1200/artworks/${oldBase}.jpg`,
    ].join("\n") + "\n");
  }

  const { error: upErr } = await supabase
    .from("artworks")
    .update({
      image_id: `${SUPABASE_PUBLIC_BASE}${newKey}`,
      img_width: meta.width,
      img_height: meta.height,
      orig_bytes: jpegBuf.length,
      std_bytes: stdBytes,
    })
    .eq("slug", item.slug);
  if (upErr) throw new Error(upErr.message);
}

const report = JSON.parse(readFileSync(reportPath, "utf-8"));
const queue = report.filter((r) => r.verdict === "MATCH");
console.log(`applying ${queue.length} MATCH upgrades (REVIEW items skipped)`);

async function worker() {
  for (;;) {
    const item = queue.shift();
    if (!item) return;
    try {
      const r = await processOne(item);
      if (r === "skip") { console.log(`↷ ${item.slug} (already upgraded)`); continue; }
      done++;
      console.log(`✓ ${item.slug}  (${item.ourWidth}px -> capped ${Math.min(item.commonsWidth, MAX_WIDTH)}px)`);
    } catch (e) {
      fail++;
      failures.push(`${item.slug}: ${e.message}`);
      console.log(`✗ ${item.slug}: ${e.message}`);
    }
    await sleep(2000);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`\nAPPLY COMPLETE done=${done} fail=${fail}`);
console.log(`old keys for the 48h deletion sweep: ${DELETION_LIST}`);
for (const f of failures.slice(0, 15)) console.log(" -", f);
