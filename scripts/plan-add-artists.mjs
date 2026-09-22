#!/usr/bin/env node
/**
 * Add curated artists to the Wikidata import plan (_wiki_import_plan) so the
 * daily plan batch has a deeper, demand-led backlog.
 *
 * For each name: Wikidata search → first hit with an art occupation and a
 * public-domain-safe death year (≤ 1955, or unknown but born before 1850) →
 * sitelinks (fame proxy), works with images (P170 + P18) and the Commons
 * creator category (P373). Skips names already in the plan (by qid) or already
 * in the catalogue with decent coverage. priority = sitelinks × ln(1 + missing
 * works), the same scale the July plan used (Van Gogh ≈ 1670).
 *
 * Run: node --env-file=.env.local scripts/plan-add-artists.mjs --file=scripts/plan-candidates.txt [--apply]
 */
import { readFileSync } from "node:fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error("Missing Supabase env"); process.exit(1); }
const args = process.argv.slice(2);
const FILE = (args.find((a) => a.startsWith("--file=")) || "--file=scripts/plan-candidates.txt").slice(7);
const APPLY = args.includes("--apply");
const UA = "FineArtFree/1.0 (https://fineartfree.com; plan-add-artists)";
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// painter, illustrator, printmaker, engraver, graphic artist, drawer, artist,
// ukiyo-e artist, visual artist, botanical illustrator, poster artist, lithographer, caricaturist
const ART_OCC = new Set(["Q1028181","Q644687","Q11569986","Q329439","Q1925963","Q15296811","Q483501","Q1281618","Q3391743","Q3149253","Q1114448","Q16947657","Q1114448"]);
const PD_DEATH_MAX = 1955;

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function wd(params) {
  const u = `https://www.wikidata.org/w/api.php?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  const r = await fetch(u, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`wikidata ${r.status}`);
  return r.json();
}
function claimYear(ent, prop) {
  const t = ent?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.time;
  return t ? Number(t.slice(1, 5)) : null;
}
async function resolve(name) {
  const s = await wd({ action: "wbsearchentities", search: name, language: "en", type: "item", limit: "6" });
  const ids = (s.search ?? []).map((h) => h.id);
  if (!ids.length) return { error: "no wikidata hit" };
  const e = await wd({ action: "wbgetentities", ids: ids.join("|"), props: "claims|sitelinks|labels", languages: "en" });
  for (const id of ids) {
    const ent = e.entities?.[id];
    const occ = (ent?.claims?.P106 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id);
    if (!occ.some((o) => ART_OCC.has(o))) continue;
    const death = claimYear(ent, "P570"), birth = claimYear(ent, "P569");
    if (death && death > PD_DEATH_MAX) return { error: `died ${death} (not PD-safe)`, qid: id };
    if (!death && (!birth || birth >= 1850)) return { error: "death year unknown, not PD-safe", qid: id };
    return {
      qid: id, label: ent.labels?.en?.value ?? name, death, birth,
      sitelinks: Object.keys(ent.sitelinks ?? {}).filter((k) => k.endsWith("wiki") && !k.includes("commons")).length,
      commonsCat: ent.claims?.P373?.[0]?.mainsnak?.datavalue?.value ?? null,
    };
  }
  return { error: "no hit with an art occupation" };
}
async function worksWithImages(qids) {
  const out = new Map(qids.map((q) => [q, 0]));
  for (let i = 0; i < qids.length; i += 40) {
    const chunk = qids.slice(i, i + 40);
    const q = `SELECT ?a (COUNT(DISTINCT ?item) AS ?n) WHERE { VALUES ?a { ${chunk.map((x) => `wd:${x}`).join(" ")} } ?item wdt:P170 ?a; wdt:P18 ?img. } GROUP BY ?a`;
    const r = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}&format=json`, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
    if (!r.ok) { console.error("SPARQL", r.status); continue; }
    for (const b of (await r.json()).results.bindings) out.set(b.a.value.split("/").pop(), Number(b.n.value));
    await sleep(500);
  }
  return out;
}

const names = readFileSync(FILE, "utf-8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
console.log(`${names.length} candidate name(s) from ${FILE}\n`);

// PostgREST caps a response at 1,000 rows — page with Range headers.
async function fetchAll(path) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    if (!r.ok && r.status !== 416) throw new Error(`${path}: ${r.status}`);
    const rows = r.status === 416 ? [] : await r.json();
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
// What we already have
const plan = await fetchAll("_wiki_import_plan?select=qid,name,db_artist,db_works,wd_works&order=qid");
const planByQid = new Map(plan.map((p) => [p.qid, p]));
const planByName = new Map(plan.map((p) => [norm(p.name), p]));
const artists = new Map((await fetchAll("artists?select=name,artwork_count&order=slug")).map((a) => [norm(a.name), a]));
console.log(`plan rows: ${plan.length}, catalogue artists: ${artists.size}`);

const resolved = [];
for (const name of names) {
  try {
    const r = await resolve(name);
    if (r.error) { console.log(`  – ${name}: ${r.error}`); continue; }
    resolved.push({ input: name, ...r });
  } catch (e) { console.log(`  – ${name}: ${e.message}`); }
  await sleep(200);
}
const works = await worksWithImages(resolved.map((r) => r.qid));

const rows = [];
for (const r of resolved) {
  const wdWorks = works.get(r.qid) ?? 0;
  const have = artists.get(norm(r.label)) ?? artists.get(norm(r.input));
  const dbWorks = have?.artwork_count ?? 0;
  const inPlan = planByQid.get(r.qid) ?? planByName.get(norm(r.label));
  const missing = Math.max(0, wdWorks - dbWorks);
  const status = inPlan ? "already in plan" : have && dbWorks >= Math.max(10, wdWorks * 0.5) ? `in catalogue (${dbWorks} works)` : "ADD";
  rows.push({ ...r, wdWorks, dbWorks, missing, status, priority: Math.round(r.sitelinks * Math.log1p(missing || wdWorks || 1) * 100) / 100 });
}
rows.sort((a, b) => b.priority - a.priority);
console.log("\n   prio  langs  wd  have  status                      name");
for (const r of rows) console.log(`${String(r.priority).padStart(7)}  ${String(r.sitelinks).padStart(5)}  ${String(r.wdWorks).padStart(3)}  ${String(r.dbWorks).padStart(4)}  ${r.status.padEnd(26)} ${r.label}${r.commonsCat ? "" : "  (no Commons category)"}`);
const toAdd = rows.filter((r) => r.status === "ADD");
console.log(`\n${toAdd.length} to add, ${rows.length - toAdd.length} already covered.`);

if (APPLY && toAdd.length) {
  const body = toAdd.map((r) => ({
    qid: r.qid, name: r.label, death_year: r.death, wd_works: r.wdWorks, sitelinks: r.sitelinks,
    db_artist: artists.has(norm(r.label)) ? artists.get(norm(r.label)).name : null, db_works: r.dbWorks,
    match_type: artists.has(norm(r.label)) ? "exact" : null, status: "planned", priority: r.priority,
    notes: `curated 2026-09-22${r.commonsCat ? ` · commons: ${r.commonsCat}` : ""}`,
  }));
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/_wiki_import_plan`, { method: "POST", headers: { ...H, Prefer: "return=minimal,resolution=ignore-duplicates" }, body: JSON.stringify(body) });
  console.log(ins.ok ? `Inserted ${body.length} plan row(s).` : `Insert failed: ${ins.status} ${await ins.text()}`);
} else if (toAdd.length) {
  console.log("Dry run — pass --apply to insert.");
}
