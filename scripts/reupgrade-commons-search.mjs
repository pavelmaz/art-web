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
import { appendFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Upgraded images go to Cloudflare R2, never Supabase storage (hard rule: keep
// Supabase storage from growing — serving is R2-first via the CDN Worker). The
// image_id URL stays the Supabase-shaped path because the Worker maps that same
// key to R2; only the bytes' destination changes.
const R2 = {
  account: process.env.R2_ACCOUNT_ID,
  key: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
};
if (!R2.account || !R2.key || !R2.secret || !R2.bucket) throw new Error("Missing R2_* env");
const R2TMP = mkdtempSync(join(tmpdir(), "reup-r2-"));
function r2Put(objectKey, body, contentType) {
  const f = join(R2TMP, "up.bin");
  writeFileSync(f, body);
  execFileSync("curl", [
    "-s", "-f", "-m", "300", "--aws-sigv4", "aws:amz:auto:s3",
    "--user", `${R2.key}:${R2.secret}`, "-X", "PUT",
    "-H", `Content-Type: ${contentType}`, "--data-binary", `@${f}`,
    `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${objectKey}`,
  ]);
}
const UA = "FineArtFree-reupgrade/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const CDN = "https://cdn.fineartfree.com/";
const BUCKET = "art-images";
const MAX_WIDTH = Number(process.env.REUP_MAX_WIDTH || 6000);
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

// Last-name token used to confirm a candidate is by the same hand as our row —
// coarse, but the perceptual-hash gate is the real guard against wrong matches.
function artistSurname(name) {
  const parts = (name || "").trim().split(/\s+/);
  return parts.length ? parts[parts.length - 1].toLowerCase() : "";
}

const EUROPEANA_KEY = process.env.EUROPEANA_KEY;

/**
 * Europeana — aggregates hundreds of European institutions (Rijksmuseum, SMK,
 * national museums…). Its image links for Google-hosted providers are
 * lh3.googleusercontent.com URLs that serve the FULL original at `=s0` and any
 * width at `=s<N>`; a small `=s400` derivative feeds the hash. Europeana does
 * not report pixel dimensions, so these candidates are "deferred": we only learn
 * the real size after downloading, and the gain/aspect gate is applied then
 * (see the deferDims branch in reupgrade). Requires EUROPEANA_KEY.
 */
async function europeanaCandidates(row) {
  if (!EUROPEANA_KEY) return [];
  const surname = artistSurname(row.artist_display);
  if (!surname || !row.title) return [];
  const q = new URLSearchParams({
    wskey: EUROPEANA_KEY,
    query: `${row.artist_display} ${row.title}`,
    rows: "6", qf: "TYPE:IMAGE", media: "true", profile: "standard",
  });
  let items;
  try {
    const d = await (await gentleFetch(`https://api.europeana.eu/record/v2/search.json?${q}`)).json();
    items = d?.items ?? [];
  } catch { return []; }
  const out = [];
  for (const it of items) {
    const url = (it.edmIsShownBy || [])[0];
    if (!url || !/googleusercontent\.com/.test(url)) continue; // only the full-res-capable hosts
    // No creator filter: Europeana's dcCreator is often a URI, not a name, and
    // the search query is already artist-scoped — the perceptual-hash gate below
    // is what actually proves it's the same painting.
    const base = url.replace(/=s\d+.*$/, "").replace(/=w\d+.*$/, "");
    out.push({
      source: "europeana", deferDims: true,
      name: `Europeana ${(it.dataProvider || [])[0] || ""}`.slice(0, 60),
      hashUrl: `${base}=s400`, url: `${base}=s0`,
    });
  }
  return out;
}

async function reupgrade(row) {
  const ourW = row.img_width, ourH = row.img_height;
  if (!ourW || !ourH) return { skip: "no dims" };
  const ourAspect = ourW / ourH;

  // Pairs mode supplies the exact Commons file (search misses French/English
  // title variants); the aspect + hash gates below still decide the swap.
  const names = row.__forcedFile
    ? [row.__forcedFile]
    : await commonsSearch(`${row.artist_display || ""} ${row.title || ""}`.trim());
  // Empty Commons search is NOT a dead end — fall through to the aggregator
  // sources below, which are most valuable exactly where Commons has nothing.
  // Only forced/pairs mode (which targets one Commons file) bails here.
  if (row.__forcedFile && !names.length) return { skip: "no search hits" };

  // Commons candidates first — dimensions are known from the API, so the
  // gain/aspect gate is cheap and no image is fetched until one is hash-confirmed.
  const cands = [];
  for (const name of names.slice(0, 6)) {
    let info; try { info = await commonsInfo(name, 256); } catch { continue; }
    if (!info || !/image\/(jpeg|png|tiff)/i.test(info.mime || "")) continue;
    if (!info.width || info.width < ourW * MIN_GAIN) continue;
    const aspOff = Math.abs(info.width / info.height - ourAspect) / ourAspect;
    if (aspOff > ASPECT_TOL) continue;
    cands.push({ source: "commons", name, ...info, aspOff });
  }
  cands.sort((a, b) => b.width - a.width);

  let ourHash; try { ourHash = await dhash(ourCdnUrl(row.image_id)); } catch { return { skip: "our-hash fail" }; }
  let chosen = null;
  for (const c of cands.slice(0, 4)) {
    let ch; try { ch = await dhash(c.thumb); } catch { continue; }
    const dist = hamming(ourHash, ch);
    if (VERBOSE) console.log(`    · ${c.name}  ${c.width}x${c.height}  asp${c.aspOff.toFixed(3)}  ham${dist}`);
    if (dist <= HASH_MAX) { chosen = { ...c, dist }; break; }
  }

  // Fallback to extra aggregator sources only when Commons found nothing — these
  // don't report dimensions, so we hash a small derivative first, then download
  // the full image and apply the gain/aspect gate on its real size.
  if (!chosen && !row.__forcedFile && process.env.REUP_NO_EXTRA_SOURCES !== "1") {
    let extra = [];
    try { extra = await europeanaCandidates(row); } catch { /* source down */ }
    for (const c of extra.slice(0, 3)) {
      let ch; try { ch = await dhash(c.hashUrl); } catch { continue; }
      const dist = hamming(ourHash, ch);
      if (dist > HASH_MAX) continue;
      let buf; try { buf = Buffer.from(await (await gentleFetch(c.url)).arrayBuffer()); } catch { continue; }
      let meta; try { meta = await sharp(buf, { limitInputPixels: false }).metadata(); } catch { continue; }
      if (!meta.width || meta.width < ourW * MIN_GAIN) continue;
      const aspOff = Math.abs(meta.width / meta.height - ourAspect) / ourAspect;
      if (aspOff > ASPECT_TOL) continue;
      if (VERBOSE) console.log(`    · ${c.name}  ${meta.width}x${meta.height}  asp${aspOff.toFixed(3)}  ham${dist}`);
      chosen = { ...c, width: meta.width, height: meta.height, aspOff, dist, __buf: buf };
      break;
    }
  }
  if (!chosen) return { skip: "no hash-confirmed" };

  // Download the file and downscale to <=MAX_WIDTH. Prefer the ORIGINAL over a
  // Commons thumbnail: for very large sources the thumbnailer silently caps its
  // rendered output near 3840px, so a requested 6000px thumb comes back at 3840.
  // Pulling the original (then resizing locally) is the only way to reach the
  // real cap. REUP_FROM_ORIGINAL=1 forces it; otherwise thumbnails are fine for
  // moderate sources and far cheaper to fetch.
  // Commons giants need the thumbnail-at-cap dance (their thumbnailer caps ~3840
  // so we pull the original instead). Other sources already hand back a URL at
  // our cap, so just fetch it and let sharp enforce MAX_WIDTH.
  const fromOriginal = process.env.REUP_FROM_ORIGINAL === "1";
  let src;
  if (chosen.__buf) {
    src = chosen.__buf; // aggregator sources already downloaded the full image to verify dims
  } else {
    const useThumb = chosen.source === "commons" && !fromOriginal && chosen.width > MAX_WIDTH;
    const dlUrl = useThumb ? (await commonsInfo(chosen.name, MAX_WIDTH)).thumb : chosen.url;
    src = Buffer.from(await (await gentleFetch(dlUrl)).arrayBuffer());
  }
  const jpegBuf = await sharp(src, { limitInputPixels: false })
    .rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  const meta = await sharp(jpegBuf).metadata();
  const sha = createHash("sha256").update(jpegBuf).digest("hex");
  const newKey = `artworks/${sha}.jpg`;
  r2Put(newKey, jpegBuf, "image/jpeg");

  let stdBytes = null;
  for (const v of VARIANTS) {
    const pipe = sharp(jpegBuf, { limitInputPixels: false }).rotate().resize({ width: v.width, withoutEnlargement: true });
    const out = await (v.format === "jpeg" ? pipe.jpeg({ quality: v.quality, mozjpeg: true }) : pipe.webp({ quality: v.quality })).toBuffer();
    if (v.key === "w1400") stdBytes = out.length;
    r2Put(`renditions/${v.key}/artworks/${sha}.${v.format === "jpeg" ? "jpg" : "webp"}`, out,
      v.format === "jpeg" ? "image/jpeg" : "image/webp");
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

if (process.env.REUP_DAILY) {
  // Nightly incremental sweep. Take the most popular still-low-res works that
  // haven't been checked in COOLDOWN days, attempt an upgrade, and stamp
  // reup_checked_at either way so we walk the whole catalog once, then re-check
  // (Commons gains new scans over time). Batch size = REUP_LIMIT.
  const batchN = LIMIT > 0 ? LIMIT : 300;
  console.log(`REUP DAILY: up to ${batchN} works, img_width < ${MAX_SRC}, cap ${MAX_WIDTH}px`);
  // Worst-images-first WITHOUT a global ORDER BY img_width (that sort blew the
  // statement timeout — no index backs it). Instead walk ASCENDING SIZE BANDS:
  // each band query is id-ordered, so it rides idx_artworks_reup_sweep_id
  // (img_width < 7000 AND reup_checked_at IS NULL, by id) — pure index scan, no
  // sort, no timeout. We process the tightest non-empty band first, so every
  // sub-1000px work is upgraded before any sub-1500px one, etc. Still covers the
  // whole catalogue (each work is stamped reup_checked_at once).
  const bands = [...new Set([1000, 1500, MAX_SRC].filter((c) => c <= MAX_SRC))].sort((a, b) => a - b);
  let rows = [];
  for (const ceil of bands) {
    const { data, error } = await supabase.from("artworks").select(cols)
      .lt("img_width", ceil)
      .is("reup_checked_at", null)
      .order("id", { ascending: true })
      .limit(batchN);
    if (error) throw error;
    if (data && data.length) {
      rows = data;
      console.log(`  band <${ceil}px: ${rows.length} candidates this run`);
      break;
    }
  }
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (row) => {
      await processOne(row);
      await supabase.from("artworks").update({ reup_checked_at: new Date().toISOString() }).eq("id", row.id);
    }));
  }
} else if (process.env.REUP_PAIRS) {
  // REUP_PAIRS=<json file of [slug, "File:..."] pairs> — candidate files found by
  // an external matching pass (e.g. category-tree fuzzy titles); hash still rules.
  const { readFileSync } = await import("node:fs");
  const pairs = JSON.parse(readFileSync(process.env.REUP_PAIRS, "utf8"));
  console.log(`REUP START (pairs mode): ${pairs.length}`);
  const bySlug = new Map(pairs.map((p) => [p[0], p[2] ?? p[1]]));
  const { data } = await supabase.from("artworks").select(cols).in("slug", [...bySlug.keys()]);
  for (const row of data ?? []) {
    row.__forcedFile = String(bySlug.get(row.slug) ?? "").replace(/^File:/, "");
    await processOne(row);
  }
} else if (process.env.REUP_SLUGS) {
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
