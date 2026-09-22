#!/usr/bin/env node
/**
 * Post one summary row per GitHub Actions run to _automation_runs, extracted
 * from the step logs (tee'd to /tmp/*.log). Usage:
 *   node scripts/report-automation-run.mjs <workflow> <job-status> <log files…>
 * Never throws: a reporting problem must not fail the job.
 */
import { existsSync, readFileSync } from "node:fs";

const [workflow, jobStatus, ...logs] = process.argv.slice(2);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const text = logs.filter((f) => existsSync(f)).map((f) => `\n### ${f}\n` + readFileSync(f, "utf-8")).join("\n");
const strip = (t) => t.replace(/\x1b\[[0-9;]*m/g, "");
const T = strip(text);
const num = (re) => { const m = T.match(re); return m ? Number(m[1]) : null; };
const all = (re) => [...T.matchAll(re)].map((m) => (m.length > 1 ? m[1] : m[0]));

const summary = {
  job_status: jobStatus,
  drip: { imported: num(/DRIP result: (\d+) imported/), scanned_artists: num(/scanned (\d+) artist/), next_cursor: (T.match(/resumes after "([^"]+)"/) || [])[1] ?? null },
  plan_batch: {
    artists: all(/^\s*[\d.]+\s{2,}(.+?)\s{2}\(\d+ langs/gm),
    wikidata_works: Object.fromEntries(all(/Wikidata (.+?) \(Q\d+\): (\d+) paintings/g).map((n, i, arr) => [n, null])),
    category_fallbacks: all(/(Category:[^:\n]+?)(?: \(\+ work subcategories\))?: (\d+) file\(s\)/g).length,
    capped: all(/capping (.+?) at/g),
  },
  imports: { done_lines: all(/Done\. Imported: (\d+), skipped: \d+\./g).map(Number), skipped_lines: all(/Done\. Imported: \d+, skipped: (\d+)\./g).map(Number), new_artists: (T.match(/New artists created: (.+)/) || [])[1] ?? null },
  indexnow: { submitted_urls: num(/IndexNow: submitted (\d+) URLs/), disabled: /IndexNow: DISABLED/.test(T) },
  r2: { moved: all(/moved (\d+) to R2/g).map(Number), failed: all(/moved \d+ to R2, (\d+) failed/g).map(Number) },
  enrich: { calls: all(/^enrich #\d+/gm).length, success: all(/"success":(\d+)/g).map(Number).reduce((a, b) => a + b, 0), failed: all(/"failed":(\d+)/g).map(Number).reduce((a, b) => a + b, 0), errors: all(/"errors":\[("[^\]]*)\]/g).slice(0, 5) },
  rescored: num(/rescored: (\d+)/),
  artvee: { total: num(/Artvee artists: (\d+)/), matched: num(/Matched: (\d+)/), new: num(/Confidently new: (\d+)/) },
  reupgrade: { upgraded: num(/REUP COMPLETE upgraded=(\d+)/), skip: num(/skip=(\d+)/), fail: num(/fail=(\d+)/), next_cursor: (T.match(/REUP ARTIST WALK result:.*?resumes after "([^"]+)"/) || [])[1] ?? null },
  errors: all(/^(?:✗|Error:|\[error\]|##\[error\]).{0,160}/gm).slice(0, 12),
};
// Per-artist Wikidata counts for the plan batch
for (const m of T.matchAll(/Wikidata (.+?) \(Q\d+\): (\d+) paintings/g)) summary.plan_batch.wikidata_works[m[1]] = Number(m[2]);

const runId = Number(process.env.GITHUB_RUN_ID || 0) || null;
const row = {
  workflow, run_id: runId,
  run_url: runId ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}` : null,
  ok: jobStatus === "success" && summary.errors.length === 0,
  started_at: process.env.RUN_STARTED_AT || null,
  summary,
};
console.log(JSON.stringify(row, null, 2));
if (!SUPABASE_URL || !KEY) { console.error("report: missing Supabase env"); process.exit(0); }
try {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/_automation_runs`, {
    method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  console.log(r.ok ? "report: stored" : `report: failed ${r.status} ${await r.text()}`);
} catch (e) { console.error("report:", e.message); }
