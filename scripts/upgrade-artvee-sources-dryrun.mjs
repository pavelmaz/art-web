#!/usr/bin/env node
/**
 * DRY RUN — proposes Commons replacements for small Artvee-sourced originals.
 * Writes NOTHING to the database or storage: produces a report of confident
 * matches for human review before any replacement pass.
 *
 * Matching: (1) prefilter by artist (Wikidata P170 painting list, multilingual
 * labels) + normalized-title equality; (2) confirm with a perceptual hash
 * (dHash, 64-bit) of both images — same painting across different scans yields
 * a small Hamming distance, different paintings a large one.
 *
 * Run: node --env-file=.env.local scripts/upgrade-artvee-sources-dryrun.mjs [--min-score=0.9] [--out=report.json]
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const UA = "FineArtFree-upgrade/1.0 (https://fineartfree.com; pavelmazuelas@gmail.com)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const CDN = "https://cdn.fineartfree.com/";
const MIN_SCORE = Number((process.argv.find((a) => a.startsWith("--min-score=")) ?? "").split("=")[1] || 0.9);
const OUT = (process.argv.find((a) => a.startsWith("--out=")) ?? "").split("=")[1] ||
  "/private/tmp/claude-502/-Users-pavelm-Desktop-art-web-main/cfb5e529-46ad-481e-9adc-49afc177a88f/scratchpad/artvee-upgrade-report.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normTitleKey(t) {
  return (t || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’'`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["the", "a", "an", "st", "saint"].includes(w))
    .sort()
    .join(" ");
}

async function commons(params) {
  const url = `${COMMONS_API}?format=json&origin=*&${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  return res.json();
}

const ART_OCCUPATIONS = new Set(["Q1028181", "Q483501", "Q11569986", "Q15296811", "Q329439", "Q644687"]);

async function wikidataPaintings(artistName) {
  const search = await (await fetch(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(artistName)}&language=en&type=item&limit=5&format=json&origin=*`,
    { headers: { "User-Agent": UA } }
  )).json();
  let qid = null;
  for (const hit of search?.search ?? []) {
    const ent = await (await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${hit.id}&property=P106&format=json&origin=*`,
      { headers: { "User-Agent": UA } }
    )).json();
    const occs = (ent?.claims?.P106 ?? []).map((c) => c?.mainsnak?.datavalue?.value?.id);
    if (occs.some((o) => ART_OCCUPATIONS.has(o))) { qid = hit.id; break; }
    await sleep(100);
  }
  if (!qid) throw new Error(`no Wikidata artist for "${artistName}"`);

  const sparql = `SELECT ?item ?itemLabel ?image
    (GROUP_CONCAT(DISTINCT ?otherLabel; separator="|") AS ?altTitles) WHERE {
    ?item wdt:P170 wd:${qid}; wdt:P31 wd:Q3305213; wdt:P18 ?image.
    OPTIONAL {
      { ?item rdfs:label ?otherLabel FILTER(LANG(?otherLabel) IN ("fr","de","es","it","nl","pt","ru")) }
      UNION
      { ?item skos:altLabel ?otherLabel FILTER(LANG(?otherLabel) = "en") }
    }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } GROUP BY ?item ?itemLabel ?image`;
  let rows = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`,
      { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } }
    );
    if (res.ok) { rows = (await res.json())?.results?.bindings ?? []; break; }
    await sleep(1500 * attempt);
  }
  if (!rows) throw new Error("SPARQL failed");
  return rows.map((r) => ({
    label: r.itemLabel?.value ?? "",
    alts: (r.altTitles?.value ?? "").split("|").filter(Boolean),
    fileName: decodeURIComponent(r.image.value.split("/Special:FilePath/").pop() || "").replace(/_/g, " "),
  }));
}

async function commonsFileInfo(fileName) {
  const data = await commons({
    action: "query", titles: `File:${fileName}`, prop: "imageinfo",
    iiprop: "url|size|extmetadata", iiurlwidth: "512",
  });
  const page = Object.values(data?.query?.pages ?? {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) return null;
  const license = (ii.extmetadata?.LicenseShortName?.value || "").replace(/<[^>]*>/g, "");
  return { width: ii.width, height: ii.height, thumb: ii.thumburl, url: ii.url, license };
}

/** 64-bit dHash from any image URL (tiny download via 512px-or-less thumb). */
async function dhash(url, headers = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
  if (!res.ok) throw new Error(`fetch ${res.status} for hash`);
  const buf = Buffer.from(await res.arrayBuffer());
  const raw = await sharp(buf, { limitInputPixels: false })
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits += raw[y * 9 + x] > raw[y * 9 + x + 1] ? "1" : "0";
    }
  }
  return bits;
}

function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

// ---------- main ----------
const { data: rows, error } = await supabase
  .from("artworks")
  .select("id, slug, title, artist_display, image_id, img_width, img_height, score")
  .like("url", "%artvee.com%")
  .gte("score", MIN_SCORE)
  .lt("img_width", 1800)
  .not("img_width", "is", null)
  .order("artist_display");
if (error) throw error;
console.log(`${rows.length} candidate rows (score >= ${MIN_SCORE}, artvee-sourced, < 1800px)`);

const byArtist = new Map();
for (const r of rows) {
  const a = r.artist_display?.trim();
  if (!a) continue;
  if (!byArtist.has(a)) byArtist.set(a, []);
  byArtist.get(a).push(r);
}
console.log(`${byArtist.size} artists`);

const report = [];
let matched = 0, noCandidate = 0, tooSmall = 0, hashReject = 0, errors = 0;

for (const [artist, artRows] of byArtist) {
  let paintings;
  try {
    paintings = await wikidataPaintings(artist);
  } catch (e) {
    console.log(`✗ ${artist}: ${e.message}`);
    errors += artRows.length;
    continue;
  }
  const byKey = new Map();
  for (const p of paintings) {
    for (const k of [normTitleKey(p.label), ...p.alts.map(normTitleKey)]) {
      if (k && !byKey.has(k)) byKey.set(k, p);
    }
  }

  for (const row of artRows) {
    const key = normTitleKey(row.title);
    const cand = byKey.get(key);
    if (!cand) { noCandidate++; continue; }
    try {
      const info = await commonsFileInfo(cand.fileName);
      if (!info || !/public domain|^pd\b|pd-|cc0/i.test(info.license)) { noCandidate++; continue; }
      if (info.width < Math.max(1800, row.img_width * 1.3)) { tooSmall++; continue; }

      const ourThumbUrl = row.image_id
        .replace(/^https:\/\/[a-z0-9-]+\.supabase\.co\//i, CDN)
        .split("?")[0]
        .replace("/art-images/artworks/", "/art-images/renditions/w800/artworks/")
        .replace(/\.[a-z0-9]+$/i, ".webp");
      const [ourHash, theirHash] = await Promise.all([
        dhash(ourThumbUrl),
        dhash(info.thumb),
      ]);
      const dist = hamming(ourHash, theirHash);
      const verdict = dist <= 10 ? "MATCH" : dist <= 16 ? "REVIEW" : "REJECT";
      if (verdict === "REJECT") { hashReject++; continue; }
      matched++;
      report.push({
        slug: row.slug, title: row.title, artist,
        ourWidth: row.img_width, ourHeight: row.img_height,
        commonsFile: cand.fileName, commonsWidth: info.width, commonsHeight: info.height,
        commonsUrl: info.url, license: info.license, hashDistance: dist, verdict,
      });
      console.log(`✓ ${verdict} d=${dist}  ${row.slug}: ${row.img_width}px -> ${info.width}px  (${cand.fileName})`);
    } catch (e) {
      errors++;
      console.log(`✗ ${row.slug}: ${e.message}`);
    }
    await sleep(150);
  }
}

writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`\nDRY RUN COMPLETE matches=${matched} noCandidate=${noCandidate} tooSmallOnCommons=${tooSmall} hashRejected=${hashReject} errors=${errors}`);
console.log(`report: ${OUT}`);
