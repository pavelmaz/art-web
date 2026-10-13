// Fetches documented facts from Wikidata for the artworks on the Google allow-list
// (public.google_allowlist, kind=artwork) into public.artwork_wikidata. The facts
// ground the description rewrite (enrich-artworks ids mode) and the museum fix.
//
// Matching, most reliable first:
//   1. Commons source file → its structured data "digital representation of" (P6243)
//   2. Commons source file → the {{Artwork |wikidata=Q…}} template parameter
//   3. creator found by name on Wikidata + exactly one of their works with our title
// No confident match → row stored with qid null (the writer then gets no extra facts).
//
// Read-only on Wikidata/Commons; writes only public.artwork_wikidata.
// Run: node --env-file=.env.local scripts/wikidata-artwork-facts.mjs [--ids id1,id2] [--refresh]
const BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!BASE || !KEY) throw new Error("Missing Supabase env");
const DB = { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "application/json" };
const UA = { "User-Agent": "FineArtFree-facts/1.0 (https://fineartfree.com; pavelmaz@ucm.es)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const REFRESH = process.argv.includes("--refresh");

// ---- museum name the page shows (facts.museum) --------------------------------
// Wikidata labels → the names this site already uses, so museum pages don't split.
const MUSEUM_ALIASES = [
  [/^national gallery$/i, "National Gallery London"],
  [/louvre/i, "Louvre Museum"],
  [/^mus[ée]e d'orsay$/i, "Musee d'Orsay"],
  [/^são paulo museum of art$/i, "Museo de Arte de São Paulo"],
  [/^national gallery of art$|^(prints|drawings) in the national gallery of art$|^rosenwald collection$|^andrew w\. mellon collection$/i, "National Gallery of Art Washington"],
  [/^courtauld (institute of art|gallery)$/i, "Courtauld Gallery"],
  [/^thyssen-bornemisza museum$/i, "Museo Thyssen-Bornemisza"],
  [/^(österreichische galerie )?belvedere$/i, "Belvedere Museum"],
  [/^albertina$/i, "Albertina Museum"],
  [/^the nelson-atkins museum of art$/i, "Nelson-Atkins Museum of Art"],
  [/^onze-lieve-vrouwekathedraal$/i, "Cathedral of Our Lady, Antwerp"],
  [/^sint-baafskathedraal$|^st bavo's cathedral$/i, "St Bavo's Cathedral, Ghent"],
];
// Owners, donors and historical collections that are not where the work hangs today.
const NOT_A_VENUE = /^(samuel h\. kress collection|vlaamse kunstcollectie|stichting nederlands kunstbezit|cultural heritage agency of the netherlands art collection|führermuseum|electoral gallery dusseldorf|leiden collection)$|^.+ (collection|collectie|sammlung)$/i;
const COLLECTION_MUSEUMS = /royal collection|frick|wallace|barnes|bührle|national trust|gulbenkian|guillaume/i;
const VENUE_WORDS = /museum|museo|mus[ée]e|museu|gallery|galleria|galerie|gemäldegalerie|pinakothek|kunsthalle|kunsthaus|kunstmuseum|nationalmuseum|hermitage|louvre|prado|uffizi|rijksmuseum|mauritshuis|cathedral|kathedraal|chapel|church|basilica|abbey|palace|palazzo|house|foundation|institute|trust|royal collection|frick|barnes|tate|collections/i;

/** The single holder to show on the page, or null when only owners/donors are known. */
export function pageMuseum(collections) {
  const scored = (collections || [])
    .map((c) => {
      const alias = MUSEUM_ALIASES.find(([re]) => re.test(c.label));
      let s = 0;
      if (alias) s += 3;
      if (VENUE_WORDS.test(c.label)) s += 2;
      if (c.inventory) s += 1;
      if (NOT_A_VENUE.test(c.label) && !alias && !COLLECTION_MUSEUMS.test(c.label)) s -= 10;
      return { name: alias ? alias[1] : c.label, s };
    })
    .sort((a, b) => b.s - a.s);
  return scored[0] && scored[0].s >= 0 ? scored[0].name : null;
}

// A modern "inception" is a data error on Wikidata for a public-domain work.
function plausibleInception(v) {
  const y = parseInt(String(v || "").replace(/s$|th century$/, ""), 10);
  return v && Number.isFinite(y) && y <= 1955 ? v : null;
}

if (process.argv.includes("--museums")) {
  // Recompute facts.museum / inception for rows already stored (no network calls).
  let rows = [];
  for (let o = 0; ; o += 1000) {
    const r = await fetch(`${BASE}/rest/v1/artwork_wikidata?select=artwork_id,qid,match_method,facts&qid=not.is.null&offset=${o}&limit=1000`, { headers: DB });
    const j = await r.json();
    rows = rows.concat(j);
    if (j.length < 1000) break;
  }
  const out = rows.map((r) => ({
    ...r,
    facts: { ...r.facts, museum: pageMuseum(r.facts.collections), inception: plausibleInception(r.facts.inception) },
  }));
  for (let i = 0; i < out.length; i += 200) {
    const r = await fetch(`${BASE}/rest/v1/artwork_wikidata?on_conflict=artwork_id`, {
      method: "POST",
      headers: { ...DB, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(out.slice(i, i + 200)),
    });
    if (!r.ok) throw new Error(`upsert ${r.status} ${await r.text()}`);
  }
  const counts = {};
  for (const r of out) counts[r.facts.museum ?? "(none)"] = (counts[r.facts.museum ?? "(none)"] || 0) + 1;
  console.log(`museum set on ${out.filter((r) => r.facts.museum).length}/${out.length}`);
  console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${v}\t${k}`).join("\n"));
  process.exit(0);
}

async function getJson(url, tries = 4) {
  for (let t = 1; ; t++) {
    const r = await fetch(url, { headers: { ...UA, Accept: "application/json" } });
    if (r.ok) return r.json();
    if (t >= tries || ![429, 500, 502, 503, 504].includes(r.status)) throw new Error(`${r.status} ${url.slice(0, 120)}`);
    await sleep(2000 * t);
  }
}
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function dbAll(path) {
  let out = [];
  for (let o = 0; ; o += 1000) {
    const r = await fetch(`${BASE}/rest/v1/${path}${path.includes("?") ? "&" : "?"}offset=${o}&limit=1000`, { headers: DB });
    if (!r.ok) throw new Error(`db ${r.status} ${await r.text()}`);
    const j = await r.json();
    out = out.concat(j);
    if (j.length < 1000) return out;
  }
}

// ---- which artworks -------------------------------------------------------
let ids = arg("--ids")?.split(",").map((s) => s.trim()).filter(Boolean);
if (!ids) ids = (await dbAll("google_allowlist?select=ref_id&kind=eq.artwork&status=eq.proposed")).map((r) => r.ref_id);
if (!REFRESH) {
  const done = new Set((await dbAll("artwork_wikidata?select=artwork_id")).map((r) => r.artwork_id));
  ids = ids.filter((id) => !done.has(id));
}
const q = (v) => `"${String(v).replace(/"/g, '\\"')}"`;
let works = [];
for (const c of chunk(ids, 150)) {
  works = works.concat(await dbAll(`artworks?select=id,title,artist_display,url&id=in.(${c.map(q).join(",")})`));
}
console.log(`${works.length} artworks to resolve`);

const found = new Map(); // artwork id → { qid, method }

// ---- 1+2: Commons source files -------------------------------------------
const norm = (t) => t.replace(/_/g, " ").trim();
const commons = works
  .filter((w) => /commons\.wikimedia\.org\/wiki\/File(:|%3A)/i.test(w.url || ""))
  .map((w) => ({ w, file: norm(decodeURIComponent(w.url.split("/wiki/")[1].split(/[?#]/)[0])).replace(/^File%3A/i, "File:") }));
for (const c of chunk(commons, 50)) {
  const titles = c.map((x) => x.file).join("|");
  const sd = await getJson(`https://commons.wikimedia.org/w/api.php?action=wbgetentities&sites=commonswiki&titles=${encodeURIComponent(titles)}&props=claims&format=json`);
  const byTitle = new Map();
  for (const e of Object.values(sd.entities || {})) {
    const qid = e.statements?.P6243?.[0]?.mainsnak?.datavalue?.value?.id;
    if (e.title && qid) byTitle.set(norm(e.title), qid);
  }
  const missing = c.filter((x) => !byTitle.has(x.file));
  if (missing.length) {
    const wt = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&formatversion=2&format=json&titles=${encodeURIComponent(missing.map((x) => x.file).join("|"))}`);
    const normalized = new Map((wt.query?.normalized || []).map((n) => [norm(n.to), norm(n.from)]));
    for (const p of wt.query?.pages || []) {
      const m = (p.revisions?.[0]?.slots?.main?.content || "").match(/\|\s*wikidata\s*=\s*(Q\d+)/i);
      if (m) byTitle.set(normalized.get(norm(p.title)) || norm(p.title), `tpl:${m[1]}`);
    }
  }
  for (const x of c) {
    const v = byTitle.get(x.file);
    if (v) found.set(x.w.id, v.startsWith("tpl:") ? { qid: v.slice(4), method: "commons-template" } : { qid: v, method: "commons-p6243" });
  }
  await sleep(300);
}
console.log(`commons: ${found.size}/${commons.length} matched`);

// ---- 3: creator + exact title --------------------------------------------
const simple = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/^(the|a|an)\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
const ARTIST_DESC = /(painter|artist|engraver|printmaker|draughtsman|draftsman|sculptor|illustrator|architect|woodblock|ukiyo)/i;
const creatorCache = new Map();
async function creatorQid(name) {
  if (creatorCache.has(name)) return creatorCache.get(name);
  const s = await getJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=7&format=json`);
  const hit = (s.search || []).find((x) => ARTIST_DESC.test(x.description || ""));
  creatorCache.set(name, hit?.id || null);
  return hit?.id || null;
}
const worksByCreator = new Map();
async function creatorWorks(cq) {
  if (worksByCreator.has(cq)) return worksByCreator.get(cq);
  const sparql = `SELECT ?item ?l WHERE { ?item wdt:P170 wd:${cq} . { ?item rdfs:label ?l } UNION { ?item skos:altLabel ?l } FILTER(LANG(?l) = "en") }`;
  const j = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`);
  const m = new Map(); // simple title → Set(qid)
  for (const b of j.results.bindings) {
    const k = simple(b.l.value);
    const qid = b.item.value.split("/").pop();
    if (!m.has(k)) m.set(k, new Set());
    m.get(k).add(qid);
  }
  worksByCreator.set(cq, m);
  await sleep(500);
  return m;
}
let ctMatched = 0, ctTried = 0;
for (const w of works.filter((x) => !found.has(x.id) && x.artist_display && x.title)) {
  ctTried++;
  try {
    const cq = await creatorQid(w.artist_display);
    if (!cq) continue;
    const m = await creatorWorks(cq);
    const hits = m.get(simple(w.title));
    if (hits && hits.size === 1) { found.set(w.id, { qid: [...hits][0], method: "creator-title" }); ctMatched++; }
  } catch (e) { console.error(`creator-title ${w.id}: ${e.message}`); }
}
console.log(`creator+title: ${ctMatched}/${ctTried} matched`);

// ---- facts ------------------------------------------------------------------
const UNITS = { Q174728: "cm", Q11573: "m", Q174789: "mm", Q218593: "in" };
const timeStr = (v) => {
  if (!v?.time) return null;
  const y = parseInt(v.time.slice(1, v.time.indexOf("-", 1)), 10) * (v.time[0] === "-" ? -1 : 1);
  if (v.precision >= 9) return String(y);
  if (v.precision === 8) return `${Math.floor(y / 10) * 10}s`;
  if (v.precision === 7) return `${Math.ceil(y / 100)}th century`;
  return null;
};
const ids_ = (claims, p) => (claims[p] || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const qtys = (claims, p) => (claims[p] || []).map((c) => c.mainsnak?.datavalue?.value).filter(Boolean)
  .map((v) => `${Number(v.amount)} ${UNITS[(v.unit || "").split("/").pop()] || ""}`.trim());

const qids = [...new Set([...found.values()].map((f) => f.qid))];
const entities = new Map();
for (const c of chunk(qids, 50)) {
  const j = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${c.join("|")}&props=claims|labels|sitelinks&languages=en|mul&sitefilter=enwiki&format=json`);
  for (const [id, e] of Object.entries(j.entities || {})) entities.set(id, e);
  await sleep(300);
}
// labels for every referenced item
const refs = new Set();
for (const e of entities.values()) {
  const cl = e.claims || {};
  for (const p of ["P170", "P195", "P186", "P136", "P135", "P180", "P1071", "P276"]) ids_(cl, p).forEach((x) => refs.add(x));
}
const labels = new Map();
for (const c of chunk([...refs], 50)) {
  const j = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${c.join("|")}&props=labels&languages=en|mul&format=json`);
  // Many items now carry only the language-neutral "mul" label (e.g. National Gallery of Art).
  for (const [id, e] of Object.entries(j.entities || {})) labels.set(id, e.labels?.en?.value || e.labels?.mul?.value || null);
  await sleep(300);
}
const L = (arr) => [...new Set(arr.map((x) => labels.get(x)).filter(Boolean))];

const rows = works.map((w) => {
  const f = found.get(w.id);
  const e = f && entities.get(f.qid);
  if (!e || e.missing !== undefined) return { artwork_id: w.id, qid: null, match_method: null, facts: null };
  const cl = e.claims || {};
  // Current collections only (no end-time qualifier), with their inventory numbers.
  const collections = (cl.P195 || [])
    .filter((c) => !c.qualifiers?.P582 && c.mainsnak?.datavalue?.value?.id)
    .map((c) => {
      const cq = c.mainsnak.datavalue.value.id;
      const inv = (cl.P217 || []).find((i) => i.qualifiers?.P195?.[0]?.datavalue?.value?.id === cq)?.mainsnak?.datavalue?.value;
      return { qid: cq, label: labels.get(cq) || null, inventory: inv || null };
    })
    .filter((c) => c.label);
  const facts = {
    qid: f.qid,
    title: e.labels?.en?.value || e.labels?.mul?.value || null,
    creator: L(ids_(cl, "P170")),
    inception: plausibleInception(timeStr(cl.P571?.[0]?.mainsnak?.datavalue?.value)),
    collections,
    museum: pageMuseum(collections),
    location: L(ids_(cl, "P276")),
    material: L(ids_(cl, "P186")),
    height: qtys(cl, "P2048")[0] || null,
    width: qtys(cl, "P2049")[0] || null,
    genre: L(ids_(cl, "P136")),
    movement: L(ids_(cl, "P135")),
    depicts: L(ids_(cl, "P180")).slice(0, 10),
    created_in: L(ids_(cl, "P1071")),
    enwiki: e.sitelinks?.enwiki?.title || null,
  };
  return { artwork_id: w.id, qid: f.qid, match_method: f.method, facts };
});

for (const c of chunk(rows, 200)) {
  const r = await fetch(`${BASE}/rest/v1/artwork_wikidata?on_conflict=artwork_id`, {
    method: "POST",
    headers: { ...DB, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(c.map((x) => ({ ...x, fetched_at: new Date().toISOString() }))),
  });
  if (!r.ok) throw new Error(`upsert ${r.status} ${await r.text()}`);
}
const withQ = rows.filter((r) => r.qid);
console.log(`stored ${rows.length}: ${withQ.length} with Wikidata facts, ${withQ.filter((r) => r.facts.collections.length).length} with a current collection`);
