// Drives the enrich-artworks + translate-titles edge functions in a loop until
// the global queue (works with description IS NULL / missing translated titles)
// is drained. Both functions process a small batch per call and report how many
// remain. Reusable after any bulk import.
//
// Run: node --env-file=.env.local scripts/run-enrich.mjs [enrich|titles|both] [maxCalls]
const BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!BASE || !KEY) throw new Error("Missing Supabase env");
const which = process.argv[2] || "both";
const MAX = Number(process.argv[3] || 400);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(fn) {
  const r = await fetch(`${BASE}/functions/v1/${fn}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t); } catch {}
  return { status: r.status, j, t };
}

async function drain(fn) {
  let zero = 0, empties = 0;
  for (let i = 0; i < MAX; i++) {
    const { status, j, t } = await call(fn);
    const processed = j.processed ?? j.updated ?? j.count ?? j.done ?? j.success ?? j.translated ?? null;
    const remaining = j.remaining ?? j.queued ?? null;
    console.log(`[${fn} #${i + 1}] status=${status} processed=${processed} remaining=${remaining} ${remaining == null ? t.slice(0, 120) : ""}`);
    if (status !== 200) { await sleep(1500); continue; }
    // translate-titles signals completion with more:false
    if (j.more === false) { console.log(`${fn}: DONE (more:false)`); return; }
    // enrich-artworks signals completion with remaining:0
    if (remaining === 0) { console.log(`${fn}: DONE (remaining 0)`); return; }
    if ((processed === 0 || processed == null) && remaining == null && j.more === undefined) {
      if (++empties >= 3) { console.log(`${fn}: stopping (3 empty/unknown batches)`); return; }
    } else empties = 0;
    if (processed === 0) { if (++zero >= 3) { console.log(`${fn}: stopping (3 zero batches)`); return; } } else zero = 0;
    await sleep(700);
  }
  console.log(`${fn}: hit MAX ${MAX} calls`);
}

// Repetition report: openings shared by 3+ descriptions written in the last 7
// days, and works the enricher refused to publish (artworks.description_rejects).
async function repetitionReport() {
  const headers = { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "application/json" };
  const r = await fetch(`${BASE}/rest/v1/rpc/desc_opening_recent_repeats`, { method: "POST", headers, body: "{}" });
  const rows = r.ok ? await r.json() : [];
  console.log(rows.length
    ? `⚠ repeated openings (last 7 days):\n${rows.map((x) => `  ${x.works}× "${x.w3}…" (${x.catalogue_total} in catalogue)`).join("\n")}`
    : "repeated openings (last 7 days): none");
  const f = await fetch(`${BASE}/rest/v1/artworks?select=id&description_rejects=not.is.null&limit=1`, { method: "HEAD", headers: { ...headers, Prefer: "count=exact" } });
  console.log(`works flagged by the description guard: ${f.headers.get("content-range")?.split("/")[1] ?? "?"}`);
}

if (which === "enrich" || which === "both") await drain("enrich-artworks");
if (which === "titles" || which === "both") await drain("translate-titles");
if (which === "enrich" || which === "both") await repetitionReport();
console.log("run-enrich complete");
