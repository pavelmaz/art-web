// Import public-domain vintage SHEET MUSIC (title pages, covers, first-edition
// pages) from Wikimedia Commons into the prints section. Mirrors the Commons→R2
// pipeline of import-commons-r2.mjs, but tailored to sheet music:
//   • per-item composer (a set spans many composers, unlike a single-artist set)
//   • per-item MULTILINGUAL title (title + title_sp/pt/fr/ger/it/jp/ko/ru/ch)
//   • object_type "print", description "" (no AI prose — user's call), score 0.01
//     so it never dominates browse (same as the other print collections).
// Images (original + renditions) go to R2; rows keep the Supabase-shaped
// image_id URL that the CDN Worker rewrites. Slugs end "-sheet-music".
//
// Run: node --env-file=.env.local scripts/import-sheet-music.mjs --set=imports/sheet-music/vintage-sheet-music.json [--dry]
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const R2 = {
  account: process.env.R2_ACCOUNT_ID, key: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY, bucket: process.env.R2_BUCKET,
};
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
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init, headers: { ...auth, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function makeSlug(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[æ]/g, "ae").replace(/[œ]/g, "oe").replace(/[ø]/g, "o")
    .replace(/[ß]/g, "ss").replace(/[đ]/g, "d").replace(/[ł]/g, "l")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100).replace(/-+$/, "");
}

const tmp = mkdtempSync(join(tmpdir(), "sheet-"));
function r2Put(objectKey, body, contentType) {
  const f = join(tmp, "up.bin");
  writeFileSync(f, body);
  execFileSync("curl", [
    "-s", "-f", "-m", "300", "--aws-sigv4", "aws:amz:auto:s3",
    "--user", `${R2.key}:${R2.secret}`, "-X", "PUT", "-H", `Content-Type: ${contentType}`,
    "--data-binary", `@${f}`,
    `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${objectKey}`,
  ]);
}

async function commons(params) {
  const url = "https://commons.wikimedia.org/w/api.php?format=json&" + new URLSearchParams(params);
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) ?? {};
    } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 500 * 2 ** attempt)); }
  }
  throw lastErr;
}

const LOCALES = ["sp", "pt", "fr", "ger", "it", "jp", "ko", "ru", "ch"];
const set = JSON.parse(await readFile(SET_PATH, "utf8"));
console.log(`Sheet-music → R2 — "${set.collection}" (${set.items.length} items)${DRY ? " (DRY RUN)" : ""}\n`);
const summary = { imported: 0, dupes: 0, skipped: 0, bytes: 0 };

for (const item of set.items) {
  const fileTitle = item.file;
  try {
    const enTitle = item.title.en;
    const slug = makeSlug(`${enTitle}-sheet-music`);
    const dupe = await pgrest(`artworks?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (dupe?.length) { console.log(`  = exists: ${slug}`); summary.dupes++; continue; }

    const d = await commons({ action: "query", titles: fileTitle, prop: "imageinfo", iiprop: "url|size|extmetadata" });
    const page = Object.values(d.query?.pages ?? {})[0];
    const ii = page?.imageinfo?.[0];
    if (!ii?.url) { console.log(`  ✗ no imageinfo: ${fileTitle}`); summary.skipped++; continue; }
    const lic = ii.extmetadata?.LicenseShortName?.value ?? "";
    if (!OK_LICENSES.test(lic)) { console.log(`  ✗ licence "${lic}": ${fileTitle}`); summary.skipped++; continue; }

    if (DRY) { console.log(`  → would import ${slug.padEnd(46)} ${ii.width}x${ii.height} ${lic}`); summary.imported++; continue; }

    const orig = Buffer.from(await (await fetch(ii.url, { headers: { "User-Agent": UA } })).arrayBuffer());
    const jpeg = await sharp(orig, { limitInputPixels: false, failOn: "none" })
      .rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 }).toBuffer();
    const outMeta = await sharp(jpeg).metadata();

    const objectPath = `artworks/${slug}.jpg`;
    r2Put(objectPath, jpeg, "image/jpeg");
    let stdBytes = null;
    for (const v of VARIANTS) {
      const buf = await sharp(jpeg).resize({ width: v.width, withoutEnlargement: true })[v.fmt]({ quality: v.q }).toBuffer();
      r2Put(`renditions/${v.key}/artworks/${slug}.${v.ext}`, buf, v.ct);
      if (v.key === "w1400") stdBytes = buf.length;
    }

    const row = {
      id: slug, slug, title: enTitle,
      artist_display: item.artist ?? null,
      url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle)}`,
      description: "",
      medium_display: item.medium ?? set.medium_display ?? "Lithograph",
      date_display: item.date ?? null,
      museum: null,
      object_type: set.objectType ?? "print",
      collection: item.collection ?? set.collection,
      source: set.source ?? "commons",
      // per-item score orders a book's pages (cover highest) on the collection
      // page, which sorts by score DESC; all values stay in the ~0.01 print tier
      // so they never surface in the main /artworks browse.
      score: item.score ?? set.score ?? 0.01,
      tags: item.tags ?? set.tags ?? ["sheet music", "classical music"],
      image_id: `${URL_BASE}/storage/v1/object/public/art-images/${objectPath}`,
      img_width: outMeta.width, img_height: outMeta.height,
      orig_bytes: jpeg.length, std_bytes: stdBytes,
    };
    for (const l of LOCALES) if (item.title[l]) row[`title_${l}`] = item.title[l];

    await pgrest("artworks", { method: "POST", body: JSON.stringify(row) });
    summary.imported++; summary.bytes += jpeg.length;
    console.log(`  ✓ ${slug.slice(0, 46).padEnd(48)} ${ii.width}x${ii.height} → ${outMeta.width}x${outMeta.height}`);
    await new Promise((r) => setTimeout(r, 800));
  } catch (err) {
    console.error(`  ✗ ${String(fileTitle).slice(0, 60)}: ${err.message}`);
    summary.skipped++;
  }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`\ndone — imported ${summary.imported}, dupes ${summary.dupes}, skipped ${summary.skipped}, ${(summary.bytes / 1e6).toFixed(0)}MB`);
