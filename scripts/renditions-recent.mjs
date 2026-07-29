// Generate WebP/JPEG renditions for RECENTLY imported artworks only.
//
// The nightly generate-image-renditions.mjs lists the whole bucket (~minutes of
// setup) — massive overkill right after a daily drip import of ~25 works. This
// script instead queries the last 48h of rows whose image lives in our storage,
// checks each rendition with a HEAD request, and generates only what's missing.
// Also backfills img_width/img_height when null (from the original's metadata).
//
// Run: node --env-file=.env.local scripts/renditions-recent.mjs
import sharp from "sharp";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error("Missing Supabase env"); process.exit(1); }
const BUCKET = "art-images";
const CDN = "https://cdn.fineartfree.com";
const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const VARIANTS = [
  { key: "w800", width: 800, q: 75, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "w1400", width: 1400, q: 80, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "og1200", width: 1200, q: 80, fmt: "jpeg", ext: "jpg", ct: "image/jpeg" },
];

const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
const res = await fetch(
  // PostgREST `like` uses * as the wildcard
  `${URL}/rest/v1/artworks?select=id,slug,image_id,img_width&created_at=gt.${encodeURIComponent(since)}&image_id=like.${encodeURIComponent("*/art-images/artworks/*")}`,
  { headers: auth }
);
const rows = await res.json();
if (!res.ok || !Array.isArray(rows)) {
  console.error("query failed:", JSON.stringify(rows).slice(0, 300));
  process.exit(1);
}
console.log(`${rows.length} recent artwork(s) with stored images`);

let made = 0, ok = 0, fail = 0;
for (const row of rows) {
  const m = row.image_id.match(/\/art-images\/(artworks\/[^?]+)/);
  if (!m) continue;
  const key = m[1];
  const base = key.replace(/^artworks\//, "").replace(/\.[a-z0-9]+$/i, "");
  try {
    // Which renditions are missing? (HEAD against the public CDN)
    const missing = [];
    for (const v of VARIANTS) {
      const res = await fetch(`${CDN}/storage/v1/object/public/${BUCKET}/renditions/${v.key}/artworks/${base}.${v.ext}`, { method: "HEAD" });
      if (!res.ok) missing.push(v);
    }
    if (!missing.length && row.img_width) { ok++; continue; }

    const orig = await fetch(`${URL}/storage/v1/object/${BUCKET}/${key}`, { headers: auth });
    if (!orig.ok) throw new Error(`original ${orig.status}`);
    const buf = Buffer.from(await orig.arrayBuffer());
    const meta = await sharp(buf, { limitInputPixels: false }).metadata();

    for (const v of missing) {
      const pipe = sharp(buf, { limitInputPixels: false }).rotate().resize({ width: v.width, withoutEnlargement: true });
      const out = await (v.fmt === "jpeg" ? pipe.jpeg({ quality: v.q, mozjpeg: true }) : pipe.webp({ quality: v.q })).toBuffer();
      const up = await fetch(`${URL}/storage/v1/object/${BUCKET}/renditions/${v.key}/artworks/${base}.${v.ext}`, {
        method: "POST", headers: { ...auth, "Content-Type": v.ct, "x-upsert": "true" }, body: out,
      });
      if (!up.ok) throw new Error(`upload ${v.key} ${up.status}`);
    }
    if (!row.img_width && meta.width) {
      await fetch(`${URL}/rest/v1/artworks?id=eq.${encodeURIComponent(row.id)}`, {
        method: "PATCH", headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ img_width: meta.width, img_height: meta.height }),
      });
    }
    made++;
    console.log(`✓ ${row.slug} (${missing.map((v) => v.key).join(",") || "dims only"})`);
  } catch (e) {
    fail++;
    console.error(`✗ ${row.slug}: ${e.message}`);
  }
}
console.log(`done: ${made} generated, ${ok} already complete, ${fail} failed`);
