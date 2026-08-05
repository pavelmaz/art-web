#!/usr/bin/env node
/**
 * Hi-res Pro download for the giant Commons masterpieces.
 *
 * Wikimedia caps its generated thumbnails at ~12MP (~3840px) for huge scans, so
 * the localize pass could only give these a 3840px "Max Size". This pass fetches
 * each FULL Commons original once and downscales it to 6000px ourselves, so Pro
 * users get a genuinely large file. The on-screen image is unaffected — it still
 * uses the small w1400 rendition regenerated here.
 *
 * The multi-hundred-MB original is NEVER stored: we downscale to 6000px first and
 * keep only that (~11MB). Reads from Commons (external), writes to Supabase
 * (ingress): zero egress, zero Worker requests. One at a time (big buffers).
 *
 * Slugs come from GIANT_SLUGS_FILE (one per line). Idempotent / resumable: a row
 * already at >= TARGET_WIDTH is skipped.
 *
 * Run: GIANT_SLUGS_FILE=... nohup node --env-file=.env.local scripts/hires-pro-giants.mjs &
 */
import { createHash } from "node:crypto";
import { readFileSync, appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const UA = "FineArtFree-hires/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const BUCKET = "art-images";
const TARGET_WIDTH = Number(process.env.HIRES_TARGET_WIDTH || 6000);
const SLUGS_FILE = process.env.GIANT_SLUGS_FILE;
const DELETION_LIST = "/private/tmp/claude-502/-Users-pavelm-Desktop-art-web-main/cfb5e529-46ad-481e-9adc-49afc177a88f/scratchpad/hires-old-keys.txt";
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

function commonsFileName(row) {
  const fromUrl = row.url && /\/File:/.test(row.url) ? row.url.split("/File:").pop() : null;
  const raw = fromUrl || row.image_id.split("/").pop().split("?")[0];
  return decodeURIComponent(raw).replace(/_/g, " ");
}

/** Full-resolution original URL + dimensions for a Commons file. */
async function commonsOriginal(fileName) {
  const p = new URLSearchParams({ action: "query", titles: `File:${fileName}`, prop: "imageinfo",
    iiprop: "url|size|mime", format: "json", origin: "*" });
  const data = await (await gentleFetch(`${COMMONS_API}?${p}`)).json();
  const ii = Object.values(data?.query?.pages ?? {})[0]?.imageinfo?.[0];
  return ii ? { url: ii.url, width: ii.width, mime: ii.mime } : null;
}

async function processGiant(slug) {
  const { data: row, error } = await supabase
    .from("artworks").select("id, slug, url, image_id, img_width").eq("slug", slug).single();
  if (error || !row) throw new Error(`row lookup: ${error?.message || "not found"}`);
  if ((row.img_width ?? 0) >= TARGET_WIDTH) return { skipped: true };

  const orig = await commonsOriginal(commonsFileName(row));
  if (!orig?.url) throw new Error("no commons original");
  if (orig.width <= (row.img_width ?? 0)) return { skipped: true }; // nothing to gain

  const res = await gentleFetch(orig.url);
  const srcBuf = Buffer.from(await res.arrayBuffer());
  // libvips shrink-on-load keeps memory sane even for 700MP JPEGs.
  const jpegBuf = await sharp(srcBuf, { limitInputPixels: false })
    .rotate()
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  const meta = await sharp(jpegBuf).metadata();
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

  // Log the superseded 3840px key for a later deletion sweep.
  const oldMatch = row.image_id?.match(/\/art-images\/(artworks\/[^?]+)/);
  if (oldMatch) {
    const base = oldMatch[1].replace(/^artworks\//, "").replace(/\.[a-z0-9]+$/i, "");
    appendFileSync(DELETION_LIST, [oldMatch[1],
      `renditions/w800/artworks/${base}.webp`, `renditions/w1400/artworks/${base}.webp`,
      `renditions/og1200/artworks/${base}.jpg`].join("\n") + "\n");
  }

  const upd = await supabase.from("artworks").update({
    image_id: `${SUPABASE_PUBLIC_BASE}${newKey}`, img_width: meta.width, img_height: meta.height,
    orig_bytes: jpegBuf.length, std_bytes: stdBytes,
  }).eq("id", row.id);
  if (upd.error) throw new Error(upd.error.message);
  return { was: row.img_width, now: meta.width, mb: (jpegBuf.length / 1048576).toFixed(1), origW: orig.width };
}

// ---------- main ----------
if (!SLUGS_FILE) { console.error("set GIANT_SLUGS_FILE"); process.exit(1); }
const slugs = readFileSync(SLUGS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const LIMIT = Number(process.env.HIRES_LIMIT || 0);
const list = LIMIT > 0 ? slugs.slice(0, LIMIT) : slugs;
console.log(`HIRES START: ${list.length} giants -> ${TARGET_WIDTH}px`);

let done = 0, skip = 0, fail = 0;
for (const slug of list) {
  try {
    const r = await processGiant(slug);
    if (r.skipped) { skip++; console.log(`· ${slug} (skip, already >= ${TARGET_WIDTH})`); }
    else { done++; console.log(`✓ ${slug}  orig ${r.origW}px -> ${r.now}px  ${r.mb}MB  (${done})`); }
  } catch (e) {
    fail++;
    console.log(`✗ ${slug}: ${e.message}`);
  }
}
console.log(`HIRES COMPLETE done=${done} skip=${skip} fail=${fail}`);
