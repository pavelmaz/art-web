// Generates renditions straight into R2 for artworks whose image_id already
// points at OUR OWN Supabase storage (the storeTiffOriginal() path in
// import-wikipedia.mjs, for TIFF sources bigger than the 1920px preview) —
// these never go through migrate-new-to-r2.mjs, which only handles rows whose
// image_id is still an external URL. Without this, such artworks show a
// correct original but 404 on every grid/detail/download rendition.
//
// Run: node --env-file=.env.local scripts/backfill-r2-renditions-direct.mjs [--since-hours=24] [--limit=200]
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY;
const R2 = {
  account: process.env.R2_ACCOUNT_ID, key: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY, bucket: process.env.R2_BUCKET,
};
const supabase = createClient(URL_BASE, KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const SINCE_HOURS = Number(args.find((a) => a.startsWith("--since-hours="))?.split("=")[1] ?? 24);
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 200);

const VARIANTS = [
  { key: "w800", width: 800, q: 75, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "w1400", width: 1400, q: 80, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "og1200", width: 1200, q: 80, fmt: "jpeg", ext: "jpg", ct: "image/jpeg" },
];

const TMP = mkdtempSync(join(tmpdir(), "r2-rend-"));
function r2Put(objectKey, body, contentType) {
  const f = join(TMP, "up.bin");
  writeFileSync(f, body);
  execFileSync("curl", [
    "-s", "-f", "-m", "300", "--aws-sigv4", "aws:amz:auto:s3",
    "--user", `${R2.key}:${R2.secret}`, "-X", "PUT",
    "-H", `Content-Type: ${contentType}`, "--data-binary", `@${f}`,
    `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${objectKey}`,
  ]);
}
function r2Head(objectKey) {
  try {
    execFileSync("curl", [
      "-s", "-f", "-m", "30", "--aws-sigv4", "aws:amz:auto:s3",
      "--user", `${R2.key}:${R2.secret}`, "-I",
      `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${objectKey}`,
    ]);
    return true;
  } catch {
    return false;
  }
}

const sinceIso = new Date(Date.now() - SINCE_HOURS * 3600e3).toISOString();
const host = new URL(URL_BASE).host;
const { data: rows, error } = await supabase
  .from("artworks")
  .select("id, image_id, std_bytes, created_at")
  .like("image_id", `%${host}%`)
  .gt("created_at", sinceIso)
  .limit(LIMIT);
if (error) throw error;

console.log(`${rows?.length ?? 0} Supabase-hosted artwork(s) since ${sinceIso}`);
let ok = 0, skip = 0, fail = 0;
for (const row of rows ?? []) {
  const m = row.image_id.match(/\/art-images\/artworks\/([^/?]+)\.[a-z0-9]+$/i);
  if (!m) { skip++; continue; }
  const hash = m[1];
  if (r2Head(`renditions/og1200/artworks/${hash}.jpg`)) { skip++; continue; } // already done
  try {
    // art-images is a PRIVATE bucket (memory: storage-egress-lockdown) — the
    // public-looking URL in image_id 400s on a plain fetch. Use the
    // authenticated storage API instead, same as generate-image-renditions.mjs.
    const { data, error: dlErr } = await supabase.storage.from("art-images").download(`artworks/${hash}.jpg`);
    if (dlErr) throw new Error(`download: ${dlErr.message}`);
    const orig = Buffer.from(await data.arrayBuffer());
    let stdBytes = row.std_bytes;
    for (const v of VARIANTS) {
      const buf = await sharp(orig, { limitInputPixels: false })
        .rotate().resize({ width: v.width, withoutEnlargement: true })[v.fmt]({ quality: v.q }).toBuffer();
      r2Put(`renditions/${v.key}/artworks/${hash}.${v.ext}`, buf, v.ct);
      if (v.key === "og1200") stdBytes = buf.length;
    }
    if (stdBytes !== row.std_bytes) {
      await supabase.from("artworks").update({ std_bytes: stdBytes }).eq("id", row.id);
    }
    ok++;
    console.log(`  ✓ ${row.id.slice(0, 60)}`);
  } catch (e) {
    fail++;
    console.error(`  ✗ ${row.id.slice(0, 60)}: ${e.message}`);
  }
}
console.log(`\nDone. ok=${ok} skip=${skip} fail=${fail}`);
