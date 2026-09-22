#!/usr/bin/env node
/**
 * Next batch of artists from the Wikidata import plan (_wiki_import_plan),
 * highest priority first, as "wd:Name" lines for `import-wikipedia.mjs --from-file=`.
 *
 * Replaces "whoever is next in the alphabet" with demand: famous painters we do
 * not have at all, then famous painters we have less than half of (22 Sep 2026;
 * 365 and 457 of them respectively at the time). Rows are stamped imported_at
 * when handed out so they are not re-queued for 60 days, whatever the importer
 * managed to find.
 *
 * Run: node --env-file=.env.local scripts/plan-next-batch.mjs --batch-size=6 --batch-file=/tmp/plan-batch.txt
 */
import { writeFileSync } from "node:fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY"); process.exit(1); }

const args = process.argv.slice(2);
const num = (flag, dflt) => { const a = args.find((x) => x.startsWith(`--${flag}=`)); return a ? Number(a.split("=")[1]) : dflt; };
const str = (flag, dflt) => { const a = args.find((x) => x.startsWith(`--${flag}=`)); return a ? a.slice(flag.length + 3) : dflt; };
const BATCH_SIZE = num("batch-size", 6);
const MIN_WD_WORKS = num("min-works", 5);
const BATCH_FILE = str("batch-file", "/tmp/plan-batch.txt");
const DRY = args.includes("--dry");

const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

// Not attempted in the last 60 days; enough known works to be worth a run;
// either missing from the catalogue or less than half covered.
const since = new Date(Date.now() - 60 * 864e5).toISOString();
const url = `${SUPABASE_URL}/rest/v1/_wiki_import_plan?select=qid,name,wd_works,db_works,db_artist,sitelinks,priority` +
  `&status=eq.planned&wd_works=gte.${MIN_WD_WORKS}&or=(imported_at.is.null,imported_at.lt.${since})` +
  `&order=priority.desc.nullslast&limit=${BATCH_SIZE * 4}`;
const res = await fetch(url, { headers: H });
if (!res.ok) { console.error("plan query failed:", res.status, await res.text()); process.exit(1); }
const rows = await res.json();

// The plan's db_works dates from July; use the live catalogue count instead.
const names = rows.filter((r) => r.db_artist).map((r) => r.db_artist);
if (names.length) {
  const q = names.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(",");
  const live = await fetch(`${SUPABASE_URL}/rest/v1/artists?select=name,artwork_count&name=in.(${encodeURIComponent(q)})`, { headers: H });
  if (live.ok) {
    const byName = new Map((await live.json()).map((a) => [a.name, a.artwork_count ?? 0]));
    for (const r of rows) if (r.db_artist && byName.has(r.db_artist)) r.db_works = byName.get(r.db_artist);
  }
}

const batch = [];
for (const r of rows) {
  const missing = r.db_artist == null;
  const halfMissing = !missing && (r.db_works ?? 0) < (r.wd_works ?? 0) * 0.5;
  if (!missing && !halfMissing) continue;
  batch.push({ ...r, why: missing ? "not in catalogue" : `only ${r.db_works}/${r.wd_works} works` });
  if (batch.length >= BATCH_SIZE) break;
}

console.log(`Plan batch (${batch.length} artist(s), priority desc):`);
for (const b of batch) console.log(`  ${String(b.priority ?? 0).padStart(8)}  ${b.name}  (${b.sitelinks} langs, ${b.wd_works} works) — ${b.why}`);
writeFileSync(BATCH_FILE, batch.map((b) => `wd:${b.name}`).join("\n") + (batch.length ? "\n" : ""));
console.log(`Batch file -> ${BATCH_FILE}`);

if (!DRY && batch.length) {
  const qids = batch.map((b) => `"${b.qid}"`).join(",");
  const upd = await fetch(`${SUPABASE_URL}/rest/v1/_wiki_import_plan?qid=in.(${qids})`, {
    method: "PATCH", headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ imported_at: new Date().toISOString(), notes: "queued by plan-next-batch" }),
  });
  if (!upd.ok) console.error("could not stamp imported_at:", upd.status, await upd.text());
}
