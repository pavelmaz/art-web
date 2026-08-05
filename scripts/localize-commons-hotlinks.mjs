#!/usr/bin/env node
/**
 * Localize hotlinked Commons images. Some rows (from the Wikipedia import) have
 * image_id pointing straight at upload.wikimedia.org — the raw Commons original.
 * For giant scans (e.g. Van Gogh's Bedroom, 30000px / 264MB) the browser can't
 * load them, so the image shows BROKEN. For all of them, hotlinking Commons
 * bypasses our CDN and is fragile.
 *
 * This pass pulls each such row, fetches a <=6000px Commons THUMBNAIL (never the
 * monster original), stores it in our bucket, regenerates the standard
 * renditions, and repoints image_id at our storage — exactly like the Artvee
 * upgrade does. Reads from Commons (external) + writes to Supabase (ingress):
 * ZERO Supabase egress, ZERO cdn.fineartfree.com Worker requests.
 *
 * Giants first (img_width DESC) so the visibly-broken masterpieces heal first.
 * Resumable: rows are re-queried by image_id ILIKE upload.wikimedia.org, so
 * localized rows drop out on restart. Safe to Ctrl-C.
 *
 * Run: nohup node --env-file=.env.local scripts/localize-commons-hotlinks.mjs &
 */
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const UA = "FineArtFree-localize/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const BUCKET = "art-images";
const MAX_WIDTH = Number(process.env.LOCALIZE_MAX_WIDTH || 6000);
const CONCURRENCY = Number(process.env.LOCALIZE_CONCURRENCY || 3);
const SUPABASE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;

const VARIANTS = [
  { key: "w800", width: 800, quality: 75, format: "webp" },
  { key: "w1400", width: 1400, quality: 80, format: "webp" },
  { key: "og1200", width: 1200, quality: 80, format: "jpeg" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gentleFetch(url, extraHeaders = {}) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...extraHeaders } });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) { await sleep(3000 * attempt); continue; }
    throw new Error(`fetch ${res.status}`);
  }
  throw new Error("fetch failed after retries");
}

/** Commons filename from the row: prefer the File: page url, fall back to the
 *  upload.wikimedia.org basename. Both decode to the canonical title. */
function commonsFileName(row) {
  const fromUrl = row.url && /\/File:/.test(row.url) ? row.url.split("/File:").pop() : null;
  const raw = fromUrl || row.image_id.split("/").pop().split("?")[0];
  return decodeURIComponent(raw).replace(/_/g, " ");
}

/** Resolve a <=cap-wide JPEG download URL for a Commons file. */
async function commonsDownloadUrl(fileName, cap) {
  const p = new URLSearchParams({ action: "query", titles: `File:${fileName}`, prop: "imageinfo",
    iiprop: "url|size", format: "json", origin: "*", iiurlwidth: String(cap) });
  const data = await (await gentleFetch(`${COMMONS_API}?${p}`)).json();
  const ii = Object.values(data?.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!ii) return null;
  // If the original is bigger than cap OR isn't a jpeg, use the capped thumbnail.
  if (ii.width > cap || !/\.jpe?g$/i.test(ii.url)) return ii.thumburl || null;
  return ii.url;
}

async function localize(row) {
  const fileName = commonsFileName(row);
  const downloadUrl = await commonsDownloadUrl(fileName, MAX_WIDTH);
  if (!downloadUrl) throw new Error(`no commons file for "${fileName}"`);

  const res = await gentleFetch(downloadUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf, { limitInputPixels: false }).metadata();
  if (!meta.width) throw new Error("no dims from downloaded file");
  const jpegBuf = /\.jpe?g$/i.test(downloadUrl) ? buf
    : await sharp(buf, { limitInputPixels: false }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
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
  return { was: row.img_width, now: meta.width };
}

// ---------- main ----------
let done = 0, fail = 0, processed = 0;
const LIMIT = Number(process.env.LOCALIZE_LIMIT || 0);

async function processOne(row) {
  try {
    const r = await localize(row);
    done++;
    console.log(`✓ ${row.slug}  ${r.was ?? "?"}px -> ${r.now}px  (${done})`);
  } catch (e) {
    fail++;
    console.log(`✗ ${row.slug}: ${e.message}`);
  }
}

// Stream hotlinked rows by keyset on the indexed id (giants are already done, so
// no img_width sort — the earlier "ilike + sort over the whole table" query hit
// the Postgres statement timeout). Successful rows leave the filter; failures are
// stepped over and picked up on a later run.
console.log(`LOCALIZE START: keyset stream, cap ${MAX_WIDTH}px, concurrency ${CONCURRENCY}`);
let cursor = 0;
outer: for (;;) {
  const { data: rows, error } = await supabase
    .from("artworks")
    .select("id, slug, url, image_id, img_width")
    .like("image_id", "https://upload.wikimedia.org/%")
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
console.log(`LOCALIZE COMPLETE done=${done} fail=${fail}`);
