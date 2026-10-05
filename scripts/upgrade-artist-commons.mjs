// Upgrade one artist's images to the largest frame-free Wikimedia Commons scan.
//
// Three steps, so a human looks before anything changes (Commons scans are
// often photographed in their frame, or are a different version of the work —
// see memory "artist-quality-upgrade-framed-trap"):
//
//   1. discover  — match our works to Commons files (the artist's Wikidata
//                  paintings + "Paintings by <artist>" category), keep only
//                  commercially-safe licences and files clearly bigger than ours
//      node --env-file=.env.local scripts/upgrade-artist-commons.mjs discover "Gustav Klimt" Q34661
//      discover-wm "Gustav Klimt" --below=3000   (same, from the Wien Museum's CC0 collection)
//   2. sheet     — side-by-side review sheets (ours | candidate) to eyeball
//      node --env-file=.env.local scripts/upgrade-artist-commons.mjs sheet
//   3. apply     — for the slugs listed in approved.txt: store the FULL original
//                  (no size cap, per the 23 Sep 2026 rule) at a new R2 key
//                  artworks/<slug>-v<N>.jpg + w800/w1400/og1200 renditions,
//                  PATCH the row, and log the old values to revert.jsonl
//      node --env-file=.env.local scripts/upgrade-artist-commons.mjs apply
//
// Work files live in scripts/data/upgrade-<artist-slug>/.

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2 = { account: process.env.R2_ACCOUNT_ID, key: process.env.R2_ACCESS_KEY_ID, secret: process.env.R2_SECRET_ACCESS_KEY, bucket: process.env.R2_BUCKET };
if (!SB || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY");

const UA = "FineArtFree-upgrade/1.0 (https://fineartfree.com)";
const [mode, artistArg, qidArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
// Second-pass options for discover:
//   --below=3000   only works whose short side is under this
//   --deep         also walk "Works by <artist>" (drawings, posters…) and run a
//                  Commons search per remaining title; title match relaxed to 0.6
// Pairs rejected at review go in data/rejected.txt ("slug|File:…") and are skipped.
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}`))?.split("=")[1] ?? (process.argv.includes(`--${name}`) ? true : null);
const BELOW = Number(flag("below")) || Infinity;
const DEEP = !!flag("deep");
const STATE = new URL("./data/", import.meta.url);
const stateFile = new URL("upgrade-current.json", STATE);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Same rule as import-commons-r2.mjs: no NC/ND, and no BY-SA (ShareAlike
// contradicts the "free for any purpose" promise Pro buyers rely on).
const OK_LICENSE = /^(cc0|cc[ -]by[ -]?\d|public domain|pdm|pd\b|no restrictions)/i;
const BAD_LICENSE = /\bsa\b|share ?alike|\bnc\b|\bnd\b/i;
const MIN_GAIN = 1.25;
const GIANT_EDGE = 15000; // candidate's short side must beat ours by 25%+

const VARIANTS = [
  { key: "w800", width: 800, q: 75, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "w1400", width: 1400, q: 80, fmt: "webp", ext: "webp", ct: "image/webp" },
  { key: "og1200", width: 1200, q: 80, fmt: "jpeg", ext: "jpg", ct: "image/jpeg" },
];

async function getJson(url, init = {}) {
  for (let a = 0; a < 6; a++) {
    try {
      const r = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init.headers } });
      if (r.ok) return r.json();
      if (r.status === 429 || r.status >= 500) { await sleep(3000 * (a + 1)); continue; }
      throw new Error(`${r.status} ${url.slice(0, 100)}`);
    } catch (e) {
      if (a === 5) throw e;
      await sleep(3000 * (a + 1));
    }
  }
}
const rest = (path, init = {}) =>
  getJson(`${SB}/rest/v1/${path}`, { ...init, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...init.headers } });
const commons = (params) =>
  getJson(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: "json", ...params })}`);

const STOP = new Set("the of a an and in on with for by at to der die das des dem den und mit im in am von zu ein eine einer le la les de du et".split(" "));
function tokens(s) {
  return (s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").toLowerCase()
    .replace(/\.(jpe?g|png|tiff?)$/, "")
    .replace(/google art project|google cultural institute|gustav klimt|klimt|\bfile:/g, " ")
    .replace(/[^a-z0-9]+/g, " ").split(" ")
    .filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t) && t.length > 1);
}
function similarity(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.min(A.size, B.size);
}
const year = (s) => Number((/\b(18|19)\d\d\b/.exec(s || "") || [])[0]) || null;

async function discover(artist, qid) {
  const ours = await rest(`artworks?select=slug,title,date_display,img_width,img_height,image_id&artist_display=ilike.*${encodeURIComponent(artist.split(" ").pop())}*&limit=1000`);
  console.log(`${ours.length} works in the catalogue`);

  // Candidates: the artist's Wikidata works with an image, plus the Commons category.
  const cands = new Map(); // file title -> { labels:Set, year }
  if (qid) {
    const q = `SELECT ?img ?en ?de ?inc WHERE { ?item wdt:P170 wd:${qid}; wdt:P18 ?img.
      OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en)="en") } OPTIONAL { ?item rdfs:label ?de FILTER(LANG(?de)="de") }
      OPTIONAL { ?item wdt:P571 ?inc } }`;
    const rows = (await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { headers: { Accept: "application/sparql-results+json" } })).results.bindings;
    for (const r of rows) {
      const file = "File:" + decodeURIComponent(r.img.value.split("/").pop()).replace(/_/g, " ");
      const c = cands.get(file) || { labels: new Set(), year: null };
      for (const l of [r.en?.value, r.de?.value]) if (l) c.labels.add(l);
      c.year ||= year(r.inc?.value);
      cands.set(file, c);
    }
    console.log(`${cands.size} Wikidata images`);
  }
  async function walk(cat, depth, seen = new Set()) {
    if (seen.has(cat) || depth < 0) return;
    seen.add(cat);
    let cont = {};
    do {
      const d = await commons({ action: "query", list: "categorymembers", cmtitle: cat, cmlimit: "500", cmtype: "file|subcat", ...cont });
      for (const m of d.query?.categorymembers ?? []) {
        if (m.ns === 14) await walk(m.title, depth - 1, seen);
        else if (!cands.has(m.title)) cands.set(m.title, { labels: new Set(), year: null });
      }
      cont = d.continue ?? null;
    } while (cont);
  }
  await walk(`Category:Paintings by ${artist}`, 2);
  if (DEEP) {
    await walk(`Category:Works by ${artist}`, 3);
    // Titles the categories miss: search Commons for each low-res work.
    for (const o of ours.filter((x) => Math.min(x.img_width || 0, x.img_height || 0) < BELOW)) {
      const q = `${o.title.replace(/[‘’"();,.]/g, " ")} ${artist.split(" ").pop()}`;
      const d = await commons({ action: "query", list: "search", srsearch: q, srnamespace: "6", srlimit: "15" });
      for (const r of d.query?.search ?? []) if (!cands.has(r.title)) cands.set(r.title, { labels: new Set(), year: null });
      await sleep(150);
    }
  }
  console.log(`${cands.size} candidate files in total`);

  // Size, licence and categories for every candidate, 50 titles per request.
  const files = [...cands.keys()];
  const info = new Map();
  for (let i = 0; i < files.length; i += 50) {
    const d = await commons({ action: "query", titles: files.slice(i, i + 50).join("|"), prop: "imageinfo|categories", iiprop: "size|extmetadata|mime", cllimit: "max" });
    for (const p of Object.values(d.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      info.set(p.title, {
        w: ii.width, h: ii.height, mime: ii.mime,
        license: ii.extmetadata?.LicenseShortName?.value ?? "",
        framed: (p.categories ?? []).some((c) => /framed paintings/i.test(c.title)),
      });
    }
    await sleep(200);
  }

  let rejected = new Set();
  try { rejected = new Set(readFileSync(new URL("rejected.txt", STATE), "utf8").split("\n").map((l) => l.trim()).filter(Boolean)); } catch {}
  const proposals = [];
  for (const o of ours) {
    const oShort = Math.min(o.img_width || 0, o.img_height || 0);
    if (oShort >= BELOW) continue;
    const found = [];
    for (const [file, c] of cands) {
      const m = info.get(file);
      if (!m || !/image\/(jpeg|png|tiff)/.test(m.mime)) continue;
      if (!OK_LICENSE.test(m.license) || BAD_LICENSE.test(m.license) || m.framed) continue;
      const score = Math.max(similarity(o.title, file), ...[...c.labels].map((l) => similarity(o.title, l)));
      if (score < (DEEP ? 0.6 : 0.75) || rejected.has(`${o.slug}|${file}`)) continue;
      const oy = year(o.date_display), cy = c.year;
      if (oy && cy && Math.abs(oy - cy) > 3) continue;
      const short = Math.min(m.w, m.h);
      if (short < oShort * MIN_GAIN) continue;
      // Same picture should keep roughly the same shape; a big change means a frame or a different crop.
      const ratioShift = Math.abs(m.w / m.h - (o.img_width || 1) / (o.img_height || 1)) / ((o.img_width || 1) / (o.img_height || 1));
      const cand = { file, w: m.w, h: m.h, license: m.license, score: +score.toFixed(2), ratioShift: +ratioShift.toFixed(2), labels: [...c.labels] };
      found.push(cand);
    }
    // Best title match first, then the biggest; the deep pass shows the top two
    // (a relaxed match can rank the wrong drawing first).
    found.sort((a, b) => b.score - a.score || Math.min(b.w, b.h) - Math.min(a.w, a.h));
    for (const best of found.slice(0, DEEP ? 2 : 1))
      proposals.push({ slug: o.slug, title: o.title, date: o.date_display, ours: [o.img_width, o.img_height], image_id: o.image_id, ...best });
  }
  mkdirSync(STATE, { recursive: true });
  writeFileSync(stateFile, JSON.stringify({ artist, proposals }, null, 1));
  console.log(`${proposals.length} works have a bigger licence-safe candidate → ${stateFile.pathname}`);
  for (const p of proposals) console.log(`  ${p.slug.slice(0, 50).padEnd(50)} ${p.ours.join("x").padEnd(10)} → ${p.w}x${p.h}  s=${p.score} shift=${p.ratioShift}  ${p.file.slice(5, 70)}`);
}

async function thumb(file, width = 600) {
  const d = await commons({ action: "query", titles: file, prop: "imageinfo", iiprop: "url", iiurlwidth: String(width) });
  const url = Object.values(d.query.pages)[0].imageinfo[0].thumburl;
  return Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
}

async function oursThumb(imageId) {
  // Our w800 rendition, read from storage with the service key (a handful of
  // small files; never bulk-read through cdn.fineartfree.com).
  const key = imageId.split("/art-images/")[1].replace(/\.[a-z0-9]+$/i, "");
  const res = await fetch(`${SB}/storage/v1/object/art-images/renditions/w800/${key}.webp`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (res.ok) return Buffer.from(await res.arrayBuffer());
  // Newer images live only in R2.
  try {
    return execFileSync("curl", ["-s", "-f", "-m", "60", "--aws-sigv4", "aws:amz:auto:s3", "-K", "-",
      `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/renditions/w800/${key}.webp`], { input: r2Auth(), stdio: ["pipe", "pipe", "ignore"] });
  } catch {}
  const orig = await fetch(`${SB}/storage/v1/object/art-images/${imageId.split("/art-images/")[1]}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  return sharp(Buffer.from(await orig.arrayBuffer()), { limitInputPixels: false }).resize({ width: 800 }).toBuffer();
}

async function sheet() {
  const { proposals } = JSON.parse(readFileSync(stateFile, "utf8"));
  const out = new URL("sheets/", STATE);
  mkdirSync(out, { recursive: true });
  const W = 1000, CELL = 480, H = 380, LABEL = 34;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const PER = 6;
  for (let s = 0; s < proposals.length; s += PER) {
    const batch = proposals.slice(s, s + PER);
    const composites = [];
    for (let i = 0; i < batch.length; i++) {
      const p = batch[i];
      let left, right;
      try { left = await oursThumb(p.image_id); } catch { left = null; }
      try { right = p.thumbUrl ? Buffer.from(await (await fetch(p.thumbUrl, { headers: { "User-Agent": UA } })).arrayBuffer()) : await thumb(p.file); } catch { right = null; }
      const fit = async (b) => b ? sharp(b).resize({ width: CELL, height: H, fit: "contain", background: "#eeeeee" }).toBuffer()
        : sharp({ create: { width: CELL, height: H, channels: 3, background: "#ff9999" } }).png().toBuffer();
      const top = i * (H + LABEL + 10);
      const label = Buffer.from(`<svg width="${W}" height="${LABEL}"><rect width="100%" height="100%" fill="#fff"/><text x="4" y="14" font-family="monospace" font-size="12">#${s + i} ${esc(p.slug.slice(0, 60))}  ours ${p.ours.join("x")}</text><text x="4" y="29" font-family="monospace" font-size="12">→ ${p.w}x${p.h} s=${p.score} shift=${p.ratioShift} ${esc(p.file.slice(5, 70))}</text></svg>`);
      composites.push({ input: await sharp(label).png().toBuffer(), top, left: 0 });
      composites.push({ input: await fit(left), top: top + LABEL, left: 0 });
      composites.push({ input: await fit(right), top: top + LABEL, left: CELL + 40 });
    }
    const height = batch.length * (H + LABEL + 10);
    await sharp({ create: { width: W, height, channels: 3, background: "#ffffff" } }).composite(composites).jpeg({ quality: 80 })
      .toFile(new URL(`sheet-${String(s / PER).padStart(2, "0")}.jpg`, out).pathname);
    console.log(`sheet ${s / PER}: #${s}–#${s + batch.length - 1}`);
  }
}

// Credentials go to curl on stdin (-K -), never argv: a failed execFileSync puts
// the whole command line in its error message, and that ends up in logs.
const r2Auth = () => `user = "${R2.key}:${R2.secret}"\n`;

function r2Put(objectKey, body, contentType) {
  const f = join(mkdtempSync(join(tmpdir(), "r2up-")), "up.bin");
  writeFileSync(f, body);
  try {
    execFileSync("curl", ["-s", "-f", "-m", "600", "--aws-sigv4", "aws:amz:auto:s3", "-K", "-",
      "-X", "PUT", "-H", `Content-Type: ${contentType}`, "--data-binary", `@${f}`,
      `https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${objectKey}`], { input: r2Auth(), stdio: ["pipe", "ignore", "ignore"] });
  } catch (e) {
    throw new Error(`R2 upload failed for ${objectKey} (curl exit ${e.status})`);
  }
}

async function apply() {
  if (!R2.account || !R2.key || !R2.secret || !R2.bucket) throw new Error("Missing R2_* env");
  const { proposals } = JSON.parse(readFileSync(stateFile, "utf8"));
  const approvedFile = new URL("approved.txt", STATE);
  const approved = new Set(readFileSync(approvedFile, "utf8").split("\n").map((l) => l.trim()).filter(Boolean));
  const revert = new URL("revert.jsonl", STATE).pathname;
  // A line is a slug, or "slug|File:…" when the slug has more than one proposal.
  const picked = proposals.filter((x) => approved.has(`${x.slug}|${x.file}`) ||
    (approved.has(x.slug) && proposals.filter((y) => y.slug === x.slug).length === 1));
  for (const p of picked) {
    const [row] = await rest(`artworks?select=slug,image_id,img_width,img_height,orig_bytes,std_bytes,url,museum&slug=eq.${encodeURIComponent(p.slug)}`);
    if (!row) { console.log(`  ! missing ${p.slug}`); continue; }
    let src = p.url;
    if (!src) {
      const d = await commons({ action: "query", titles: p.file, prop: "imageinfo", iiprop: "url|size" });
      src = Object.values(d.query.pages)[0].imageinfo[0].url;
    }
    const orig = Buffer.from(await (await fetch(src, { headers: { "User-Agent": UA } })).arrayBuffer());
    // Full original, re-encoded only to make it a JPEG. The one exception is a
    // gigapixel scan (e.g. Klimt's "Death and Life" at 42,458px): above 15,000px
    // the file is unusable as a download, so it is brought down to that.
    const jpeg = await sharp(orig, { limitInputPixels: false, failOn: "none" }).rotate()
      .resize({ width: GIANT_EDGE, height: GIANT_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    const meta = await sharp(jpeg, { limitInputPixels: false }).metadata();
    // A new key per version: the CDN and browsers cache artworks/* immutably.
    const prev = /-v(\d+)\.jpg$/.exec(row.image_id || "");
    const v = prev ? Number(prev[1]) + 1 : 2;
    const objectPath = `artworks/${p.slug}-v${v}.jpg`;
    r2Put(objectPath, jpeg, "image/jpeg");
    let stdBytes = null;
    for (const r of VARIANTS) {
      const buf = await sharp(jpeg, { limitInputPixels: false }).resize({ width: r.width, withoutEnlargement: true })[r.fmt]({ quality: r.q }).toBuffer();
      r2Put(`renditions/${r.key}/artworks/${p.slug}-v${v}.${r.ext}`, buf, r.ct);
      if (r.key === "w1400") stdBytes = buf.length;
    }
    appendFileSync(revert, JSON.stringify({ slug: p.slug, at: new Date().toISOString(), old: row, file: p.file }) + "\n");
    const res = await fetch(`${SB}/rest/v1/artworks?slug=eq.${encodeURIComponent(p.slug)}`, {
      method: "PATCH",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ image_id: `${SB}/storage/v1/object/public/art-images/${objectPath}`, img_width: meta.width, img_height: meta.height, orig_bytes: jpeg.length, std_bytes: stdBytes,
      }),
    });
    if (!res.ok) throw new Error(`PATCH ${p.slug}: ${res.status} ${await res.text()}`);
    console.log(`  ✓ ${p.slug}  ${row.img_width}x${row.img_height} → ${meta.width}x${meta.height}  (${(jpeg.length / 1e6).toFixed(1)} MB)`);
  }
}

// Wien Museum Online Sammlung: ~2,000 Klimt items, open content is CC0 with a
// full-resolution "<media>_full.jpg". Same review/apply flow as Commons; the
// proposal carries url (full file) and thumbUrl (for the review sheet).
const WM = "https://sammlung.wienmuseum.at/";
async function wmObjects(fullText) {
  const query = `query objects($filter: Filter, $lang: Lang, $pagination: Pagination, $sort: Sort) {
    objects(filter: $filter, lang: $lang, pagination: $pagination, sort: $sort) {
      objects { id titles { text type } people { personId name role } datings { fullFrom fullTo }
        multimedia { preferred preview { webp width height } } }
      totalCount } }`;
  const all = [];
  for (let skip = 0; ; skip += 100) {
    const d = await getJson(`${WM}api`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { filter: { fullText, openContent: true }, pagination: { pageSize: 100, skip }, sort: "RELEVANCE", lang: "DE" } }) });
    const page = d.data.objects.objects;
    all.push(...page);
    if (!page.length || all.length >= d.data.objects.totalCount) break;
    await sleep(300);
  }
  return all;
}
async function remoteSize(url) {
  // The JPEG header is in the first few hundred KB; no need for the whole file.
  const r = await fetch(url, { headers: { "User-Agent": UA, Range: "bytes=0-400000" } });
  if (!r.ok) return null;
  const m = await sharp(Buffer.from(await r.arrayBuffer()), { failOn: "none" }).metadata();
  return m.width ? [m.width, m.height] : null;
}

async function discoverWm(artist) {
  const ours = await rest(`artworks?select=slug,title,date_display,img_width,img_height,image_id&artist_display=ilike.*${encodeURIComponent(artist.split(" ").pop())}*&limit=1000`);
  const objs = (await wmObjects(artist)).filter((o) => o.people.some((p) => p.name === artist && !/owned|abgebildet|depicted|dargestellt/i.test(p.role || "")));
  console.log(`${objs.length} open-content Wien Museum objects by ${artist}`);
  let rejected = new Set();
  try { rejected = new Set(readFileSync(new URL("rejected.txt", STATE), "utf8").split("\n").map((l) => l.trim()).filter(Boolean)); } catch {}
  const proposals = [];
  for (const o of ours) {
    const oShort = Math.min(o.img_width || 0, o.img_height || 0);
    if (oShort >= BELOW) continue;
    const oRatio = (o.img_width || 1) / (o.img_height || 1);
    const found = [];
    for (const w of objs) {
      const score = Math.max(...w.titles.map((t) => similarity(o.title, t.text)));
      if (score < 0.75) continue;
      const oy = year(o.date_display), wy = Number(w.datings?.[0]?.fullFrom) || null;
      if (oy && wy && Math.abs(oy - wy) > 3) continue;
      // Several photos per object (one often shows a colour chart): take the one shaped like ours.
      const mm = [...w.multimedia].sort((a, b) => Math.abs(a.preview.width / a.preview.height - oRatio) - Math.abs(b.preview.width / b.preview.height - oRatio))[0];
      if (!mm) continue;
      const url = WM + mm.preview.webp.replace(/_preview\.webp$/, "_full.jpg");
      const file = `WienMuseum:${w.id}/${url.split("/").pop()}`;
      if (rejected.has(`${o.slug}|${file}`)) continue;
      const size = await remoteSize(url).catch(() => null);
      if (!size || Math.min(...size) < oShort * MIN_GAIN) continue;
      const ratioShift = Math.abs(size[0] / size[1] - oRatio) / oRatio;
      found.push({ file, url, thumbUrl: WM + mm.preview.webp.replace(/_preview\.webp$/, "_default.webp"), w: size[0], h: size[1], license: "CC0 (Wien Museum)", score: +score.toFixed(2), ratioShift: +ratioShift.toFixed(2), labels: w.titles.map((t) => t.text) });
    }
    found.sort((a, b) => b.score - a.score || Math.min(b.w, b.h) - Math.min(a.w, a.h));
    for (const best of found.slice(0, 2))
      proposals.push({ slug: o.slug, title: o.title, date: o.date_display, ours: [o.img_width, o.img_height], image_id: o.image_id, ...best });
  }
  writeFileSync(stateFile, JSON.stringify({ artist, proposals }, null, 1));
  console.log(`${proposals.length} proposals → ${stateFile.pathname}`);
  for (const p of proposals) console.log(`  ${p.slug.slice(0, 50).padEnd(50)} ${p.ours.join("x").padEnd(10)} → ${p.w}x${p.h}  s=${p.score} shift=${p.ratioShift}  ${p.labels[0].slice(0, 60)}`);
}

if (mode === "discover") await discover(artistArg, qidArg);
else if (mode === "discover-wm") await discoverWm(artistArg);
else if (mode === "sheet") await sheet();
else if (mode === "apply") await apply();
else console.log("usage: discover <artist> <wikidata QID> | discover-wm <artist> | sheet | apply");
