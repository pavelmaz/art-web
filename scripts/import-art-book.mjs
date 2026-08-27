// Import a PD illustrated BOOK as a book-illustration collection: ordered plates,
// each its own row, cover-first, demoted score (like the sheet-music books).
// Source is Commons file titles ("source":"commons") OR direct image URLs
// ("source":"url", e.g. archive.org IIIF) that we've already vetted as PD.
//
// set JSON: { collection, artist, objectType, medium, slugSuffix, workTitle,
//             source, tags?, images:[ "File:…" | "https://…" ] }
//
// Run: node --env-file=.env.local scripts/import-art-book.mjs --set=imports/books/<x>.json [--dry]
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const R2 = { account: process.env.R2_ACCOUNT_ID, key: process.env.R2_ACCESS_KEY_ID, secret: process.env.R2_SECRET_ACCESS_KEY, bucket: process.env.R2_BUCKET };
if (!URL_BASE || !KEY) throw new Error("Missing Supabase env");
if (!R2.account || !R2.key || !R2.secret || !R2.bucket) throw new Error("Missing R2_* env");

const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const UA = "FineArtFree-importer/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
const MAX_EDGE = 6000;
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const SET_PATH = args.find((a) => a.startsWith("--set="))?.split("=")[1];
if (!SET_PATH) throw new Error("--set=<json> required");

const VARIANTS = [
  { key: "w800", width: 800, q: 75, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "w1400", width: 1400, q: 80, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "og1200", width: 1200, q: 80, fmt: "jpeg", ext: "jpg", ct: "image/jpeg" },
];
const OK_LICENSES = /^(cc0|cc[ -]by[ -]?\d|public domain|pdm|no( known copyright)? restrictions)/i;

async function pgrest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...auth, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`PostgREST ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
function makeSlug(t) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100).replace(/-+$/, "");
}
const tmp = mkdtempSync(join(tmpdir(), "artbook-"));
function r2Put(objectKey, body, contentType) {
  const f = join(tmp, "up.bin");
  writeFileSync(f, body);
  execFileSync("curl", ["-s", "-f", "-m", "300", "--aws-sigv4", "aws:amz:auto:s3", "--user", `${R2.key}:${R2.secret}`, "-X", "PUT", "-H", `Content-Type: ${contentType}`, "--data-binary", `@${f}`, `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${objectKey}`]);
}
async function commons(params) {
  const url = "https://commons.wikimedia.org/w/api.php?format=json&" + new URLSearchParams(params);
  let lastErr;
  for (let a = 0; a < 5; a++) { try { const r = await fetch(url, { headers: { "User-Agent": UA } }); if (r.status === 429 || r.status >= 500) throw new Error("HTTP " + r.status); return (await r.json()) ?? {}; } catch (e) { lastErr = e; await new Promise((z) => setTimeout(z, 500 * 2 ** a)); } }
  throw lastErr;
}
/** Resolve one image entry to {url, license, sourcePage}. */
async function resolve(entry, source) {
  if (source === "url") return { url: entry, lic: "public domain", page: entry };
  const d = await commons({ action: "query", titles: entry, prop: "imageinfo", iiprop: "url|size|extmetadata" });
  const p = Object.values(d.query?.pages ?? {})[0];
  const ii = p?.imageinfo?.[0];
  if (!ii?.url) return null;
  return { url: ii.url, lic: ii.extmetadata?.LicenseShortName?.value ?? "", page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(entry)}` };
}

const set = JSON.parse(await readFile(SET_PATH, "utf8"));
console.log(`Art-book → R2 — "${set.collection}" (${set.images.length} plates)${DRY ? " (DRY RUN)" : ""}\n`);
const summary = { imported: 0, dupes: 0, skipped: 0 };

for (let i = 0; i < set.images.length; i++) {
  const entry = set.images[i];
  const n = i + 1;
  const title = n === 1 ? set.workTitle : `${set.workTitle} (Plate ${n})`;
  const slug = makeSlug(`${set.slugSuffix}-${String(n).padStart(2, "0")}`);
  try {
    const dupe = await pgrest(`artworks?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (dupe?.length) { console.log(`  = exists: ${slug}`); summary.dupes++; continue; }
    const r = await resolve(entry, set.source ?? "commons");
    if (!r?.url) { console.log(`  ✗ unresolved: ${String(entry).slice(0, 50)}`); summary.skipped++; continue; }
    if ((set.source ?? "commons") === "commons" && !OK_LICENSES.test(r.lic)) { console.log(`  ✗ licence "${r.lic}": ${entry}`); summary.skipped++; continue; }
    if (DRY) { console.log(`  → would import ${slug.padEnd(30)} ${r.lic}`); summary.imported++; continue; }

    const orig = Buffer.from(await (await fetch(r.url, { headers: { "User-Agent": UA } })).arrayBuffer());
    const jpeg = await sharp(orig, { limitInputPixels: false, failOn: "none" }).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    const outMeta = await sharp(jpeg).metadata();
    const objectPath = `artworks/${slug}.jpg`;
    r2Put(objectPath, jpeg, "image/jpeg");
    let stdBytes = null;
    for (const v of VARIANTS) { const buf = await sharp(jpeg).resize({ width: v.width, withoutEnlargement: true })[v.fmt]({ quality: v.q }).toBuffer(); r2Put(`renditions/${v.key}/artworks/${slug}.${v.ext}`, buf, v.ct); if (v.key === "w1400") stdBytes = buf.length; }

    await pgrest("artworks", {
      method: "POST",
      body: JSON.stringify({
        id: slug, slug, title,
        artist_display: set.artist ?? null,
        url: r.page, description: "",
        medium_display: set.medium ?? "Engraving",
        date_display: set.date ?? null,
        museum: set.museum ?? null,
        object_type: set.objectType ?? "book-illustration",
        collection: set.collection,
        source: set.sourceTag ?? "commons",
        score: Number((0.02 - n * 0.0001).toFixed(4)),
        tags: set.tags ?? null,
        image_id: `${URL_BASE}/storage/v1/object/public/art-images/${objectPath}`,
        img_width: outMeta.width, img_height: outMeta.height, orig_bytes: jpeg.length, std_bytes: stdBytes,
      }),
    });
    summary.imported++;
    console.log(`  ✓ ${slug.padEnd(30)} ${outMeta.width}x${outMeta.height}`);
    await new Promise((z) => setTimeout(z, 700));
  } catch (err) { console.error(`  ✗ ${slug}: ${err.message}`); summary.skipped++; }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`\ndone — imported ${summary.imported}, dupes ${summary.dupes}, skipped ${summary.skipped}`);
