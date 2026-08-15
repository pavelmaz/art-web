// Drive the translate-titles edge function batch-by-batch until the backlog is
// clear. Sequential (each batch marks its rows title_fr, so the next batch skips
// them — no double work). Score-first, so the most-viewed titles localize first.
// The OPENAI_API_KEY never leaves Supabase; this loop only holds the service key
// to invoke the function.
//
// Env: RUN_BATCH (80) RUN_MAX (0 = until done) RUN_URL (override)
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.log("SUPABASE_SERVICE_ROLE_KEY missing"); process.exit(1); }
const URL = process.env.RUN_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/functions/v1/translate-titles`;
const BATCH = Number(process.env.RUN_BATCH || 80);
const MAX = Number(process.env.RUN_MAX || 0);

let total = 0, descFixed = 0, skipped = 0, round = 0, emptyStreak = 0;
console.log(`TITLE BACKFILL START — batch=${BATCH} max=${MAX || "∞"} url=${URL}`);
while (true) {
  round++;
  let r;
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: BATCH }),
      signal: AbortSignal.timeout(180000),
    });
    r = await res.json();
  } catch (e) { console.log(`round ${round}: fetch error ${e.message} — retrying`); await new Promise(x => setTimeout(x, 5000)); continue; }

  if (r.error) { console.log(`round ${round}: fn error ${r.error} — backing off`); await new Promise(x => setTimeout(x, 8000)); continue; }

  total += r.translated || 0; descFixed += r.descFixed || 0; skipped += r.skipped || 0;
  if ((r.translated || 0) === 0) { emptyStreak++; } else { emptyStreak = 0; }
  if (round % 5 === 0 || (r.translated || 0) === 0) {
    console.log(`round ${round}: +${r.translated || 0} (total ${total}, descFixed ${descFixed}, skipped ${skipped})` + (r.sample?.[0] ? `  e.g. ${r.sample[0]}` : ""));
  }
  if (!r.more || emptyStreak >= 2) { console.log("backlog clear"); break; }
  if (MAX && total >= MAX) { console.log(`hit RUN_MAX ${MAX}`); break; }
}
console.log(`\nTITLE BACKFILL DONE — translated=${total} descFixed=${descFixed} skipped=${skipped} rounds=${round}`);
