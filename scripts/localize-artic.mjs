#!/usr/bin/env node
/**
 * Localize hotlinked Art Institute of Chicago (artic.edu) images.
 *
 * ~2,100 rows have image_id pointing straight at www.artic.edu's IIIF server.
 * AIC now returns 403 to browsers (no referrer/header) — so those images show
 * BROKEN on the site. Fetched server-side WITH the required `AIC-User-Agent`
 * header they return 200, so this pass pulls each at up to 6000px, stores it in
 * our bucket, regenerates renditions, and repoints image_id at our CDN.
 *
 * Reads from AIC (external) + writes to Supabase (ingress): zero egress, zero
 * Worker requests. Keyset-paginates on id (needs the partial index
 * idx_artworks_artic) so the lookup query doesn't hit the statement timeout.
 * Resumable: localized rows leave the filter; failures are stepped over.
 *
 * Run: nohup node --env-file=.env.local scripts/localize-artic.mjs &
 */
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const AIC_HEADERS = {
  "AIC-User-Agent": "FineArtFree (pavelmazuelas@gmail.com)",
  "User-Agent": "Mozilla/5.0 FineArtFree/1.0",
};
const BUCKET = "art-images";
const TARGET_WIDTH = Number(process.env.ARTIC_TARGET_WIDTH || 6000);
const CONCURRENCY = Number(process.env.ARTIC_CONCURRENCY || 3);
const LIMIT = Number(process.env.ARTIC_LIMIT || 0);
const SUPABASE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;

const VARIANTS = [
  { key: "w800", width: 800, quality: 75, format: "webp" },
  { key: "w1400", width: 1400, quality: 80, format: "webp" },
  { key: "og1200", width: 1200, quality: 80, format: "jpeg" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gentleFetch(url) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, { headers: AIC_HEADERS });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) { await sleep(3000 * attempt); continue; }
    throw new Error(`fetch ${res.status}`);
  }
  throw new Error("fetch failed after retries");
}

/** Rewrite an AIC IIIF url to request up to TARGET_WIDTH (no upscale). */
function hiResUrl(imageId) {
  return imageId.replace(/\/full\/[^/]+\/0\/default\.jpg$/i, `/full/!${TARGET_WIDTH},${TARGET_WIDTH}/0/default.jpg`);
}

async function localizeArtic(row) {
  // Prefer the up-to-6000px IIIF variant; fall back to the stored url as-is.
  let buf;
  try {
    buf = Buffer.from(await (await gentleFetch(hiResUrl(row.image_id))).arrayBuffer());
  } catch {
    buf = Buffer.from(await (await gentleFetch(row.image_id)).arrayBuffer());
  }
  const jpegBuf = await sharp(buf, { limitInputPixels: false })
    .rotate().resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  const meta = await sharp(jpegBuf).metadata();
  if (!meta.width) throw new Error("no dims");
  const sha = createHash("sha256").update(jpegBuf).digest("hex");
  const newKey = `artworks/${sha}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(newKey, jpegBuf, { contentType: "image/jpeg", upsert: true });
  if (up.error) throw new Error(`upload ${up.error.message}`);

  let stdBytes = null;
  for (const v of VARIANTS) {
    const pipe = sharp(jpegBuf, { limitInputPixels: false }).rotate().resize({ width: v.width, withoutEnlargement: true });
    const out = await (v.format === "jpeg" ? pipe.jpeg({ quality: v.quality, mozjpeg: true }) : pipe.webp({ quality: v.quality })).toBuffer();
    if (v.key === "w1400") stdBytes = out.length;
    const ru = await supabase.storage.from(BUCKET).upload(
      `renditions/${v.key}/artworks/${sha}.${v.format === "jpeg" ? "jpg" : "webp"}`, out,
      { contentType: v.format === "jpeg" ? "image/jpeg" : "image/webp", upsert: true });
    if (ru.error) throw new Error(`rend ${v.key} ${ru.error.message}`);
  }

  const upd = await supabase.from("artworks").update({
    image_id: `${SUPABASE_PUBLIC_BASE}${newKey}`, img_width: meta.width, img_height: meta.height,
    orig_bytes: jpegBuf.length, std_bytes: stdBytes,
  }).eq("id", row.id);
  if (upd.error) throw new Error(upd.error.message);
  return { now: meta.width, mb: (jpegBuf.length / 1048576).toFixed(1) };
}

// ---------- main ----------
let done = 0, fail = 0, processed = 0;
async function processOne(row) {
  try {
    const r = await localizeArtic(row);
    done++;
    console.log(`✓ ${row.slug} -> ${r.now}px ${r.mb}MB (${done})`);
  } catch (e) {
    fail++;
    console.log(`✗ ${row.slug}: ${e.message}`);
  }
}

console.log(`ARTIC START: keyset stream, cap ${TARGET_WIDTH}px, concurrency ${CONCURRENCY}`);
let cursor = 0;
outer: for (;;) {
  const { data: rows, error } = await supabase
    .from("artworks")
    .select("id, slug, image_id")
    .like("image_id", "https://www.artic.edu/%")
    .gt("id", cursor)
    .order("id", { ascending: true })
    .limit(300);
  if (error) throw error;
  if (!rows?.length) break;
  cursor = rows[rows.length - 1].id;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processOne));
    processed += batch.length;
    if (LIMIT > 0 && processed >= LIMIT) break outer;
  }
}
console.log(`ARTIC COMPLETE done=${done} fail=${fail}`);
