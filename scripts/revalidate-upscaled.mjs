// Bust the 24h ISR cache for every upscaled artwork page so the new size/image show.
// Needs IMPORT_API_KEY (same key the import pipeline uses) in the environment.
// Usage: node --env-file=.env.local scripts/revalidate-upscaled.mjs [en|all]
import { createClient } from "@supabase/supabase-js";

const KEY = process.env.IMPORT_API_KEY;
if (!KEY) { console.log("Set IMPORT_API_KEY in .env.local first (copy it from Vercel → Settings → Environment Variables)."); process.exit(1); }
const BASE = process.env.SITE_BASE || "https://fineartfree.com";
const MODE = (process.argv[2] || "en").toLowerCase();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// detail path per locale (es/pt use /obras; others /<loc>/artworks; en is bare)
const paths = (slug) => MODE === "all" ? [
  `/artworks/${slug}`, `/es/obras/${slug}`, `/pt/obras/${slug}`,
  `/de/artworks/${slug}`, `/fr/artworks/${slug}`, `/it/artworks/${slug}`,
  `/ja/artworks/${slug}`, `/ko/artworks/${slug}`, `/ru/artworks/${slug}`, `/zh/artworks/${slug}`,
] : [`/artworks/${slug}`];

const { data, error } = await supabase.from("artworks").select("slug")
  .is("object_type", null).not("upscaled_at", "is", null);
if (error) throw error;
console.log(`revalidating ${data.length} works × ${MODE === "all" ? 10 : 1} locales…`);

const jobs = data.flatMap((r) => paths(r.slug));
let ok = 0, fail = 0;
const CONC = 8;
async function hit(path) {
  try {
    const r = await fetch(`${BASE}/api/revalidate`, { method: "POST", headers: { "x-api-key": KEY, "content-type": "application/json" }, body: JSON.stringify({ path }), signal: AbortSignal.timeout(20000) });
    if (r.ok) ok++; else fail++;
  } catch { fail++; }
}
for (let i = 0; i < jobs.length; i += CONC) await Promise.all(jobs.slice(i, i + CONC).map(hit));
console.log(`done — ok=${ok} fail=${fail}`);
