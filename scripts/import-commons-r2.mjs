// Import public-domain plates from Wikimedia Commons with originals stored on
// Cloudflare R2 — NOT Supabase storage. Purpose-built for the Artvee-parity
// wall-chart/book-illustration sets (imports/artvee/*), where the source of
// record is Commons (Wellcome/Rijksmuseum/etc. mass uploads at master
// resolution) and the user's standing rule is that new bulk media lives on R2.
//
// Serving needs no new plumbing: rows keep the standard Supabase-shaped
// image_id URL, the app rewrites it to cdn.fineartfree.com, and the Worker is
// R2-first — with the original and renditions PUT at `artworks/<slug>.jpg` /
// `renditions/<v>/artworks/<slug>.<ext>`, the Supabase fallback never fires.
//
// R2 uploads shell out to `curl --aws-sigv4` (no SDK dependency in the repo).
//
// Run: node --env-file=.env.local scripts/import-commons-r2.mjs --set=imports/artvee/sets/astronomical-diagrams.json [--dry]
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const R2 = {
  account: process.env.R2_ACCOUNT_ID,
  key: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
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

// Licences that permit commercial redistribution with no strings on reuse.
// NC/ND can never enter a catalogue that sells Pro downloads — and BY-SA is
// excluded too: ShareAlike binds derivatives, which contradicts the site-wide
// "free for any purpose, no restrictions" promise buyers rely on.
const OK_LICENSES = /^(cc0|cc[ -]by[ -]?\d|public domain|pdm)/i;

async function pgrest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...auth, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function makeSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[æ]/g, "ae").replace(/[œ]/g, "oe").replace(/[ø]/g, "o")
    .replace(/[ß]/g, "ss").replace(/[đ]/g, "d").replace(/[ł]/g, "l")
    .replace(/[þ]/g, "th").replace(/[ð]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/, "");
}

const tmp = mkdtempSync(join(tmpdir(), "r2up-"));
function r2Put(objectKey, body, contentType) {
  const f = join(tmp, "up.bin");
  writeFileSync(f, body);
  execFileSync("curl", [
    "-s", "-f", "-m", "300",
    "--aws-sigv4", "aws:amz:auto:s3",
    "--user", `${R2.key}:${R2.secret}`,
    "-X", "PUT", "-H", `Content-Type: ${contentType}`,
    "--data-binary", `@${f}`,
    `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${objectKey}`,
  ]);
}

async function commons(params) {
  const url =
    "https://commons.wikimedia.org/w/api.php?format=json&" +
    new URLSearchParams(params).toString();
  return (await (await fetch(url, { headers: { "User-Agent": UA } })).json()) ?? {};
}

/** "Astronomy; a diagram of X. Coloured engraving Wellcome V0025016.jpg" → clean title.
 *  Also strips Rijksmuseum filename furniture: "(titel op object)", "(serietitel)",
 *  and the trailing ", RP-P-OB-202.822" object number. */
function cleanTitle(fileTitle, titleStrip = []) {
  let t = fileTitle
    .replace(/^File:/, "")
    .replace(/\.[a-z]{3,4}$/i, "")
    .replace(/\s*Wellcome [VLM]\d+(?:[A-Z]+)?\s*$/i, "")
    .replace(/\s*\((titel op object|serietitel|objecttitel)\)\s*/gi, " ")
    .replace(/\s*Nieuwe (Nederlandsche|Hollandsche) kinderprenten\s*/gi, " ")
    .replace(/,?\s*RP-P-[A-Z0-9.-]+\s*$/i, "")
    .replace(/\s*\(cropped\)\s*$/i, "");
  for (const phrase of titleStrip) {
    t = t.split(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).join(" ");
  }
  t = t.replace(/\s+/g, " ").trim().replace(/[.;,\s]+$/, "");
  // Rijksmuseum filenames often state the object title twice ("display title" +
  // "titel op object"). If the opening phrase recurs later, cut at the repeat.
  const norm = t.toLowerCase();
  const head = norm.slice(0, 18);
  if (head.length === 18) {
    const again = norm.indexOf(head, 18);
    if (again > 0) t = t.slice(0, again).trim().replace(/[.;,\s]+$/, "");
  }
  return t;
}

/** Stable per-file disambiguator: the Rijksmuseum object number when present
 *  (series prints repeat titles — three different "Huisdieren" sheets), else
 *  nothing. Slugs must differ or the dupe check silently drops real works. */
function fileIdToken(fileTitle) {
  const rp = fileTitle.replace(/\.[a-z]{3,4}$/i, "").match(/RP-P-[A-Z0-9.-]+/i);
  return rp ? rp[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") : "";
}

const set = JSON.parse(
  await (await import("node:fs/promises")).readFile(SET_PATH, "utf8")
);
console.log(
  `Commons→R2 import — "${set.collection}" (${set.files.length} files)${DRY ? " (DRY RUN)" : ""}\n`
);

const summary = { imported: 0, dupes: 0, skipped: 0, bytes: 0 };

for (const fileTitle of set.files) {
  try {
    const d = await commons({
      action: "query",
      titles: fileTitle,
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
    });
    const page = Object.values(d.query?.pages ?? {})[0];
    const ii = page?.imageinfo?.[0];
    if (!ii?.url) { console.log(`  ✗ no imageinfo: ${fileTitle}`); summary.skipped++; continue; }

    const lic = ii.extmetadata?.LicenseShortName?.value ?? "";
    if (!OK_LICENSES.test(lic)) {
      console.log(`  ✗ licence "${lic}" not commercial-safe: ${fileTitle}`);
      summary.skipped++;
      continue;
    }

    // Commons filenames from the 2014 Wellcome batch are truncated mid-word;
    // ImageDescription's first sentence carries the untruncated catalogue title
    // ("Astronomy: a diagram of X. Coloured engraving by J. Emslie, 1851…" —
    // the medium/date tail is dropped; it already lives in its own columns).
    const desc = (ii.extmetadata?.ImageDescription?.value ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const fromDesc = desc
      .split(/\.\s+(?=Coloured?\b|Engraving\b|Colour lithograph\b|Lithograph\b|Chromolithograph\b)/i)[0]
      .split(/\s{2,}|Iconographic Collections/i)[0]
      .replace(/[.;,\s]+$/, "")
      .trim();
    const title =
      set.titleOverrides?.[fileTitle] ??
      (set.titleFromFilename
        ? cleanTitle(fileTitle, set.titleStrip ?? [])
        : fromDesc.length > 20 && fromDesc.length < 200
          ? fromDesc
          : cleanTitle(fileTitle, set.titleStrip ?? []));
    const idToken = set.slugFromFileId ? fileIdToken(fileTitle) : "";
    const slug = makeSlug(`${title}-${set.slugSuffix ?? set.artist}${idToken ? `-${idToken}` : ""}`);

    const dupe = await pgrest(`artworks?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (dupe?.length) { console.log(`  = exists: ${slug}`); summary.dupes++; continue; }

    if (DRY) { console.log(`  → would import ${slug}  (${ii.width}x${ii.height}, ${lic})`); continue; }

    const orig = Buffer.from(
      await (await fetch(ii.url, { headers: { "User-Agent": UA } })).arrayBuffer()
    );
    // failOn:"none": Rijksmuseum TIFFs carry harmless metadata warnings that
    // sharp otherwise promotes to fatal errors ("Warning treated as error").
    const jpeg = await sharp(orig, { limitInputPixels: false, failOn: "none" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    const outMeta = await sharp(jpeg).metadata();

    const objectPath = `artworks/${slug}.jpg`;
    r2Put(objectPath, jpeg, "image/jpeg");

    let stdBytes = null;
    for (const v of VARIANTS) {
      const buf = await sharp(jpeg)
        .resize({ width: v.width, withoutEnlargement: true })
        [v.fmt]({ quality: v.q })
        .toBuffer();
      r2Put(`renditions/${v.key}/artworks/${slug}.${v.ext}`, buf, v.ct);
      if (v.key === "w1400") stdBytes = buf.length;
    }

    await pgrest("artworks", {
      method: "POST",
      body: JSON.stringify({
        id: slug,
        slug,
        title,
        artist_display: set.artist || null,
        url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle)}`,
        // Empty string, deliberately not null: the enricher queues on
        // `description IS NULL`, and the user's call is that prints get no
        // AI-written prose — they're plates, not history. '' keeps them out
        // of the queue and renders as "no description" on the page.
        description: "",
        date_display: set.date_display ?? null,
        medium_display: set.medium_display ?? null,
        museum: set.museum ?? null,
        // "print" | "wall-chart" | "book-illustration" — decides which hub the
        // collection appears under. Wall-chart sets and book sets must declare it.
        object_type: set.objectType ?? "print",
        collection: set.collection,
        source: set.source ?? "commons",
        score: 50,
        image_id: `${URL_BASE}/storage/v1/object/public/art-images/${objectPath}`,
        img_width: outMeta.width,
        img_height: outMeta.height,
        orig_bytes: jpeg.length,
        std_bytes: stdBytes,
      }),
    });

    summary.imported++;
    summary.bytes += jpeg.length;
    console.log(
      `  ✓ ${slug.slice(0, 50).padEnd(52)} ${ii.width}x${ii.height} → ${outMeta.width}x${outMeta.height}  ${(jpeg.length / 1e6).toFixed(1)}MB`
    );
    await new Promise((r) => setTimeout(r, 800));
  } catch (err) {
    console.error(`  ✗ ${fileTitle.slice(0, 60)}: ${err.message}`);
    summary.skipped++;
  }
}

rmSync(tmp, { recursive: true, force: true });
console.log(`\ndone — imported ${summary.imported}, dupes ${summary.dupes}, skipped ${summary.skipped}, ${(summary.bytes / 1e6).toFixed(0)}MB to R2`);
