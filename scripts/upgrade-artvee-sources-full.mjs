#!/usr/bin/env node
/**
 * FULL-CATALOG Artvee→Commons source upgrade. One self-contained, resumable
 * pass: for every small-original Artvee-sourced artwork (highest score first),
 * find its Commons match, confirm with a perceptual hash, and — if it's a
 * genuinely bigger public-domain scan — replace the file, regenerate
 * renditions, update the row, and log the old keys for a deferred deletion
 * sweep. Reads from Commons/Wikidata (external) + our CDN (R2, zero Supabase
 * egress); writes INTO Supabase (ingress). Gentle: 1 at a time, 429 backoff.
 *
 * Resumable: candidates are re-queried each run with img_width < 1800, so
 * already-upgraded rows (now big) drop out automatically. Safe to Ctrl-C.
 *
 * Run: nohup node --env-file=.env.local scripts/upgrade-artvee-sources-full.mjs &
 */
import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const UA = "FineArtFree-upgrade/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const CDN = "https://cdn.fineartfree.com/";
const BUCKET = "art-images";
const MAX_WIDTH = 6000;
const MIN_GAIN = 1.3;
const SUPABASE_PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;
const DELETION_LIST = "/private/tmp/claude-502/-Users-pavelm-Desktop-art-web-main/cfb5e529-46ad-481e-9adc-49afc177a88f/scratchpad/artvee-full-old-keys.txt";

const VARIANTS = [
  { key: "w800", width: 800, quality: 75, format: "webp" },
  { key: "w1400", width: 1400, quality: 80, format: "webp" },
  { key: "og1200", width: 1200, quality: 80, format: "jpeg" },
];
const ART_OCCUPATIONS = new Set(["Q1028181", "Q483501", "Q11569986", "Q15296811", "Q329439", "Q644687"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normTitleKey(t) {
  return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’'`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ").split(/\s+/)
    .filter((w) => w && !["the", "a", "an", "st", "saint"].includes(w)).sort().join(" ");
}

async function gentleFetch(url, extraHeaders = {}) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...extraHeaders } });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) { await sleep(3000 * attempt); continue; }
    throw new Error(`fetch ${res.status}`);
  }
  throw new Error("fetch failed after retries");
}

async function wikidataPaintings(artistName) {
  const search = await (await gentleFetch(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(artistName)}&language=en&type=item&limit=5&format=json&origin=*`
  )).json();
  let qid = null;
  for (const hit of search?.search ?? []) {
    const ent = await (await gentleFetch(
      `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${hit.id}&property=P106&format=json&origin=*`
    )).json();
    const occs = (ent?.claims?.P106 ?? []).map((c) => c?.mainsnak?.datavalue?.value?.id);
    if (occs.some((o) => ART_OCCUPATIONS.has(o))) { qid = hit.id; break; }
    await sleep(120);
  }
  if (!qid) return [];
  const sparql = `SELECT ?item ?itemLabel ?image (GROUP_CONCAT(DISTINCT ?o;separator="|") AS ?alts) WHERE {
    ?item wdt:P170 wd:${qid}; wdt:P31 wd:Q3305213; wdt:P18 ?image.
    OPTIONAL { { ?item rdfs:label ?o FILTER(LANG(?o) IN ("fr","de","es","it","nl","pt","ru")) }
      UNION { ?item skos:altLabel ?o FILTER(LANG(?o)="en") } }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } GROUP BY ?item ?itemLabel ?image`;
  let rows = null;
  for (let a = 1; a <= 4; a++) {
    const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`,
      { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
    if (res.ok) { rows = (await res.json())?.results?.bindings ?? []; break; }
    await sleep(2000 * a);
  }
  return (rows ?? []).map((r) => ({
    alts: [r.itemLabel?.value ?? "", ...(r.alts?.value ?? "").split("|")].filter(Boolean),
    fileName: decodeURIComponent(r.image.value.split("/Special:FilePath/").pop() || "").replace(/_/g, " "),
  }));
}

async function commonsFileInfo(fileName, cap) {
  const p = new URLSearchParams({ action: "query", titles: `File:${fileName}`, prop: "imageinfo",
    iiprop: "url|size|extmetadata", format: "json", origin: "*", iiurlwidth: "512" });
  const data = await (await gentleFetch(`${COMMONS_API}?${p}`)).json();
  const ii = Object.values(data?.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!ii) return null;
  const license = (ii.extmetadata?.LicenseShortName?.value || "").replace(/<[^>]*>/g, "");
  let downloadUrl = ii.url;
  if (ii.width > cap || !/\.jpe?g$/i.test(ii.url)) {
    const p2 = new URLSearchParams({ action: "query", titles: `File:${fileName}`, prop: "imageinfo",
      iiprop: "url", format: "json", origin: "*", iiurlwidth: String(cap) });
    const d2 = await (await gentleFetch(`${COMMONS_API}?${p2}`)).json();
    downloadUrl = Object.values(d2?.query?.pages ?? {})[0]?.imageinfo?.[0]?.thumburl || null;
  }
  return { width: ii.width, height: ii.height, thumb: ii.thumburl, downloadUrl, license };
}

async function dhash(url, headers) {
  const res = await gentleFetch(url, headers);
  const raw = await sharp(Buffer.from(await res.arrayBuffer()), { limitInputPixels: false })
    .grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += raw[y * 9 + x] > raw[y * 9 + x + 1] ? "1" : "0";
  return bits;
}
const hamming = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };

async function upgrade(row, info) {
  const res = await gentleFetch(info.downloadUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf, { limitInputPixels: false }).metadata();
  if (!meta.width || meta.width < 1800) throw new Error(`too small ${meta.width}`);
  const jpegBuf = /\.jpe?g$/i.test(info.downloadUrl) ? buf
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
}

// ---------- main ----------
let scanned = 0, upgraded = 0, noMatch = 0, hashRej = 0, tooSmall = 0, errors = 0;
const startedAt = Date.now();

// Pull all remaining candidates (img_width<1800 drops already-upgraded rows), grouped
// by artist. PostgREST caps a single response at ~1000 rows, so page with .range().
const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("artworks")
    .select("id, slug, title, artist_display, image_id, img_width, img_height, score")
    .like("url", "%artvee.com%")
    .lt("img_width", 1800)
    .not("img_width", "is", null)
    .not("artist_display", "is", null)
    .order("score", { ascending: false })
    .order("id", { ascending: true })
    .range(from, from + 999);
  if (error) throw error;
  if (!data?.length) break;
  rows.push(...data);
  if (data.length < 1000) break;
}
console.log(`${rows.length} candidate artworks to consider (highest score first)`);

const byArtist = new Map();
for (const r of rows) {
  const a = r.artist_display.trim();
  if (!byArtist.has(a)) byArtist.set(a, []);
  byArtist.get(a).push(r);
}
console.log(`${byArtist.size} artists`);

for (const [artist, artRows] of byArtist) {
  let paintings;
  try { paintings = await wikidataPaintings(artist); }
  catch (e) { console.log(`✗ artist ${artist}: ${e.message}`); errors += artRows.length; continue; }
  if (!paintings.length) { noMatch += artRows.length; continue; }
  const byKey = new Map();
  for (const p of paintings) for (const k of p.alts.map(normTitleKey)) if (k && !byKey.has(k)) byKey.set(k, p);

  for (const row of artRows) {
    scanned++;
    try {
      const cand = byKey.get(normTitleKey(row.title));
      if (!cand) { noMatch++; continue; }
      const info = await commonsFileInfo(cand.fileName, MAX_WIDTH);
      if (!info || !/public domain|^pd\b|pd-|cc0/i.test(info.license)) { noMatch++; continue; }
      if (info.width < Math.max(1800, row.img_width * MIN_GAIN)) { tooSmall++; continue; }
      const ourThumb = row.image_id.replace(/^https:\/\/[a-z0-9-]+\.supabase\.co\//i, CDN).split("?")[0]
        .replace("/art-images/artworks/", "/art-images/renditions/w800/artworks/").replace(/\.[a-z0-9]+$/i, ".webp");
      const [a, b] = await Promise.all([dhash(ourThumb), dhash(info.thumb)]);
      if (hamming(a, b) > 10) { hashRej++; continue; }
      await upgrade(row, info);
      upgraded++;
      if (upgraded % 25 === 0) {
        const rate = upgraded / ((Date.now() - startedAt) / 3600000);
        console.log(`  … ${upgraded} upgraded | scanned ${scanned} | ${rate.toFixed(0)}/hr`);
      }
      console.log(`✓ ${row.slug}  ${row.img_width}px -> ${Math.min(info.width, MAX_WIDTH)}px`);
    } catch (e) {
      errors++;
      console.log(`✗ ${row.slug}: ${e.message}`);
    }
    await sleep(1500);
  }
}

console.log(`\nFULL UPGRADE COMPLETE upgraded=${upgraded} scanned=${scanned} noMatch=${noMatch} hashRej=${hashRej} tooSmall=${tooSmall} errors=${errors}`);
