// Import CC0 prints from the Cleveland Museum of Art open access API.
//
// Why Cleveland: no API key, CC0 (no attribution required), bulk-pageable, and
// the `full` derivative is the real scan — averaging 60 MB and 3100-5500px wide,
// against Internet Archive book scans which cap out near 2000px. That resolution
// gap is the whole point: at 4600px the free 1400px file is 9% of the pixels,
// so there is genuinely something to sell.
//
// Dedupe matters here. Cleveland's prints include Pissarro, Harunobu and other
// artists already in the catalogue, so anything whose title+artist we already
// hold is skipped rather than imported twice.
//
// Run: node --env-file=.env.local scripts/import-cleveland.mjs --limit=25 [--dry]
import sharp from "sharp";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / service key");
  process.exit(1);
}
const BUCKET = "art-images";
const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const UA = "FineArtFree-importer/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 25);
const SKIP = Number(args.find((a) => a.startsWith("--skip="))?.split("=")[1] ?? 0);
/** Cap the stored original: beyond this the file size stops buying visible quality. */
const MAX_EDGE = 6000;

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

/** Renditions are generated from the buffer we already hold, so importing never
 *  reads back out of storage — no egress, and nothing to backfill afterwards. */
const VARIANTS = [
  { key: "w800", width: 800, q: 75, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "w1400", width: 1400, q: 80, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "og1200", width: 1200, q: 80, fmt: "jpeg", ext: "jpg", ct: "image/jpeg" },
];

async function upload(path, body, contentType) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": contentType, "x-upsert": "true" },
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${(await res.text()).slice(0, 120)}`);
}

const summary = { imported: 0, upgraded: 0, dupes: 0, skipped: 0, bytes: 0 };

const listUrl =
  `https://openaccess-api.clevelandart.org/api/artworks/?cc0=1&has_image=1&type=Print` +
  `&limit=${LIMIT}&skip=${SKIP}&fields=id,title,creators,creation_date,technique,` +
  `description,series,department,images,url`;

console.log(`Cleveland import — limit ${LIMIT}, skip ${SKIP}${DRY ? " (DRY RUN)" : ""}\n`);
const list = await (await fetch(listUrl, { headers: { "User-Agent": UA } })).json();

for (const item of list.data ?? []) {
  const title = (item.title || "").trim();
  const artist = (item.creators?.[0]?.description || "").replace(/\s*\(.*?\)\s*$/, "").trim();
  const full = item.images?.full;
  if (!title || !full?.url) { summary.skipped++; continue; }

  try {
    // Already in the catalogue? Don't skip — compare resolution. Cleveland scans
    // are often far larger than what we hold, and upgrading the pixels in place
    // keeps the existing row: same id and slug (so favourites, downloads and
    // inbound links survive) and the 10 locales of description we already paid
    // to generate. Only the image is replaced.
    let upgradeOf = null;
    if (artist) {
      const dupe = await pgrest(
        `artworks?select=id,slug,img_width&title=eq.${encodeURIComponent(title)}` +
        `&artist_display=eq.${encodeURIComponent(artist)}&limit=1`
      );
      if (dupe?.length) {
        const have = dupe[0].img_width ?? 0;
        if ((full.width ?? 0) <= have) {
          console.log(`  = keep    ${title.slice(0, 40)} — ours ${have}px ≥ CMA ${full.width}px`);
          summary.dupes++;
          continue;
        }
        upgradeOf = dupe[0];
        console.log(`  ↑ upgrade ${title.slice(0, 40)} — ${have}px → ${full.width}px`);
      }
    }

    // An upgrade reuses the existing slug so its URL never changes.
    let slug = upgradeOf?.slug ?? makeSlug(`${title} ${artist}`);
    if (!upgradeOf) {
      const base = slug;
      let n = 1;
      while ((await pgrest(`artworks?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`)).length) {
        slug = `${base}-${n++}`;
      }
    }

    if (DRY) {
      console.log(
        `  ${upgradeOf ? "↑ would upgrade" : "+ would import "}  ${title.slice(0, 40)} — ${artist || "unknown"}  (${full.width}x${full.height})`
      );
      summary.imported++;
      continue;
    }

    const tiff = Buffer.from(
      await (await fetch(full.url, { headers: { "User-Agent": UA } })).arrayBuffer()
    );
    const base = sharp(tiff, { limitInputPixels: false }).rotate();
    const meta = await base.metadata();
    const jpeg = await sharp(tiff, { limitInputPixels: false })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    const outMeta = await sharp(jpeg).metadata();

    const objectPath = `artworks/${slug}.jpg`;
    await upload(objectPath, jpeg, "image/jpeg");

    let stdBytes = null;
    for (const v of VARIANTS) {
      const buf = await sharp(jpeg)
        .resize({ width: v.width, withoutEnlargement: true })
        [v.fmt]({ quality: v.q })
        .toBuffer();
      await upload(`renditions/${v.key}/artworks/${slug}.${v.ext}`, buf, v.ct);
      if (v.key === "w1400") stdBytes = buf.length;
    }

    const imageFields = {
      image_id: `${URL_BASE}/storage/v1/object/public/${BUCKET}/${objectPath}`,
      img_width: outMeta.width,
      img_height: outMeta.height,
      orig_bytes: jpeg.length,
      std_bytes: stdBytes,
    };

    if (upgradeOf) {
      // Pixels only. Title, artist, description and every translation stay as
      // they are — this row has already been enriched and is already indexed.
      await pgrest(`artworks?id=eq.${encodeURIComponent(upgradeOf.id)}`, {
        method: "PATCH",
        body: JSON.stringify(imageFields),
      });
      summary.upgraded++;
      summary.bytes += jpeg.length;
      console.log(
        `  ↑ ${slug.slice(0, 44).padEnd(46)} → ${outMeta.width}x${outMeta.height}  ${Math.round(jpeg.length / 1e6)}MB`
      );
      continue;
    }

    await pgrest("artworks", {
      method: "POST",
      body: JSON.stringify({
        id: slug,
        slug,
        title,
        artist_display: artist || null,
        url: item.url || null,
        // Cleveland supplies its own description — importing it means the enricher
        // (which selects `description IS NULL`) never picks these up and never
        // spends OpenAI credit writing prose for them.
        description: item.description || null,
        date_display: item.creation_date || null,
        medium_display: item.technique || null,
        museum: "Cleveland Museum of Art",
        object_type: "print",
        collection: item.series || null,
        source: "cleveland",
        score: 50,
        ...imageFields,
      }),
    });

    summary.imported++;
    summary.bytes += jpeg.length;
    console.log(
      `  ✓ ${slug.slice(0, 44).padEnd(46)} ${meta.width}x${meta.height} → ${outMeta.width}x${outMeta.height}  ${Math.round(jpeg.length / 1e6)}MB`
    );
  } catch (err) {
    console.error(`  ✗ ${title.slice(0, 44)}: ${err.message}`);
    summary.skipped++;
  }
}

console.log(
  `\nDone. imported ${summary.imported}, upgraded ${summary.upgraded}, kept ours ${summary.dupes}` +
  `, errors ${summary.skipped}, stored ${(summary.bytes / 1e6).toFixed(0)} MB`
);
