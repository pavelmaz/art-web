// AIC (Art Institute of Chicago) added hotlink protection — its IIIF now 403s any
// request without a Referer from artic.edu, so the ~83 artworks we still hotlink
// (source='aic', image_id on artic.edu) show a broken image. Their stored UUID is
// also stale (AIC re-issues image_ids). Fix: fetch the CURRENT image_id from the
// AIC API, download the image WITH the referer, and ingest our own copy to R2 +
// point image_id at our storage — same as the 2,182 AIC works already ingested.
//
// Env: AIC_SLUG (fix one slug) | AIC_LIMIT (default all) | AIC_DRY (1 = no writes)
// Run: node --env-file=.env.local scripts/fix-aic-hotlinks.mjs
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const R2 = { account: process.env.R2_ACCOUNT_ID, key: process.env.R2_ACCESS_KEY_ID, secret: process.env.R2_SECRET_ACCESS_KEY, bucket: process.env.R2_BUCKET };
if (!R2.account || !R2.key || !R2.secret || !R2.bucket) throw new Error("Missing R2_* env");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/art-images/`;
const UA = "FineArtFree-importer/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
// AIC's IIIF image server 403s non-browser UAs (in addition to requiring a referer),
// so the image download presents as a browser. These are public-domain works AIC
// publishes openly; we ingest our own copy, same as the 2,182 already stored.
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const DRY = process.env.AIC_DRY === "1";
const ONLY = process.env.AIC_SLUG;
const LIMIT = Number(process.env.AIC_LIMIT || 1000);
const REVERT = "scripts/aic-hotlink-revert.jsonl";
const VARIANTS = [
  { key: "w800", width: 800, q: 75, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "w1400", width: 1400, q: 80, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "og1200", width: 1200, q: 80, fmt: "jpeg", ext: "jpg", ct: "image/jpeg" },
];
const tmp = mkdtempSync(join(tmpdir(), "aic-"));
function r2Put(k, b, ct) {
  const f = join(tmp, "u.bin"); writeFileSync(f, b);
  execFileSync("curl", ["-s", "-f", "-m", "300", "--retry", "3", "--retry-all-errors", "--aws-sigv4", "aws:amz:auto:s3",
    "--user", `${R2.key}:${R2.secret}`, "-X", "PUT", "-H", `Content-Type: ${ct}`, "--data-binary", `@${f}`,
    `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${k}`]);
}
async function jget(url) { const r = await fetch(url, { headers: { "User-Agent": UA } }); return r.ok ? r.json() : null; }
// Download via curl, NOT fetch: AIC's IIIF needs a Referer header, and Node fetch
// silently drops `Referer` (a forbidden header). curl's -e sets it at the wire level.
function curlGet(url, referer) {
  const f = join(tmp, "dl.bin");
  try {
    execFileSync("curl", ["-s", "-f", "-m", "120", "--retry", "3", "--retry-all-errors", "-A", BROWSER_UA, "-e", referer, "-o", f, url]);
    return readFileSync(f);
  } catch { return null; }
}

// Query by the `aic-<id>` PK prefix (index range scan) rather than a leading-wildcard
// ilike on image_id, which full-scans and trips PostgREST's statement timeout.
// Paginate: PostgREST caps each response at 1000 rows, and the broken ones are
// scattered across all ~2,265 AIC rows.
const cols2 = "id, slug, title, image_id, url";
let allRows = [];
if (ONLY) {
  const { data, error } = await supabase.from("artworks").select(cols2).eq("slug", ONLY);
  if (error) throw error;
  allRows = data || [];
} else {
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("artworks").select(cols2).like("id", "aic-%").order("id").range(from, from + 999);
    if (error) throw error;
    allRows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
}
const rows = (ONLY ? allRows : allRows.filter((r) => (r.image_id || "").includes("artic.edu"))).slice(0, LIMIT);
console.log(`AIC hotlink fix — ${rows.length} rows${DRY ? " (DRY)" : ""}\n`);
const summary = { fixed: 0, skipped: 0, failed: 0 };

for (const row of rows) {
  try {
    const aicId = (row.id.match(/(\d+)$/) || row.url?.match(/artworks\/(\d+)/) || [])[1];
    if (!aicId) { console.log(`  ✗ no AIC id: ${row.slug}`); summary.skipped++; continue; }
    const meta = await jget(`https://api.artic.edu/api/v1/artworks/${aicId}?fields=image_id,is_public_domain`);
    const imageId = meta?.data?.image_id;
    if (!imageId) { console.log(`  ✗ no current image_id (deaccessioned?): ${row.slug}`); summary.skipped++; continue; }
    const iiif = `https://www.artic.edu/iiif/2/${imageId}/full/!3000,3000/0/default.jpg`;
    const orig = curlGet(iiif, `https://www.artic.edu/artworks/${aicId}`);
    if (!orig || orig.length < 2000) { console.log(`  ✗ IIIF download failed: ${row.slug}`); summary.failed++; continue; }
    const jpeg = await sharp(orig, { limitInputPixels: false, failOn: "none" }).rotate()
      .resize({ width: 6000, height: 6000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    const m = await sharp(jpeg).metadata();
    if (DRY) { console.log(`  → would fix ${row.slug}  ${m.width}x${m.height}`); summary.fixed++; continue; }
    const objectPath = `artworks/${row.slug}.jpg`;
    r2Put(objectPath, jpeg, "image/jpeg");
    let stdBytes = null;
    for (const v of VARIANTS) { const buf = await sharp(jpeg).resize({ width: v.width, withoutEnlargement: true })[v.fmt]({ quality: v.q }).toBuffer(); r2Put(`renditions/${v.key}/artworks/${row.slug}.${v.ext}`, buf, v.ct); if (v.key === "w1400") stdBytes = buf.length; }
    appendFileSync(REVERT, JSON.stringify({ id: row.id, slug: row.slug, old_image_id: row.image_id, ts: new Date().toISOString() }) + "\n");
    const { error: uerr } = await supabase.from("artworks").update({
      image_id: `${PUBLIC_BASE}${objectPath}`, img_width: m.width, img_height: m.height, orig_bytes: jpeg.length, std_bytes: stdBytes,
    }).eq("id", row.id);
    if (uerr) throw uerr;
    summary.fixed++;
    console.log(`  ✓ ${row.slug.slice(0, 46).padEnd(48)} ${m.width}x${m.height}`);
    await new Promise((r) => setTimeout(r, 400));
  } catch (e) { console.error(`  ✗ ${row.slug}: ${e.message}`); summary.failed++; }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`\ndone — fixed ${summary.fixed}, skipped ${summary.skipped}, failed ${summary.failed}`);
