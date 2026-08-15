// Upscale low-res PAINTINGS locally with Real-ESRGAN (M4/MPS) and swap the result
// into R2 + the DB, reusing the reupgrade write-path. We enlarge our OWN image, so
// there is no matching/hash risk — it is guaranteed the same painting.
//
// Order: most-viewed first (score desc) within the low-res band, so the effort lands
// where users actually see it. Each done row jumps past the band (img_width grows) and
// is stamped upscaled_at, so re-runs never redo work.
//
// Reversible: the OLD original (Supabase) is left in place and every swap is logged to
// upscale-revert.jsonl (old image_id + dims) so any row can be rolled back.
//
// Env: UPSCALE_LIMIT (100) UPSCALE_MIN (400) UPSCALE_MAX (1400) UPSCALE_BATCH (16)
//      UPSCALE_CAP (3500) UPSCALE_ORDER (score|width) UPSCALE_DRY (1 = no writes)
import { createClient } from "@supabase/supabase-js";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import sharp from "sharp";

const R2 = { account: process.env.R2_ACCOUNT_ID, key: process.env.R2_ACCESS_KEY_ID, secret: process.env.R2_SECRET_ACCESS_KEY, bucket: process.env.R2_BUCKET };
if (!R2.account || !R2.key || !R2.secret || !R2.bucket) throw new Error("Missing R2_* env");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const TOOL = "/Users/pavelm/Desktop/upscale-tool";
const IN = TOOL + "/run-in", OUT = TOOL + "/run-out";
const REVIEWDIR = TOOL + "/review";
const REVERT = TOOL + "/upscale-revert.jsonl";
mkdirSync(REVIEWDIR, { recursive: true });
const SUPABASE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/art-images/`;
const VARIANTS = [
  { key: "w800", width: 800, quality: 75, format: "webp" },
  { key: "w1400", width: 1400, quality: 80, format: "webp" },
  { key: "og1200", width: 1200, quality: 80, format: "jpeg" },
];
const LIMIT = Number(process.env.UPSCALE_LIMIT || 100);
const MIN = Number(process.env.UPSCALE_MIN || 400);
const MAX = Number(process.env.UPSCALE_MAX || 1400);
const CAP = Number(process.env.UPSCALE_CAP || 3500);
const BATCH = Number(process.env.UPSCALE_BATCH || 16);
const ORDER = process.env.UPSCALE_ORDER || "score";
const DRY = process.env.UPSCALE_DRY === "1";

function r2Put(objectKey, body, contentType) {
  const f = join(TOOL, `r2put-${process.pid}.bin`);
  writeFileSync(f, body);
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      execFileSync("curl", ["-s", "-f", "-m", "300", "--retry", "3", "--retry-delay", "2", "--retry-all-errors",
        "--aws-sigv4", "aws:amz:auto:s3", "--user", `${R2.key}:${R2.secret}`,
        "-X", "PUT", "-H", `Content-Type: ${contentType}`, "--data-binary", `@${f}`,
        `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${objectKey}`]);
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      try { execFileSync("sleep", [String(attempt * 2)]); } catch {}
    }
  }
}
function r2Get(objectKey) {
  try {
    return execFileSync("curl", ["-s", "-f", "-m", "120", "--aws-sigv4", "aws:amz:auto:s3", "--user", `${R2.key}:${R2.secret}`,
      `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${objectKey}`], { maxBuffer: 1 << 30 });
  } catch { return null; }
}
// R2 first (zero egress); Supabase authed download as fallback (old imports are Supabase-only).
async function getOriginal(image_id) {
  const m = image_id?.match(/\/art-images\/(artworks\/[^?]+)/);
  const key = m ? m[1] : null;
  if (!key) return null;
  const r2 = r2Get(key);
  if (r2 && r2.length) return r2;
  const { data, error } = await supabase.storage.from("art-images").download(key);
  if (!error && data) return Buffer.from(await data.arrayBuffer());
  return null;
}
const stamp = async (id) => { if (!DRY) await supabase.from("artworks").update({ upscaled_at: new Date().toISOString() }).eq("id", id); };

const cols = "id, slug, title, image_id, img_width, img_height, score";
async function nextBatch(n) {
  let q = supabase.from("artworks").select(cols)
    .is("object_type", null).is("upscaled_at", null).gte("img_width", MIN).lt("img_width", MAX);
  q = ORDER === "width" ? q.order("img_width", { ascending: true }) : q.order("score", { ascending: false, nullsFirst: false });
  const { data, error } = await q.limit(n);
  if (error) throw error;
  return data || [];
}

console.log(`UPSCALE START — limit=${LIMIT} band=[${MIN},${MAX}) order=${ORDER} cap=${CAP}${DRY ? " (DRY)" : ""}`);
let done = 0, skipped = 0, failed = 0;
while (done + skipped + failed < LIMIT) {
  const remaining = LIMIT - (done + skipped + failed);
  const rows = await nextBatch(Math.min(BATCH, remaining));
  if (!rows.length) { console.log("no more low-res works in band"); break; }

  rmSync(IN, { recursive: true, force: true }); rmSync(OUT, { recursive: true, force: true });
  mkdirSync(IN, { recursive: true }); mkdirSync(OUT, { recursive: true });
  const byId = {};
  for (const r of rows) {
    const buf = await getOriginal(r.image_id);
    if (!buf) { console.log(`✗ ${r.slug} (no source)`); failed++; await stamp(r.id); continue; }
    writeFileSync(join(IN, r.id + ".jpg"), buf);
    byId[r.id] = r;
  }
  if (!Object.keys(byId).length) continue;

  const res = spawnSync(`${TOOL}/venv/bin/python`, [`${TOOL}/upscale_dir.py`, IN, OUT, String(CAP)], { stdio: "inherit" });
  if (res.status !== 0) { console.log("python upscaler failed — stopping"); break; }

  for (const id of Object.keys(byId)) {
    const row = byId[id];
    const outp = join(OUT, id + ".jpg");
    if (!existsSync(outp)) { console.log(`✗ ${row.slug} (no output)`); failed++; await stamp(id); continue; }
    try {
      const jpegBuf = await sharp(readFileSync(outp), { limitInputPixels: false })
        .rotate().resize({ width: CAP, withoutEnlargement: true }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
      const meta = await sharp(jpegBuf).metadata();
      if (meta.width <= row.img_width) { console.log(`· ${row.slug} (no gain)`); skipped++; await stamp(id); continue; }
      const sha = createHash("sha256").update(jpegBuf).digest("hex");
      const newKey = `artworks/${sha}.jpg`;
      if (!DRY) r2Put(newKey, jpegBuf, "image/jpeg");
      let stdBytes = null;
      for (const v of VARIANTS) {
        const pipe = sharp(jpegBuf, { limitInputPixels: false }).rotate().resize({ width: v.width, withoutEnlargement: true });
        const out = await (v.format === "jpeg" ? pipe.jpeg({ quality: v.quality, mozjpeg: true }) : pipe.webp({ quality: v.quality })).toBuffer();
        if (v.key === "w1400") stdBytes = out.length;
        if (!DRY) r2Put(`renditions/${v.key}/artworks/${sha}.${v.format === "jpeg" ? "jpg" : "webp"}`, out, v.format === "jpeg" ? "image/jpeg" : "image/webp");
      }
      appendFileSync(REVERT, JSON.stringify({ id: row.id, slug: row.slug, old_image_id: row.image_id, old_w: row.img_width, old_h: row.img_height, new_image_id: `${SUPABASE_PUBLIC_BASE}${newKey}`, new_w: meta.width, new_h: meta.height, ts: new Date().toISOString() }) + "\n");
      // before|after review montage (height 420) so we can build a contact sheet without re-fetching
      try {
        const H = 420, gap = 6;
        const a = await sharp(readFileSync(join(IN, id + ".jpg"))).resize({ height: H, kernel: "cubic" }).toBuffer();
        const b = await sharp(jpegBuf, { limitInputPixels: false }).resize({ height: H }).toBuffer();
        const am = await sharp(a).metadata(), bm = await sharp(b).metadata();
        await sharp({ create: { width: am.width + gap + bm.width, height: H, channels: 3, background: "#ffffff" } })
          .composite([{ input: a, left: 0, top: 0 }, { input: b, left: am.width + gap, top: 0 }])
          .jpeg({ quality: 84 }).toFile(join(REVIEWDIR, row.slug.replace(/[^a-z0-9-]/gi, "_").slice(0, 60) + ".jpg"));
      } catch {}
      if (!DRY) {
        const upd = await supabase.from("artworks").update({
          image_id: `${SUPABASE_PUBLIC_BASE}${newKey}`, img_width: meta.width, img_height: meta.height,
          orig_bytes: jpegBuf.length, std_bytes: stdBytes, upscaled_at: new Date().toISOString(),
        }).eq("id", row.id);
        if (upd.error) throw new Error(upd.error.message);
      }
      done++;
      console.log(`✓ ${row.slug}  ${row.img_width}px -> ${meta.width}px  (${done})`);
    } catch (e) { failed++; console.log(`✗ ${row.slug}: ${e.message}`); await stamp(id); }
  }
}
console.log(`\nUPSCALE DONE — upgraded=${done} skipped=${skipped} failed=${failed}`);
