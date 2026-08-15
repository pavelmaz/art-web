// Roll back upscales recorded in upscale-revert.jsonl. The OLD originals were never
// deleted (they still live in Supabase), so this just repoints the row back.
// Usage:
//   node --env-file=.env.local scripts/upscale-revert.mjs ALL
//   node --env-file=.env.local scripts/upscale-revert.mjs the-scream,madame-x-...
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const REVERT = "/Users/pavelm/Desktop/upscale-tool/upscale-revert.jsonl";
const arg = (process.argv[2] || "").trim();
if (!arg) { console.log("pass ALL or a comma-separated slug list"); process.exit(1); }
const wanted = arg === "ALL" ? null : new Set(arg.split(",").map((s) => s.trim()));

const lines = readFileSync(REVERT, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
// last entry per id wins (in case a row was upscaled more than once)
const byId = new Map();
for (const e of lines) byId.set(e.id, e);

let n = 0;
for (const e of byId.values()) {
  if (wanted && !wanted.has(e.slug)) continue;
  const { error } = await supabase.from("artworks").update({
    image_id: e.old_image_id, img_width: e.old_w, img_height: e.old_h, upscaled_at: null,
  }).eq("id", e.id);
  if (error) { console.log(`✗ ${e.slug}: ${error.message}`); continue; }
  n++;
  console.log(`↩ ${e.slug}  ${e.new_w}px -> ${e.old_w}px (restored)`);
}
console.log(`\nreverted ${n} works`);
