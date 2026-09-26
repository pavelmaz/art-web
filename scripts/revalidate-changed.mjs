#!/usr/bin/env node
/**
 * Refresh the cached pages of artworks changed in the last N hours (default 26).
 * Pages are cached for 90 days (26 Sep 2026); this is how enrichment, upscales
 * and edits reach visitors. Relies on artworks.updated_at (trigger-maintained).
 * Run: node --env-file=.env.local scripts/revalidate-changed.mjs [--hours=26]
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.SITE_URL || "https://fineartfree.com", API = process.env.IMPORT_API_KEY;
const hours = Number((process.argv.find((a) => a.startsWith("--hours=")) || "--hours=26").split("=")[1]);
if (!URL_ || !KEY || !API) { console.error("missing env"); process.exit(1); }
const since = new Date(Date.now() - hours * 3600e3).toISOString();
const paths = (slug) => [`/artworks/${slug}`, `/es/obras/${slug}`, `/pt/obras/${slug}`, ...["fr", "de", "it", "ja", "ko", "ru"].map((l) => `/${l}/artworks/${slug}`)];
let slugs = [];
for (let off = 0; ; off += 1000) {
  const res = await fetch(`${URL_}/rest/v1/artworks?select=slug&updated_at=gte.${since}&inserted_at=lt.${since}&order=id.asc&limit=1000&offset=${off}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  const page = await res.json();
  if (!Array.isArray(page)) { console.error("query failed:", JSON.stringify(page).slice(0, 200)); process.exit(1); }
  slugs.push(...page.map((r) => r.slug));
  if (page.length < 1000) break;
}
console.log(`revalidate-changed: ${slugs.length} artwork(s) changed since ${since}`);
let ok = 0, fail = 0;
for (const slug of slugs) {
  for (const path of paths(slug)) {
    try { const r = await fetch(`${SITE}/api/revalidate`, { method: "POST", headers: { "x-api-key": API, "Content-Type": "application/json" }, body: JSON.stringify({ path }), signal: AbortSignal.timeout(20000) }); r.ok ? ok++ : fail++; }
    catch { fail++; }
  }
  await new Promise((r) => setTimeout(r, 50));
}
console.log(`revalidate-changed: ${ok} paths refreshed, ${fail} failed`);
