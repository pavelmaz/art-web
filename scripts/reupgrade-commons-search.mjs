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
 *   REUP_ARTIST_WALK=1   walk the artists table A→Z (cursor file, resumable —
 *                        19 Sep 2026), fully resolving each artist's low-res
 *                        backlog before moving to the next. REUP_AFTER=Name
 *                        overrides the saved cursor; REUP_MAX_ARTISTS caps how
 *                        many artists one run scans (default 150).
 *   REUP_DAILY=1         nightly incremental sweep, smallest-images-first by
 *                        size band, reup_checked_at-stamped so dead ends aren't
 *                        retried forever
 *   REUP_SLUGS="a,b,c"   process specific slugs (proof / testing)
 *   REUP_PAIRS=path.json process [slug, "File:..."] pairs from an external match
 *   (default)            popularity-first (score bands), keyset over
 *                        img_width < REUP_MAX_SRC
 *
 * Run: nohup node --env-file=.env.local scripts/reupgrade-commons-search.mjs &
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
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
// No cap (26 Sep 2026, Pavel: "dont cap any image, if come is super high res is
// fine"): 40000 is effectively unlimited, so full originals are kept whole and the
// Commons giant path always pulls the original instead of the 3840px thumbnail.
const MAX_WIDTH = Number(process.env.REUP_MAX_WIDTH || 40000);
const MIN_GAIN = Number(process.env.REUP_MIN_GAIN || 1.3);   // must be >=1.3x wider
const ASPECT_TOL = Number(process.env.REUP_ASPECT_TOL || 0.06); // aspect within 6%
// 26 Sep 2026 (matcher v2): a candidate up to ASPECT_TOL_STRONG off in aspect is
// still accepted when the hash agrees very strongly (<= HASH_STRONG) — slightly
// different crops of the same scan. Framed/wrong photos fail the hash by far more.
const ASPECT_TOL_STRONG = Number(process.env.REUP_ASPECT_TOL_STRONG || 0.10);
const HASH_STRONG = Number(process.env.REUP_HASH_STRONG || 10);
const SEARCH_LIMIT = Number(process.env.REUP_SEARCH_LIMIT || 30);   // was 8: hid big scans
const CANDIDATES = Number(process.env.REUP_CANDIDATES || 20);       // was 6
const HASH_TRIES = Number(process.env.REUP_HASH_TRIES || 6);        // was 4
// Hamming distance ceiling (of 64) for the perceptual-hash same-painting check.
// Was 14 — too strict: it rejected valid bigger scans of the SAME work (a Klee
// whose 2427px Guggenheim scan matched on identical aspect ratio scored 17 and
// was thrown out). 18 catches those; the title-search + aspect(<=6%) + gain(>=1.3x)
// gates still guard against swapping in a different painting.
const HASH_MAX = Number(process.env.REUP_HASH_MAX || 18);
const MAX_SRC = Number(process.env.REUP_MAX_SRC || 1400);
const CONCURRENCY = Number(process.env.REUP_CONCURRENCY || 2);
const LIMIT = Number(process.env.REUP_LIMIT || 0);
const VERBOSE = process.env.REUP_VERBOSE === "1";
const SUPABASE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;
const DELETION_LIST = process.env.REUP_DELETION_LIST || join(tmpdir(), "reupgrade-old-keys.txt");

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
    srnamespace: "6", srlimit: String(SEARCH_LIMIT), format: "json", origin: "*" });
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

// Sizes + thumbs for up to 50 files in ONE API call (the per-file lookup made
// 20 candidates cost 20 requests). Missing files are simply absent from the map.
async function commonsInfoBatch(fileNames, thumbWidth) {
  const out = new Map();
  for (let i = 0; i < fileNames.length; i += 50) {
    const chunk = fileNames.slice(i, i + 50);
    const p = new URLSearchParams({ action: "query", titles: chunk.map((n) => `File:${n}`).join("|"),
      prop: "imageinfo", iiprop: "url|size|mime", format: "json", origin: "*", iiurlwidth: String(thumbWidth) });
    const d = await (await gentleFetch(`${COMMONS_API}?${p}`)).json();
    for (const pg of Object.values(d?.query?.pages ?? {})) {
      const ii = pg?.imageinfo?.[0];
      if (ii && pg.title) out.set(pg.title.replace(/^File:/, ""), { width: ii.width, height: ii.height, mime: ii.mime, url: ii.url, thumb: ii.thumburl });
    }
  }
  return out;
}
// "A Lady Writing a Letter" -> "Lady Writing a Letter"; drops a trailing "(…)" too.
function coreTitle(title) {
  return (title || "").replace(/\s*\([^)]*\)\s*$/, "").replace(/^(a|an|the|la|le|les|el|los|las|der|die|das|il|lo|gli|une|un|una|uno)\s+/i, "").trim();
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

/**
 * Van Gogh Museum's own collection — discovered live 20 Sep 2026 while
 * investigating why the artist walk's Van Gogh hit rate was so low: their
 * frontend (vangoghmuseum.nl/en/collection) is backed by a real, undocumented
 * but CORS-open, no-auth-required search endpoint and an IIIF Image API 3.0
 * server on iiif.micr.io. This is the single richest source for exactly this
 * artist — verified real (org confirmed "Van Gogh Museum" in info.json, native
 * resolutions in the thousands of px, e.g. Sunflowers at 6133x8061). NOT an
 * officially documented third-party API (no /developers page found) — same
 * caution as any scraped endpoint: gentleFetch throttling, VGM-only, small
 * request volume. Unlike Europeana, IIIF's info.json gives real dimensions
 * upfront, so this behaves like a Commons candidate (dims-gated before any
 * image download), not a deferred-dims aggregator.
 */
async function vanGoghMuseumCandidates(row) {
  if (!/van gogh/i.test(row.artist_display || "")) return [];
  if (!row.title) return [];
  const q = new URLSearchParams({ q: row.title, from: "0" });
  let html;
  try {
    html = await (await gentleFetch(`https://www.vangoghmuseum.nl/en/collection/search?${q}`)).text();
  } catch { return []; }
  const ids = [...new Set([...html.matchAll(/iiif\.micr\.io\/([A-Za-z0-9]+)\/full\//g)].map((m) => m[1]))];
  const out = [];
  for (const id of ids.slice(0, 5)) {
    let info;
    try { info = await (await gentleFetch(`https://iiif.micr.io/${id}/info.json`)).json(); } catch { continue; }
    if (!info?.width || !info?.height) continue;
    out.push({
      source: "vgm", name: `VGM ${id}`, width: info.width, height: info.height,
      thumb: `https://iiif.micr.io/${id}/full/400,/0/default.jpg`,
      url: `https://iiif.micr.io/${id}/full/max/0/default.jpg`,
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
  // Second query when the first finds nothing big enough: surname + title core
  // ("Vermeer Lady Writing a Letter"), which surfaces museum/GAP scans the full
  // query buries under same-named works.
  const gate = (info) => {
    if (!info || !/image\/(jpeg|png|tiff)/i.test(info.mime || "")) return "mime";
    if (!info.width || info.width < ourW * MIN_GAIN) return "small";
    const aspOff = Math.abs(info.width / info.height - ourAspect) / ourAspect;
    if (aspOff > ASPECT_TOL_STRONG) return "aspect";
    return aspOff;
  };
  const consider = async (list) => {
    const infos = await commonsInfoBatch(list.slice(0, CANDIDATES), 256);
    for (const name of list.slice(0, CANDIDATES)) {
      const info = infos.get(name); const g = gate(info);
      if (typeof g === "string") { if (VERBOSE) console.log(`    - ${name}  ${info?.width ?? "?"}x${info?.height ?? "?"}  dropped: ${g}`); continue; }
      if (!cands.some((c) => c.name === name)) cands.push({ source: "commons", name, ...info, aspOff: g });
    }
  };
  await consider(names);
  if (!cands.length && !row.__forcedFile && row.artist_display && row.title) {
    const alt = `${artistSurname(row.artist_display)} ${coreTitle(row.title)}`.trim();
    if (alt.toLowerCase() !== `${row.artist_display} ${row.title}`.toLowerCase()) {
      if (VERBOSE) console.log(`    ? retry search: "${alt}"`);
      await consider(await commonsSearch(alt));
    }
  }
  if (!row.__forcedFile) {
    let vgm = []; try { vgm = await vanGoghMuseumCandidates(row); } catch { /* source down */ }
    for (const c of vgm) {
      if (c.width < ourW * MIN_GAIN) continue;
      const aspOff = Math.abs(c.width / c.height - ourAspect) / ourAspect;
      if (aspOff > ASPECT_TOL) continue;
      cands.push({ ...c, aspOff });
    }
  }
  cands.sort((a, b) => b.width - a.width);

  let ourHash; try { ourHash = await dhash(ourCdnUrl(row.image_id)); } catch { return { skip: "our-hash fail" }; }
  let chosen = null;
  for (const c of cands.slice(0, HASH_TRIES)) {
    let ch; try { ch = await dhash(c.thumb); } catch { continue; }
    const dist = hamming(ourHash, ch);
    if (VERBOSE) console.log(`    · ${c.name}  ${c.width}x${c.height}  asp${c.aspOff.toFixed(3)}  ham${dist}`);
    const ok = c.aspOff <= ASPECT_TOL ? dist <= HASH_MAX : dist <= HASH_STRONG;
    if (ok) { chosen = { ...c, dist }; break; }
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
    // Bookkeeping only: never let a log-file problem abort an upgrade whose new
    // image is already in R2 (a hard-coded path did exactly that on the runner,
    // 19–21 Sep 2026: 29 "fails" per run, cursor stuck, zero upgrades).
    try {
      mkdirSync(dirname(DELETION_LIST), { recursive: true });
      appendFileSync(DELETION_LIST, [oldMatch[1],
        `renditions/w800/artworks/${base}.webp`, `renditions/w1400/artworks/${base}.webp`,
        `renditions/og1200/artworks/${base}.jpg`].join("\n") + "\n");
    } catch (e) {
      console.warn(`  (deletion list not written: ${e?.message ?? e})`);
    }
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

if (process.env.REUP_ARTIST_WALK) {
  // Walk the `artists` table A→Z (same pattern as the daily A→Z drip's own
  // cursor — a git-committed file, not Supabase: that table's RLS silently
  // swallowed writes in CI for 7 weeks before anyone noticed — see the
  // daily-import.yml history). For each artist, resolve ALL of their still-low-res
  // artworks before moving on, so an artist is either fully done or the run
  // ended mid-artist (cursor stays put, same artist resumes next run — never
  // marked "done" on a partial pass). REUP_LIMIT caps upgrades per run, same
  // meaning as everywhere else in this script.
  const CURSOR_FILE = process.env.REUP_ARTIST_CURSOR_FILE || ".github/state/reupgrade-artist-cursor.txt";
  const MAX_ARTISTS = Number(process.env.REUP_MAX_ARTISTS || 150);
  let cursor = process.env.REUP_AFTER || "";
  if (!cursor && existsSync(CURSOR_FILE)) cursor = readFileSync(CURSOR_FILE, "utf-8").trim();
  console.log(`REUP ARTIST WALK: starting after "${cursor}", img_width < ${MAX_SRC}, cap ${MAX_WIDTH}px, up to ${LIMIT || "∞"} upgrades / ${MAX_ARTISTS} artists`);

  let scanned = 0, lastCompleted = cursor, pageCursor = cursor;
  outer:
  for (;;) {
    const { data: rows, error } = pageCursor
      ? await supabase.from("artists").select("name").gt("name", pageCursor).order("name", { ascending: true }).limit(25)
      : await supabase.from("artists").select("name").order("name", { ascending: true }).limit(25);
    if (error) throw error;
    if (!rows?.length) { console.log("Reached the end of the artist list."); break; }
    for (const { name } of rows) {
      if (scanned >= MAX_ARTISTS) break outer;
      scanned++;
      pageCursor = name;
      const { data: artRows, error: e2 } = await supabase.from("artworks").select(cols)
        .eq("artist_display", name).lt("img_width", MAX_SRC).is("reup_checked_at", null).limit(500);
      // reup_checked_at filter added 26 Sep 2026: REUP_LIMIT counts PROCESSED rows,
      // so an artist with more low-res works than the cap was re-scanned from the
      // top every night and the cursor never moved (Brooks, 23–25 Sep: 150/150 each run).
      if (e2) { console.log(`  (skip ${name}: ${e2.message})`); lastCompleted = name; continue; }
      if (artRows?.length) {
        console.log(`-- ${name}: ${artRows.length} candidate(s)`);
        if (await runBatch(artRows)) break outer; // LIMIT hit mid-artist — don't mark them done
      }
      lastCompleted = name;
    }
  }
  console.log(`\nREUP ARTIST WALK result: ${up} upgraded · scanned ${scanned} artist(s) · next run resumes after "${lastCompleted}"`);
  if (lastCompleted) {
    mkdirSync(dirname(CURSOR_FILE), { recursive: true });
    writeFileSync(CURSOR_FILE, lastCompleted + "\n");
  }
} else if (process.env.REUP_DAILY) {
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
