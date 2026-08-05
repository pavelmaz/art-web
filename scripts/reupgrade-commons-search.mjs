#!/usr/bin/env node
/**
 * Second-pass image upgrade — direct Commons SEARCH by artist + title.
 *
 * The first upgrade (upgrade-artvee-sources-full.mjs) only looked for a bigger
 * scan when the painting was linked in Wikidata with an image AND it passed a
 * strict perceptual-hash check. That was over-conservative and left famous works
 * at 800px (Caravaggio's Medusa, Supper at Emmaus, …) even though Commons has
 * high-res scans of them — a plain title search finds them instantly.
 *
 * This pass searches the Commons File namespace for "{artist} {title}", keeps
 * candidates that are (a) meaningfully bigger and (b) the SAME painting — proven
 * by matching aspect ratio (from dimensions, free) AND a perceptual hash vs our
 * current image — then upgrades to the largest confirmed match (<=6000px),
 * regenerating renditions and logging the old keys for the deletion sweep.
 *
 * Reads Commons + our CDN (for the hash), writes Supabase. Modes:
 *   REUP_SLUGS="a,b,c"   process specific slugs (proof / testing)
 *   (default)            keyset over img_width < REUP_MAX_SRC (needs a partial
 *                        index on (id) where img_width < N)
 *
 * Run: nohup node --env-file=.env.local scripts/reupgrade-commons-search.mjs &
 */
import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const UA = "FineArtFree-reupgrade/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const CDN = "https://cdn.fineartfree.com/";
const BUCKET = "art-images";
const MAX_WIDTH = 6000;
const MIN_GAIN = Number(process.env.REUP_MIN_GAIN || 1.3);   // must be >=1.3x wider
const ASPECT_TOL = Number(process.env.REUP_ASPECT_TOL || 0.06); // aspect within 6%
const HASH_MAX = Number(process.env.REUP_HASH_MAX || 14);    // Hamming <=14 (of 64)
const MAX_SRC = Number(process.env.REUP_MAX_SRC || 1400);
const CONCURRENCY = Number(process.env.REUP_CONCURRENCY || 2);
const LIMIT = Number(process.env.REUP_LIMIT || 0);
const VERBOSE = process.env.REUP_VERBOSE === "1";
const SUPABASE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;
const DELETION_LIST = "/private/tmp/claude-502/-Users-pavelm-Desktop-art-web-main/cfb5e529-46ad-481e-9adc-49afc177a88f/scratchpad/reupgrade-old-keys.txt";

const VARIANTS = [
  { key: "w800", width: 800, quality: 75, format: "webp" },
  { key: "w1400", width: 1400, quality: 80, format: "webp" },
  { key: "og1200", width: 1200, quality: 80, format: "jpeg" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gentleFetch(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    let res;
    try {
      // Per-request timeout so a stalled Wikimedia connection can't hang the whole run.
      res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
    } catch (e) {
      if (attempt === 5) throw new Error(`fetch net ${e.name || e.message}`);
      await sleep(2000 * attempt); continue;
    }
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) { await sleep(3000 * attempt); continue; }
    throw new Error(`fetch ${res.status}`); // 4xx (e.g. 404) is permanent — don't retry
  }
  throw new Error("fetch retries");
}

async function dhash(url) {
  const buf = Buffer.from(await (await gentleFetch(url)).arrayBuffer());
  const raw = await sharp(buf, { limitInputPixels: false }).grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += raw[y * 9 + x] > raw[y * 9 + x + 1] ? "1" : "0";
  return bits;
}
const hamming = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };

async function commonsSearch(query) {
  const p = new URLSearchParams({ action: "query", list: "search", srsearch: query,
    srnamespace: "6", srlimit: "8", format: "json", origin: "*" });
  const d = await (await gentleFetch(`${COMMONS_API}?${p}`)).json();
  return (d?.query?.search ?? []).map((s) => s.title.replace(/^File:/, ""));
}

async function commonsInfo(fileName, thumbWidth) {
  const p = new URLSearchParams({ action: "query", titles: `File:${fileName}`, prop: "imageinfo",
    iiprop: "url|size|mime", format: "json", origin: "*", iiurlwidth: String(thumbWidth) });
  const d = await (await gentleFetch(`${COMMONS_API}?${p}`)).json();
  const ii = Object.values(d?.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!ii) return null;
  return { width: ii.width, height: ii.height, mime: ii.mime, url: ii.url, thumb: ii.thumburl };
}

function ourCdnUrl(imageId) {
  return imageId.replace(/^https:\/\/[a-z0-9-]+\.supabase\.co\//i, CDN).split("?")[0];
}

async function reupgrade(row) {
  const ourW = row.img_width, ourH = row.img_height;
  if (!ourW || !ourH) return { skip: "no dims" };
  const ourAspect = ourW / ourH;

  const names = await commonsSearch(`${row.artist_display || ""} ${row.title || ""}`.trim());
  if (!names.length) return { skip: "no search hits" };

  // Gather candidate sizes, keep bigger + aspect-matched ones.
  const cands = [];
  for (const name of names.slice(0, 6)) {
    let info; try { info = await commonsInfo(name, 256); } catch { continue; }
    if (!info || !/image\/(jpeg|png|tiff)/i.test(info.mime || "")) continue;
    if (info.width < ourW * MIN_GAIN) continue;
    const aspOff = Math.abs(info.width / info.height - ourAspect) / ourAspect;
    if (aspOff > ASPECT_TOL) continue;
    cands.push({ name, ...info, aspOff });
  }
  if (!cands.length) return { skip: "no bigger aspect-match" };
  cands.sort((a, b) => b.width - a.width);

  // Confirm same painting via perceptual hash vs our current image.
  let ourHash; try { ourHash = await dhash(ourCdnUrl(row.image_id)); } catch { return { skip: "our-hash fail" }; }
  let chosen = null;
  for (const c of cands.slice(0, 4)) {
    let ch; try { ch = await dhash(c.thumb); } catch { continue; }
    const dist = hamming(ourHash, ch);
    if (VERBOSE) console.log(`    · ${c.name}  ${c.width}x${c.height}  asp${c.aspOff.toFixed(3)}  ham${dist}`);
    if (dist <= HASH_MAX) { chosen = { ...c, dist }; break; }
  }
  if (!chosen) return { skip: "no hash-confirmed" };

  // Download the chosen file at <=MAX_WIDTH, store, renditions, update.
  const dlInfo = chosen.width > MAX_WIDTH ? await commonsInfo(chosen.name, MAX_WIDTH) : chosen;
  const dlUrl = chosen.width > MAX_WIDTH ? dlInfo.thumb : chosen.url;
  const src = Buffer.from(await (await gentleFetch(dlUrl)).arrayBuffer());
  const jpegBuf = await sharp(src, { limitInputPixels: false })
    .rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
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
  return { was: ourW, now: meta.width, file: chosen.name, ham: chosen.dist };
}

// ---------- main ----------
let up = 0, skip = 0, fail = 0, processed = 0;
async function processOne(row) {
  try {
    const r = await reupgrade(row);
    if (r.skip) { skip++; if (VERBOSE) console.log(`· ${row.slug} (skip: ${r.skip})`); }
    else { up++; console.log(`✓ ${row.slug}  ${r.was}px -> ${r.now}px  ham${r.ham}  [${r.file}]  (${up})`); }
  } catch (e) { fail++; console.log(`✗ ${row.slug}: ${e.message}`); }
}

const cols = "id, slug, title, artist_display, image_id, img_width, img_height, score";

async function runBatch(rows) {
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processOne));
    processed += batch.length;
    if (LIMIT > 0 && processed >= LIMIT) return true;
  }
  return false;
}

if (process.env.REUP_SLUGS) {
  const slugs = process.env.REUP_SLUGS.split(",").map((s) => s.trim()).filter(Boolean);
  console.log(`REUP START (slugs mode): ${slugs.length}`);
  const { data } = await supabase.from("artworks").select(cols).in("slug", slugs);
  for (const row of data ?? []) await processOne(row);
} else {
  console.log(`REUP START: popular-first (score bands), img_width < ${MAX_SRC}, gain>=${MIN_GAIN}, hash<=${HASH_MAX}, conc ${CONCURRENCY}`);
  // Only ~61 discrete score values (one has 15k rows), so a plain keyset skips or
  // times out. Enumerate the distinct scores high->low, then id-keyset WITHIN each
  // band (equality on score + id range — the partial index serves this fast).
  // Retry queries on transient errors (esp. Postgres 57014 statement timeout via
  // PostgREST) instead of crashing the whole pass.
  const selectRetry = async (build, tries = 8) => {
    for (let i = 1; i <= tries; i++) {
      const { data, error } = await build();
      if (!error) return data;
      if (i === tries) throw error;
      console.log(`  (query retry ${i}: ${error.code || error.message})`);
      await sleep(2000 * i);
    }
  };
  const scores = [];
  for (let cur = null; ; ) {
    const data = await selectRetry(() => {
      let q = supabase.from("artworks").select("score").lt("img_width", MAX_SRC).not("score", "is", null)
        .order("score", { ascending: false }).limit(1);
      if (cur !== null) q = q.lt("score", cur);
      return q;
    });
    if (!data?.length) break;
    cur = data[0].score; scores.push(cur);
  }
  console.log(`  ${scores.length} score bands`);

  let stop = false;
  const idKeyset = async (applyBand) => {
    for (let cursor = 0; !stop; ) {
      const rows = await selectRetry(() => applyBand(
        supabase.from("artworks").select(cols).lt("img_width", MAX_SRC)
          .gt("id", cursor).order("id", { ascending: true }).limit(200)));
      if (!rows?.length) break;
      cursor = rows[rows.length - 1].id;
      stop = await runBatch(rows);
    }
  };
  for (const S of scores) { if (stop) break; await idKeyset((q) => q.eq("score", S)); }
  if (!stop) await idKeyset((q) => q.is("score", null)); // score-less tail
}
console.log(`REUP COMPLETE upgraded=${up} skip=${skip} fail=${fail}`);
