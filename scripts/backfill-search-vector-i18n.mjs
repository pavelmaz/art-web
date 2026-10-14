// Fills artworks.search_vector_i18n for every row that lacks it, in batches, pausing
// when the database disk grows too fast (the 12 Oct 2026 read-only incident).
// Safe to re-run; stops when nothing is left. To rebuild everything (e.g. after new
// artist names arrive): node … --reset first sets the column to NULL in batches.
//
// Run: node --env-file=.env.local scripts/backfill-search-vector-i18n.mjs [--batch 2000] [--reset]
const BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!BASE || !KEY) throw new Error("Missing Supabase env");
const H = { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "application/json" };
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BATCH = Number(arg("--batch") || 2000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(name, body) {
  const r = await fetch(`${BASE}/rest/v1/rpc/${name}`, { method: "POST", headers: H, body: JSON.stringify(body || {}) });
  if (!r.ok) throw new Error(`${name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

if (process.argv.includes("--reset")) {
  let total = 0;
  for (;;) {
    const n = await rpc("search_vector_i18n_reset", { n: BATCH });
    total += n; if (!n) break;
    process.stdout.write(`\rreset ${total}`);
  }
  console.log(`\nreset done: ${total} rows`);
}

let done = 0, t0 = Date.now(), lastSize = null, batch = BATCH, failures = 0;
for (;;) {
  let n;
  try {
    n = await rpc("search_vector_i18n_backfill", { n: batch });
    failures = 0;
    if (batch < BATCH) batch = Math.min(BATCH, batch + 50); // creep back up after a slow patch
  } catch (e) {
    // A statement timeout just means this batch was too big for the moment
    // (autovacuum, other writers); halve it and carry on.
    if (++failures > 8) throw e;
    batch = Math.max(50, Math.floor(batch / 2));
    console.log(`\n${e.message.slice(0, 80)} → batch ${batch}, retrying in 5 s`);
    await sleep(5000);
    continue;
  }
  done += n;
  if (!n) break;
  const { db_mb, wal_mb } = await rpc("db_size_mb").then((r) => r[0] ?? {}).catch(() => ({})); // size check is best-effort
  const rate = (done / ((Date.now() - t0) / 60000)).toFixed(0);
  process.stdout.write(`\rfilled ${done} (${rate}/min, batch ${batch}) db ${db_mb} MB wal ${wal_mb} MB   `);
  // Let the checkpointer/autovacuum keep up; back off if the disk is growing quickly.
  if (lastSize !== null && db_mb - lastSize > 300) { console.log("\ndisk grew >300 MB since last batch — pausing 60 s"); await sleep(60000); }
  lastSize = db_mb;
  await sleep(500);
}
console.log(`\nbackfill done: ${done} rows in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
