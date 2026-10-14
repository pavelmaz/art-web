// Artist and museum names in the site's languages, from Wikidata labels + aliases
// (no AI). Feeds public.artist_names_i18n / public.museum_names_i18n, which the
// multilingual search index reads (a Japanese visitor typing ゴッホ finds Van Gogh).
//
// Matching is deliberately strict — a wrong artist would put wrong names in search:
//   artists: candidate must be a human with an artist occupation; if we know the
//            birth year it must agree (±1); otherwise the English label must equal
//            our name exactly. Ambiguous → skipped and logged.
//   museums: candidate must be an institution/building whose description mentions
//            museum/gallery/collection/palace/cathedral/church/foundation/library.
//
// Run: node --env-file=.env.local scripts/wikidata-names-i18n.mjs artists [--min-works N] [--refresh]
//      node --env-file=.env.local scripts/wikidata-names-i18n.mjs museums [--refresh]
const BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!BASE || !KEY) throw new Error("Missing Supabase env");
const DB = { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "application/json" };
const UA = { "User-Agent": "FineArtFree-names/1.0 (https://fineartfree.com; pavelmaz@ucm.es)" };
const mode = process.argv[2] || "artists";
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REFRESH = process.argv.includes("--refresh");
const MIN_WORKS = Number(arg("--min-works") || 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wikidata language codes → site language. Chinese variants all feed "zh".
const LANGS = { en: "en", ja: "ja", ko: "ko", ru: "ru", es: "es", pt: "pt", "pt-br": "pt", fr: "fr", de: "de", it: "it",
  zh: "zh", "zh-hans": "zh", "zh-hant": "zh", "zh-cn": "zh", "zh-tw": "zh", "zh-hk": "zh" };
const WD_LANGS = Object.keys(LANGS).join("|");

// Occupations (P106) that make a Wikidata human one of "our" artists.
const ARTIST_OCC = new Set(["Q1028181", "Q483501", "Q329439", "Q1281618", "Q644687", "Q15296811", "Q33231", "Q42973",
  "Q3391743", "Q1925963", "Q10732476", "Q18074503", "Q2526255", "Q1114448", "Q5322166", "Q627325", "Q245068", "Q3658608",
  "Q2309784", "Q4164507", "Q21550646", "Q1667921", "Q11569986", "Q15214752", "Q3621491"]);
// painter, artist, engraver, sculptor, illustrator, draughtsperson, photographer, architect, visual artist,
// graphic artist, printmaker, installation artist, film director(no)…  — description check backs this up.
const ARTIST_DESC = /(painter|artist|engraver|etcher|printmaker|draughts|draftsman|illustrator|sculptor|photographer|architect|designer|lithograph|cartoon|woodcut|ukiyo|calligrapher|miniaturist)/i;
const MUSEUM_DESC = /(museum|gallery|galerie|collection|palace|cathedral|church|basilica|abbey|foundation|library|institute|castle|chapel|kunsthalle|pinakothek)/i;

async function getJson(url, tries = 5) {
  for (let t = 1; ; t++) {
    try {
      const r = await fetch(url, { headers: { ...UA, Accept: "application/json" } });
      if (r.ok) return r.json();
      if (t >= tries || ![429, 500, 502, 503, 504].includes(r.status)) throw new Error(`${r.status}`);
    } catch (e) { if (t >= tries) throw e; }
    await sleep(1500 * t);
  }
}
async function dbAll(path) {
  let out = [];
  for (let o = 0; ; o += 1000) {
    const r = await fetch(`${BASE}/rest/v1/${path}${path.includes("?") ? "&" : "?"}offset=${o}&limit=1000`, { headers: DB });
    if (!r.ok) throw new Error(`db ${r.status} ${await r.text()}`);
    const j = await r.json(); out = out.concat(j); if (j.length < 1000) return out;
  }
}
async function dbUpsert(table, rows, conflict) {
  for (let i = 0; i < rows.length; i += 500) {
    const r = await fetch(`${BASE}/rest/v1/${table}?on_conflict=${conflict}`, { method: "POST",
      headers: { ...DB, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows.slice(i, i + 500)) });
    if (!r.ok) throw new Error(`upsert ${table} ${r.status} ${await r.text()}`);
  }
}
const fold = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const year = (claims, p) => { const t = claims?.[p]?.[0]?.mainsnak?.datavalue?.value?.time; return t ? parseInt(t.slice(1, 5), 10) * (t[0] === "-" ? -1 : 1) : null; };
const ids = (claims, p) => (claims?.[p] || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);

/** All labels + aliases of an entity, as {lang, name, kind} rows mapped to site languages. */
function namesOf(e) {
  const out = new Map();
  for (const [wl, sl] of Object.entries(LANGS)) {
    const lab = e.labels?.[wl]?.value; if (lab) out.set(`${sl}\u0000${lab}`, { lang: sl, name: lab, kind: "label" });
    for (const a of e.aliases?.[wl] || []) if (a.value && !out.has(`${sl}\u0000${a.value}`)) out.set(`${sl}\u0000${a.value}`, { lang: sl, name: a.value, kind: "alias" });
  }
  // Drop junk: very long strings, pure numbers, single Latin letters.
  return [...out.values()].filter((n) => n.name.length <= 80 && n.name.length >= 2 && !/^\d+$/.test(n.name));
}

async function candidates(name, limit = 8) {
  const s = await getJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&uselang=en&type=item&limit=${limit}&format=json`);
  return s.search || [];
}
async function entities(qids) {
  if (!qids.length) return {};
  const j = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join("|")}&props=claims|labels|aliases|descriptions&languages=${WD_LANGS}&format=json`);
  return j.entities || {};
}

// ---------------------------------------------------------------- artists
async function runArtists() {
  let artists = await dbAll(`artists?select=slug,name,birth_year,death_year,artwork_count,wikidata_qid&artwork_count=gte.${MIN_WORKS}&order=artwork_count.desc`);
  if (!REFRESH) artists = artists.filter((a) => !a.wikidata_qid);
  console.log(`${artists.length} artists to resolve (min works ${MIN_WORKS})`);
  let matched = 0, skipped = 0, n = 0;
  const log = [];
  // Big painter entries are slow to fetch; a few workers in parallel keep the
  // rate polite (~5 req/s) while finishing in ~1 h instead of ~9.
  const WORKERS = Number(arg("--workers") || 5);
  const queue = [...artists];
  const one = async (a) => {
    n++;
    try {
      const cands = (await candidates(a.name, 6)).filter((c) => c.id);
      const ents = await entities(cands.map((c) => c.id));
      let best = null;
      for (const c of cands) {
        const e = ents[c.id]; if (!e?.claims) continue;
        const human = ids(e.claims, "P31").includes("Q5");
        const occ = ids(e.claims, "P106");
        const desc = e.descriptions?.en?.value || c.description || "";
        const isArtist = occ.some((o) => ARTIST_OCC.has(o)) || ARTIST_DESC.test(desc);
        if (!human || !isArtist) continue;
        const b = year(e.claims, "P569"), d = year(e.claims, "P570");
        const labelEq = fold(e.labels?.en?.value) === fold(a.name) || (e.aliases?.en || []).some((x) => fold(x.value) === fold(a.name));
        let score = 0;
        const birthOk = a.birth_year && b && Math.abs(a.birth_year - b) <= 1;
        if (a.birth_year && b) { if (birthOk) score += 3; else if (Math.abs(a.birth_year - b) > 3) continue; }
        // Death dates disagree surprisingly often (Wikidata or our data); only decisive when the birth can't vouch.
        if (a.death_year && d) { if (Math.abs(a.death_year - d) <= 1) score += 2; else if (!birthOk && Math.abs(a.death_year - d) > 3) continue; }
        if (labelEq) score += 2;
        // Without any year on our side, demand the exact name.
        if (!a.birth_year && !a.death_year && !labelEq) continue;
        if (!best || score > best.score) best = { e, score, qid: c.id };
      }
      if (!best || best.score < 2) { skipped++; log.push(`SKIP ${a.slug} (${a.name}, ${a.birth_year ?? "?"}–${a.death_year ?? "?"}) cands=${cands.length}`); return; }
      const rows = namesOf(best.e).map((r) => ({ artist_slug: a.slug, ...r }));
      await dbUpsert("artist_names_i18n", rows, "artist_slug,lang,name");
      await fetch(`${BASE}/rest/v1/artists?slug=eq.${encodeURIComponent(a.slug)}`, { method: "PATCH", headers: { ...DB, Prefer: "return=minimal" }, body: JSON.stringify({ wikidata_qid: best.qid }) });
      matched++;
      if (n % 100 === 0) console.log(`${n}/${artists.length} matched=${matched} skipped=${skipped}`);
    } catch (e) { skipped++; log.push(`ERR ${a.slug}: ${e.message}`); }
  };
  await Promise.all(Array.from({ length: WORKERS }, async () => { while (queue.length) await one(queue.shift()); }));
  console.log(`done: matched ${matched}, skipped ${skipped}`);
  const fs = await import("node:fs");
  fs.writeFileSync("scripts/data/wikidata-names-skipped.log", log.join("\n"));
  console.log("skips logged to scripts/data/wikidata-names-skipped.log");
}

// ---------------------------------------------------------------- museums
async function runMuseums() {
  // Distinct museum values via the hubs view when present; fall back to a grouped select.
  const { data } = await (await fetch(`${BASE}/rest/v1/rpc/sitemap_facets_core`, { method: "POST", headers: DB, body: "{}" })).json().then((j) => ({ data: j })).catch(() => ({ data: null }));
  let museums = data?.museums || [];
  if (!museums.length) museums = (await dbAll("artworks?select=museum&museum=not.is.null&limit=1000")).map((r) => r.museum);
  museums = [...new Set(museums.map((m) => (m || "").trim()).filter((m) => m && m.toLowerCase() !== "private collection"))];
  if (!REFRESH) {
    const done = new Set((await dbAll("museum_names_i18n?select=museum")).map((r) => r.museum));
    museums = museums.filter((m) => !done.has(m));
  }
  console.log(`${museums.length} museums to resolve`);
  let matched = 0; const log = [];
  for (const m of museums) {
    try {
      const cands = (await candidates(m, 6)).filter((c) => c.id);
      const ents = await entities(cands.map((c) => c.id));
      let best = null;
      for (const c of cands) {
        const e = ents[c.id]; if (!e?.claims) continue;
        const desc = e.descriptions?.en?.value || c.description || "";
        if (ids(e.claims, "P31").includes("Q5") || !MUSEUM_DESC.test(desc)) continue;
        const labelEq = fold(e.labels?.en?.value) === fold(m) || (e.aliases?.en || []).some((x) => fold(x.value) === fold(m));
        const score = (labelEq ? 2 : 0) + (cands.indexOf(c) === 0 ? 1 : 0);
        if (!best || score > best.score) best = { e, score, qid: c.id };
      }
      if (!best || best.score < 1) { log.push(`SKIP ${m}`); continue; }
      const rows = namesOf(best.e).map((r) => ({ museum: m, lang: r.lang, name: r.name, qid: best.qid }));
      await dbUpsert("museum_names_i18n", rows, "museum,lang,name");
      matched++;
    } catch (e) { log.push(`ERR ${m}: ${e.message}`); }
    await sleep(250);
  }
  console.log(`done: matched ${matched}/${museums.length}`);
  const fs = await import("node:fs");
  fs.writeFileSync("scripts/data/wikidata-museums-skipped.log", log.join("\n"));
}

// Manual overrides for museums the search can't resolve: --fix "Tate=Q430682,National Galleries Scotland=Q2051997"
async function runMuseumFixes(spec) {
  const pairs = spec.split(",").map((x) => x.split("=").map((y) => y.trim())).filter((x) => x.length === 2);
  const ents = await entities(pairs.map((p) => p[1]));
  for (const [museum, qid] of pairs) {
    const e = ents[qid]; if (!e) { console.log(`no entity ${qid} for ${museum}`); continue; }
    const rows = namesOf(e).map((r) => ({ museum, lang: r.lang, name: r.name, qid }));
    await dbUpsert("museum_names_i18n", rows, "museum,lang,name");
    console.log(`${museum} ← ${qid}: ${rows.length} names (${e.labels?.en?.value})`);
  }
}

if (mode === "museums" && arg("--fix")) await runMuseumFixes(arg("--fix"));
else if (mode === "museums") await runMuseums(); else await runArtists();
