// Copy freshly-imported artworks whose image_id still points at an external host
// (Wikimedia, museum sites) into Cloudflare R2, then repoint image_id at the
// R2-backed CDN path. Replaces the old migrate-external-images edge function,
// which uploaded to Supabase storage and so grew the bucket the project is
// trying to keep flat (memory: storage-egress-lockdown). Originals capped at
// MIGRATE_MAX_WIDTH; renditions match the rest of the pipeline.
//
// Run: node --env-file=.env.local scripts/migrate-new-to-r2.mjs [--since-hours=3] [--limit=200]
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const R2 = {
  account: process.env.R2_ACCOUNT_ID, key: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY, bucket: process.env.R2_BUCKET,
};
if (!URL_BASE || !KEY) throw new Error("Missing Supabase env");
if (!R2.account || !R2.key || !R2.secret || !R2.bucket) throw new Error("Missing R2_* env");
const supabase = createClient(URL_BASE, KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const SINCE_HOURS = Number(args.find((a) => a.startsWith("--since-hours="))?.split("=")[1] ?? 3);
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 200);
const MAX_WIDTH = Number(process.env.MIGRATE_MAX_WIDTH || 6000);
const UA = "FineArtFree-migrate/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
const BUCKET = "art-images";

const VARIANTS = [
  { key: "w800", width: 800, q: 75, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "w1400", width: 1400, q: 80, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "og1200", width: 1200, q: 80, fmt: "jpeg", ext: "jpg", ct: "image/jpeg" },
];

const TMP = mkdtempSync(join(tmpdir(), "mig-r2-"));
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

const sinceIso = new Date(Date.now() - SINCE_HOURS * 3600e3).toISOString();
// External = still an http(s) URL that is NOT already our storage host.
const { data: rows, error } = await supabase
  .from("artworks")
  .select("id, image_id, created_at")
  .like("image_id", "http%")
  .not("image_id", "like", `%${new URL(URL_BASE).host}%`)
  .gt("created_at", sinceIso)
  .limit(LIMIT);
if (error) throw error;

console.log(`migrate-new-to-r2: ${rows?.length ?? 0} external-image works since ${sinceIso}`);
let ok = 0, fail = 0, bytes = 0;
for (const row of rows ?? []) {
  try {
    const orig = Buffer.from(
      await (await fetch(row.image_id, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) })).arrayBuffer()
    );
    const jpeg = await sharp(orig, { limitInputPixels: false, failOn: "none" })
      .rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    const meta = await sharp(jpeg).metadata();
    const sha = createHash("sha256").update(jpeg).digest("hex");
    const objectPath = `artworks/${sha}.jpg`;
    r2Put(objectPath, jpeg, "image/jpeg");

    let stdBytes = null;
    for (const v of VARIANTS) {
      const buf = await sharp(jpeg).resize({ width: v.width, withoutEnlargement: true })[v.fmt]({ quality: v.q }).toBuffer();
      r2Put(`renditions/${v.key}/artworks/${sha}.${v.ext}`, buf, v.ct);
      if (v.key === "w1400") stdBytes = buf.length;
    }

    await supabase.from("artworks").update({
      image_id: `${URL_BASE}/storage/v1/object/public/${BUCKET}/${objectPath}`,
      img_width: meta.width, img_height: meta.height, orig_bytes: jpeg.length, std_bytes: stdBytes,
    }).eq("id", row.id);
    ok++; bytes += jpeg.length;
    console.log(`  ✓ ${row.id.slice(0, 46).padEnd(48)} ${meta.width}x${meta.height}  ${(jpeg.length / 1e6).toFixed(1)}MB`);
  } catch (e) {
    fail++;
    console.log(`  ✗ ${row.id.slice(0, 46)}: ${String(e.message).slice(0, 80)}`);
  }
}
rmSync(TMP, { recursive: true, force: true });
console.log(`\ndone — moved ${ok} to R2, ${fail} failed, ${(bytes / 1e6).toFixed(0)}MB`);
