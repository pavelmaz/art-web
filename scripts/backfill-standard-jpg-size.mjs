#!/usr/bin/env node
/**
 * Backfill artworks.std_bytes with the TRUE size of the standard download —
 * the JPEG the /api/download proxy actually delivers (it re-encodes the w1400
 * WebP rendition to JPEG q90). std_bytes previously held the WebP size, which
 * understated the delivered file 2–4×.
 *
 * Reads the w1400 rendition via the Cloudflare CDN (R2 — ZERO Supabase egress),
 * re-encodes to JPEG q90 in memory to measure bytes, overwrites std_bytes.
 * Resumable via a local cursor file (last processed id). Safe to Ctrl-C.
 *
 * Run: nohup node --env-file=.env.local scripts/backfill-standard-jpg-size.mjs &
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const UA = "FineArtFree-stdsize/1.0 (https://fineartfree.com)";
const CDN = "https://cdn.fineartfree.com/";
const CONCURRENCY = 8;
const CURSOR = "/private/tmp/claude-502/-Users-pavelm-Desktop-art-web-main/cfb5e529-46ad-481e-9adc-49afc177a88f/scratchpad/std-jpg-cursor.txt";

let cursor = existsSync(CURSOR) ? readFileSync(CURSOR, "utf-8").trim() : "";
let done = 0, skip = 0, fail = 0;

/** supabase original URL -> CDN w1400 webp rendition URL (R2, zero egress). */
function w1400Url(imageId) {
  if (!imageId?.includes("supabase.co/")) return null;
  return imageId
    .replace(/^https:\/\/[a-z0-9-]+\.supabase\.co\//i, CDN)
    .split("?")[0]
    .replace("/art-images/artworks/", "/art-images/renditions/w1400/artworks/")
    .replace(/\.[a-z0-9]+$/i, ".webp");
}

async function processOne(row) {
  const url = w1400Url(row.image_id);
  if (!url) { skip++; return; }
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) { fail++; return; }
    const webp = Buffer.from(await res.arrayBuffer());
    const jpg = await sharp(webp, { limitInputPixels: false }).jpeg({ quality: 90 }).toBuffer();
    const { error } = await supabase.from("artworks").update({ std_bytes: jpg.length }).eq("id", row.id);
    if (error) { fail++; return; }
    done++;
  } catch {
    fail++;
  }
}

for (;;) {
  const { data: rows, error } = await supabase
    .from("artworks")
    .select("id, image_id")
    .like("image_id", "%supabase.co/storage/v1/object/public/art-images/artworks/%")
    .gt("id", cursor)
    .order("id", { ascending: true })
    .limit(500);
  if (error) throw error;
  if (!rows?.length) break;

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(processOne));
  }
  cursor = rows[rows.length - 1].id;
  writeFileSync(CURSOR, cursor);
  if ((done + skip + fail) % 2000 === 0) console.log(`progress done=${done} skip=${skip} fail=${fail} @ ${cursor}`);
}

console.log(`STD JPG SIZE BACKFILL COMPLETE done=${done} skip=${skip} fail=${fail}`);
