#!/usr/bin/env node
/**
 * Fix artworks that have a stored original but NO renditions (img_width IS NULL).
 * These came from an incomplete Wikipedia import: the original .jpg was uploaded
 * to our bucket, but the w800/w1400/og1200 renditions were never generated — so
 * the page requests the w1400 rendition, gets a 404, and shows a broken image.
 *
 * This reads each already-stored original (via the service key), generates the
 * renditions, and backfills img_width/height/orig_bytes/std_bytes. It does NOT
 * change image_id (keeps the existing original). Small batch, small files.
 *
 * Run: node --env-file=.env.local scripts/fix-missing-renditions.mjs
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const BUCKET = "art-images";
const VARIANTS = [
  { key: "w800", width: 800, quality: 75, format: "webp" },
  { key: "w1400", width: 1400, quality: 80, format: "webp" },
  { key: "og1200", width: 1200, quality: 80, format: "jpeg" },
];

async function fixOne(row) {
  const m = row.image_id?.match(/\/art-images\/(.+)$/);
  if (!m) throw new Error("cannot parse storage key");
  const key = decodeURIComponent(m[1].split("?")[0]);      // e.g. artworks/<hash>.jpg
  const sha = key.replace(/^artworks\//, "").replace(/\.[a-z0-9]+$/i, "");

  const dl = await supabase.storage.from(BUCKET).download(key);
  if (dl.error) throw new Error(`download ${dl.error.message}`);
  const buf = Buffer.from(await dl.data.arrayBuffer());
  const meta = await sharp(buf, { limitInputPixels: false }).metadata();
  if (!meta.width || !meta.height) throw new Error("no dims from original");

  let stdBytes = null;
  for (const v of VARIANTS) {
    const pipe = sharp(buf, { limitInputPixels: false }).rotate().resize({ width: v.width, withoutEnlargement: true });
    const out = await (v.format === "jpeg" ? pipe.jpeg({ quality: v.quality, mozjpeg: true }) : pipe.webp({ quality: v.quality })).toBuffer();
    if (v.key === "w1400") stdBytes = out.length;
    const ru = await supabase.storage.from(BUCKET).upload(
      `renditions/${v.key}/artworks/${sha}.${v.format === "jpeg" ? "jpg" : "webp"}`, out,
      { contentType: v.format === "jpeg" ? "image/jpeg" : "image/webp", upsert: true });
    if (ru.error) throw new Error(`rend ${v.key} ${ru.error.message}`);
  }

  const upd = await supabase.from("artworks").update({
    img_width: meta.width, img_height: meta.height, orig_bytes: buf.length, std_bytes: stdBytes,
  }).eq("id", row.id);
  if (upd.error) throw new Error(upd.error.message);
  return { w: meta.width, h: meta.height };
}

// ---------- main ----------
const { data: rows, error } = await supabase
  .from("artworks")
  .select("id, slug, image_id")
  .ilike("image_id", "%supabase%")
  .is("img_width", null)
  .limit(2000);
if (error) throw error;
console.log(`FIX-RENDITIONS START: ${rows.length} stored-but-no-rendition rows`);

let done = 0, fail = 0;
for (const row of rows) {
  try {
    const r = await fixOne(row);
    done++;
    console.log(`✓ ${row.slug}  ${r.w}x${r.h}  (${done})`);
  } catch (e) {
    fail++;
    console.log(`✗ ${row.slug}: ${e.message}`);
  }
}
console.log(`FIX-RENDITIONS COMPLETE done=${done} fail=${fail}`);
