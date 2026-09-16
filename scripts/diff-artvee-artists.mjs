#!/usr/bin/env node
/**
 * Diffs imports/artvee/artvee-artists.json against the artists table: which
 * Artvee artists do we not have yet? Name-normalized match (accents/case/
 * punctuation-insensitive) to avoid false "new" hits on spelling variants.
 *
 * Self-terminating catch-up: this diff is recomputed fresh every run, so an
 * artist imported today just stops showing up as "missing" tomorrow — no
 * separate cursor/queue file needed, unlike the A→Z drip.
 *
 * Run: node --env-file=.env.local scripts/diff-artvee-artists.mjs
 *   --batch-size=N --batch-file=path   also writes the top-N "confidently new"
 *                                       names (by Artvee item count) as
 *                                       "wd:Name" lines, ready for
 *                                       `import-wikipedia.mjs --from-file=`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const batchSizeArg = args.find((a) => a.startsWith("--batch-size="));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split("=")[1], 10) : 0;
const batchFileArg = args.find((a) => a.startsWith("--batch-file="));
const BATCH_FILE = batchFileArg ? batchFileArg.slice("--batch-file=".length) : null;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

/** Strips a trailing "(Domenikos Theotokopoulos)"-style gloss before comparing —
 *  Artvee's directory sometimes appends the artist's birth name in parens. */
function stripParen(name) {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function norm(name) {
  return stripParen(name)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Last whitespace-separated token — a cheap surname proxy for the fuzzy pass. */
function surname(normName) {
  const parts = normName.split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

async function allArtistNames() {
  const names = new Set();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from("artists").select("name").range(from, from + 999);
    if (error) throw error;
    if (!data.length) break;
    for (const { name } of data) names.add(norm(name));
    if (data.length < 1000) break;
    from += 1000;
  }
  return names;
}

async function run() {
  const artvee = JSON.parse(readFileSync("imports/artvee/artvee-artists.json", "utf-8"));
  const existing = await allArtistNames();
  const existingSurnames = new Set([...existing].map(surname).filter((s) => s.length > 2));
  console.log(`FAF artists: ${existing.size}. Artvee artists: ${artvee.length}.`);

  const notExact = artvee.filter((a) => !existing.has(norm(a.name)));
  // Split the exact-match misses into "no similar surname at all" (confidently
  // new) vs. "shares a surname with an existing artist" (likely a naming variant
  // like "Jacopo Tintoretto" vs "Tintoretto" — needs a human glance, not an
  // auto-import that would fork a duplicate artist page).
  const missing = [], reviewVariants = [];
  for (const a of notExact) {
    (existingSurnames.has(surname(norm(a.name))) ? reviewVariants : missing).push(a);
  }
  console.log(
    `Matched: ${artvee.length - notExact.length}. ` +
    `Confidently new: ${missing.length}. Possible naming variants (review): ${reviewVariants.length}.`
  );

  missing.sort((a, b) => (b.items ?? 0) - (a.items ?? 0));
  reviewVariants.sort((a, b) => (b.items ?? 0) - (a.items ?? 0));
  writeFileSync("imports/artvee/artvee-artists-missing.json", JSON.stringify(missing, null, 2));
  writeFileSync("imports/artvee/artvee-artists-review.json", JSON.stringify(reviewVariants, null, 2));
  console.log(`Saved -> imports/artvee/artvee-artists-missing.json (${missing.length})`);
  console.log(`Saved -> imports/artvee/artvee-artists-review.json (${reviewVariants.length})`);

  console.log(`\nConfidently new, top 30 by Artvee item count:`);
  for (const a of missing.slice(0, 30)) {
    console.log(`  ${String(a.items ?? "?").padStart(4)} items  ${a.name}  (${a.nationality ?? "?"})`);
  }
  console.log(`\nPossible variants (needs a human glance):`);
  for (const a of reviewVariants) {
    console.log(`  ${a.name}  (${a.nationality ?? "?"})`);
  }

  if (BATCH_SIZE > 0 && BATCH_FILE) {
    const batch = missing.slice(0, BATCH_SIZE);
    writeFileSync(BATCH_FILE, batch.map((a) => `wd:${a.name}`).join("\n") + (batch.length ? "\n" : ""));
    console.log(`\nBatch file (${batch.length} artist(s)) -> ${BATCH_FILE}`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
