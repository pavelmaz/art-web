// Fill in the real holding museum for core artworks whose `museum` is the
// importer's "Private collection" placeholder, from Wikidata (P195 collection).
//
// Only confident matches are written: the artist resolves to one Wikidata
// person, the title matches exactly one work of theirs (or several that all sit
// in the same museum), the dates agree, and that work has exactly one current,
// non-private collection. Everything else stays blank — a blank is never wrong,
// a guessed museum is.
//
// Dry run (writes scripts/data/museum-backfill-proposals.json, changes nothing):
//   node --env-file=.env.local scripts/backfill-museums-wikidata.mjs
// Redo only the artists whose lookups failed last time:
//   node --env-file=.env.local scripts/backfill-museums-wikidata.mjs --retry-errors
// Apply the reviewed proposals (logs old→new to scripts/data/museum-backfill-applied.json):
//   node --env-file=.env.local scripts/backfill-museums-wikidata.mjs --apply
// Afterwards: refresh materialized view museums_hub (new museums get hub pages).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY");

const MIN_SCORE = Number(process.env.MIN_SCORE ?? 0.6);
const OUT_DIR = new URL("./data/", import.meta.url);
const PROPOSALS = new URL("museum-backfill-proposals.json", OUT_DIR);
const APPLIED = new URL("museum-backfill-applied.json", OUT_DIR);
const UA = "FineArtFreeMuseumBackfill/1.0 (https://fineartfree.com)";
const PRIVATE_COLLECTION = "Q768717";
const LANGS = ["en", "fr", "nl", "de", "es", "it", "pt"];
// Prints exist in many impressions held by different museums (the Great Wave
// alone is in dozens), so a title match can't say which impression we have.
// Collections the site already lists under another name (checked 30 Sep 2026),
// so matched works join the existing museum page instead of a duplicate.
const SITE_NAME_BY_COLLECTION = {
  Q188740: "MoMA",
  Q180788: "National Gallery London",
  Q238587: "National Portrait Gallery London",
  Q731126: "Getty Center",
  Q303139: "Belvedere Museum",
  Q371908: "Albertina Museum",
  Q3044768: "Louvre Museum",
  Q3044753: "Louvre Museum",
  Q176251: "Museo Thyssen-Bornemisza",
  Q201469: "Guggenheim Museum",
  Q1848918: "Museo Nacional de Bellas Artes (Argentina)",
  Q924335: "Stedelijk Museum",
  Q861252: "Museo Nacional de Arte de Cataluña",
};
// Without a date on both sides, a short or stock title ("Dawn", "Still Life
// with Flowers") can match a different painting of the same name.
const GENERIC_TITLE = /^(still life|nature morte|stilleven|landscape|paysage|landschap|portrait|portret|bildnis|self portrait|study|sketch|head|bust|view|untitled|composition|flowers|vase of flowers|nude|interior|seascape|figure|woman|man|girl|boy)\b/;
const PRINT_MEDIUM = /print|woodcut|woodblock|etching|engraving|lithograph|aquatint|mezzotint|drypoint|intaglio/i;

const sb = (path, init = {}) =>
  fetch(`${SB}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...init.headers },
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, init = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    let res;
    try {
      res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init.headers } });
    } catch {
      // Dropped connection (Wi-Fi, laptop sleep): wait and try again.
      await sleep(10000 * (attempt + 1));
      continue;
    }
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || 5000 * (attempt + 1);
      await sleep(wait);
      continue;
    }
    throw new Error(`${res.status} ${url.slice(0, 120)}`);
  }
  throw new Error(`gave up: ${url.slice(0, 120)}`);
}

const sparql = async (query) =>
  (
    await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/sparql-results+json" },
    })
  ).results.bindings;

const qid = (uri) => uri.slice(uri.lastIndexOf("/") + 1);

function norm(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

const firstYear = (s) => {
  const m = /\b(1[0-9]{3}|20[0-2][0-9])\b/.exec(s || "");
  return m ? Number(m[1]) : null;
};

async function resolveArtist(name) {
  const search = await getJson(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=10&search=${encodeURIComponent(name)}`
  );
  const ids = (search.search || []).map((r) => r.id);
  if (!ids.length) return null;
  const rows = await sparql(`SELECT ?item (COUNT(DISTINCT ?w) AS ?n) WHERE {
    VALUES ?item { ${ids.map((i) => `wd:${i}`).join(" ")} }
    ?item wdt:P31 wd:Q5 . ?w wdt:P170 ?item .
  } GROUP BY ?item ORDER BY DESC(?n)`);
  return rows.length ? qid(rows[0].item.value) : null;
}

async function artistWorks(artistQid) {
  const labelRows = await sparql(`SELECT ?w ?lbl ?inc WHERE {
    ?w wdt:P170 wd:${artistQid} .
    { ?w rdfs:label ?lbl } UNION { ?w skos:altLabel ?lbl }
    FILTER(LANG(?lbl) IN (${LANGS.map((l) => `"${l}"`).join(",")}))
    OPTIONAL { ?w wdt:P571 ?inc }
  }`);
  const collRows = await sparql(`SELECT ?w ?coll ?collLabel WHERE {
    ?w wdt:P170 wd:${artistQid} .
    ?w p:P195 ?st . ?st ps:P195 ?coll ; wikibase:rank ?rk .
    FILTER(?rk != wikibase:DeprecatedRank)
    FILTER NOT EXISTS { ?st pq:P582 ?end }
    OPTIONAL { ?coll rdfs:label ?collLabel FILTER(LANG(?collLabel) = "en") }
  }`);

  const works = new Map(); // work qid -> { titles:Set, year, colls: Map(qid -> label) }
  const get = (w) => {
    if (!works.has(w)) works.set(w, { titles: new Set(), year: null, colls: new Map() });
    return works.get(w);
  };
  for (const r of labelRows) {
    const w = get(qid(r.w.value));
    w.titles.add(norm(r.lbl.value));
    if (r.inc && w.year == null) w.year = firstYear(r.inc.value);
  }
  for (const r of collRows) {
    get(qid(r.w.value)).colls.set(qid(r.coll.value), r.collLabel?.value ?? null);
  }
  return works;
}

function decide(art, works, hubByNorm) {
  if (PRINT_MEDIUM.test(art.medium_display || "")) return { outcome: "print" };
  const title = norm(art.title);
  const year = firstYear(art.date_display);
  let cands = [...works.entries()].filter(([, w]) => w.titles.has(title));
  if (!cands.length) return { outcome: "no_title_match" };
  if (cands.length > 1 && year != null) {
    const sameYear = cands.filter(([, w]) => w.year === year);
    if (sameYear.length) cands = sameYear;
  }
  if (year != null && cands.every(([, w]) => w.year != null && Math.abs(w.year - year) > 2)) {
    return { outcome: "year_mismatch" };
  }
  const datesAgree = year != null && cands.every(([, w]) => w.year != null && Math.abs(w.year - year) <= 2);
  if (!datesAgree && (title.split(" ").length < 3 || GENERIC_TITLE.test(title))) return { outcome: "weak_title" };
  const collSets = cands.map(([, w]) => [...w.colls.keys()].filter((c) => c !== PRIVATE_COLLECTION));
  if (collSets.some((s) => s.length !== 1)) return { outcome: cands.length > 1 ? "ambiguous" : "no_single_collection" };
  const coll = collSets[0][0];
  if (collSets.some((s) => s[0] !== coll)) return { outcome: "ambiguous" };
  const label = cands[0][1].colls.get(coll);
  if (!label || /private collection/i.test(label)) return { outcome: "no_label" };
  const existing = SITE_NAME_BY_COLLECTION[coll] ?? hubByNorm.get(norm(label));
  return {
    outcome: "match",
    work: cands.map(([q]) => q).join(","),
    coll,
    museum: existing ?? label,
    existing: Boolean(existing),
  };
}

async function fetchTargets() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await sb(
      `artworks?select=id,slug,title,artist_display,date_display,medium_display,score&museum=eq.Private%20collection&score=gte.${MIN_SCORE}&order=score.desc,id.asc`,
      { headers: { Range: `${from}-${from + 999}` } }
    );
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function dryRun() {
  const hub = await (await sb("rpc/get_museum_hub", { method: "POST", body: "{}" })).json();
  // Hub rows come most-used first; keep that spelling when names differ only in accents.
  const hubByNorm = new Map();
  for (const h of hub) if (!hubByNorm.has(norm(h.display))) hubByNorm.set(norm(h.display), h.display);
  // --retry-errors: keep the previous run's results and redo only the artists that failed.
  const previous = process.argv.includes("--retry-errors") ? JSON.parse(readFileSync(PROPOSALS, "utf8")) : [];
  const retryArtists = new Set(previous.filter((r) => r.outcome.startsWith("error")).map((r) => r.artist));
  const kept = previous.filter((r) => !retryArtists.has(r.artist));
  const targets = (await fetchTargets()).filter((t) => !previous.length || retryArtists.has((t.artist_display || "").trim()));
  const byArtist = new Map();
  for (const t of targets) {
    const a = (t.artist_display || "").trim();
    if (!byArtist.has(a)) byArtist.set(a, []);
    byArtist.get(a).push(t);
  }
  console.log(`${targets.length} works, ${byArtist.size} artists`);

  const results = [...kept];
  let done = 0;
  for (const [artist, arts] of byArtist) {
    done++;
    let outcomeForAll = null;
    let works = null;
    if (!artist || /^(unknown|anonymous)/i.test(artist)) outcomeForAll = "unknown_artist";
    else {
      try {
        const aq = await resolveArtist(artist);
        if (!aq) outcomeForAll = "artist_not_found";
        else works = await artistWorks(aq);
      } catch (e) {
        outcomeForAll = `error: ${e.message}`;
      }
    }
    for (const art of arts) {
      const d = outcomeForAll ? { outcome: outcomeForAll } : decide(art, works, hubByNorm);
      results.push({ id: art.id, slug: art.slug, title: art.title, artist, date: art.date_display, score: art.score, ...d });
    }
    if (done % 25 === 0) console.log(`${done}/${byArtist.size} artists, ${results.filter((r) => r.outcome === "match").length} matches`);
    await sleep(300);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(PROPOSALS, JSON.stringify(results, null, 1));
  const tally = {};
  for (const r of results) tally[r.outcome.startsWith("error") ? "error" : r.outcome] = (tally[r.outcome.startsWith("error") ? "error" : r.outcome] || 0) + 1;
  console.log(tally);
}

async function apply() {
  const matches = JSON.parse(readFileSync(PROPOSALS, "utf8")).filter((r) => r.outcome === "match");
  const byMuseum = new Map();
  for (const m of matches) {
    if (!byMuseum.has(m.museum)) byMuseum.set(m.museum, []);
    byMuseum.get(m.museum).push(m.id);
  }
  const applied = [];
  for (const [museum, ids] of byMuseum) {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      // Only rows still holding the placeholder, so a re-run never overwrites a real value.
      const res = await sb(`artworks?id=in.(${chunk.join(",")})&museum=eq.Private%20collection`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ museum }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      for (const row of await res.json()) applied.push({ id: row.id, slug: row.slug, old: "Private collection", museum });
    }
  }
  writeFileSync(APPLIED, JSON.stringify(applied, null, 1));
  console.log(`updated ${applied.length} of ${matches.length} matches across ${byMuseum.size} museums`);
}

await (process.argv.includes("--apply") ? apply() : dryRun());
