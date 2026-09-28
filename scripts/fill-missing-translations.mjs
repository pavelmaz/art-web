#!/usr/bin/env node
/**
 * Fill in missing translations of text that already exists in English, by driving
 * the translate-missing edge function (the OpenAI key stays in Supabase):
 *   descriptions — artworks with a description but a missing description_<lang>
 *   bios         — artists with a bio but a missing bio_<lang>
 * Pure translation: never touches the English text or an existing translation.
 * Resumable — it only ever lists rows that still miss a language.
 *
 * Run: node --env-file=.env.local scripts/fill-missing-translations.mjs [descriptions|bios|both] [--limit=N] [--workers=3] [--dry]
 */
const BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!BASE || !KEY) { console.error("missing Supabase env"); process.exit(1); }

const arg = (name, fallback) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=")[1] || fallback;
const which = ["descriptions", "bios", "both"].includes(process.argv[2]) ? process.argv[2] : "both";
const LIMIT = Number(arg("limit", 0));
const WORKERS = Math.min(Number(arg("workers", 3)), 6);
const DRY = process.argv.includes("--dry");
const BATCH = 8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const KINDS = {
  descriptions: {
    table: "artworks", src: "description",
    cols: ["description_sp", "description_pt", "description_fr", "description_ger", "description_it", "description_ch", "description_jp", "description_ko", "description_ru"],
  },
  bios: {
    table: "artists", src: "bio",
    cols: ["bio_es", "bio_pt", "bio_fr", "bio_de", "bio_it", "bio_zh", "bio_ja", "bio_ko", "bio_ru"],
  },
};

/** Ids of rows that have English text but miss at least one language. Keyset-paged
 *  in small pages: the rows are sparse, so one big page outlasts the statement timeout. */
async function listTodo(kind) {
  const { table, src, cols } = KINDS[kind];
  const PAGE = 250;
  const ids = [];
  let after = null;
  for (;;) {
    const q = new URLSearchParams({ select: "id", order: "id.asc", limit: String(PAGE) });
    q.append(src, "not.is.null");
    q.append(src, "neq."); // an empty description is a deliberate "no text" (prints, book plates)
    q.append("or", `(${cols.map((c) => `${c}.is.null`).join(",")})`);
    if (after !== null) q.append("id", `gt.${after}`);
    let page = null;
    for (let attempt = 1; attempt <= 5 && !page; attempt++) {
      try {
        const res = await fetch(`${BASE}/rest/v1/${table}?${q}`, { headers: HEADERS, signal: AbortSignal.timeout(60000) });
        const body = await res.json();
        if (Array.isArray(body)) page = body;
        else if (attempt === 5) throw new Error(`list ${table}: ${JSON.stringify(body).slice(0, 200)}`);
      } catch (e) {
        if (attempt === 5) throw e;
      }
      if (!page) await sleep(4000 * attempt);
    }
    ids.push(...page.map((r) => r.id));
    if (LIMIT && ids.length >= LIMIT) return ids.slice(0, LIMIT);
    if (page.length < PAGE) break;
    after = page[page.length - 1].id;
  }
  return ids;
}

async function callBatch(kind, ids) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}/functions/v1/translate-missing`, {
        method: "POST", headers: HEADERS, body: JSON.stringify({ kind, ids }), signal: AbortSignal.timeout(280000),
      });
      const text = await res.text();
      let body = null; try { body = JSON.parse(text); } catch { /* html error page */ }
      if (res.ok && body) return body;
      console.log(`  batch failed (${res.status}) attempt ${attempt}: ${(body?.error || text).toString().replace(/\s+/g, " ").slice(0, 120)}`);
    } catch (e) {
      console.log(`  batch failed attempt ${attempt}: ${e.name} ${e.cause?.code || e.message}`);
    }
    await sleep(5000 * attempt);
  }
  return null;
}

async function fill(kind) {
  const todo = await listTodo(kind);
  console.log(`${kind}: ${todo.length} row(s) missing a translation${DRY ? " (dry run)" : ""}`);
  if (DRY || todo.length === 0) return;

  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  let next = 0, rows = 0, complete = 0, fields = 0, failedBatches = 0;
  const partial = [];
  const started = Date.now();

  await Promise.all(Array.from({ length: WORKERS }, async () => {
    while (next < batches.length) {
      const mine = batches[next++];
      const out = await callBatch(kind, mine);
      if (!out) { failedBatches++; continue; }
      rows += out.rows; complete += out.complete; fields += out.fields;
      partial.push(...(out.partial || []));
      for (const e of out.errors || []) console.log(`  ${e}`);
      if (Math.floor(rows / 200) !== Math.floor((rows - out.rows) / 200)) {
        const mins = Math.round((Date.now() - started) / 60000);
        console.log(`  ${kind}: ${rows}/${todo.length} rows, ${fields} translations written, ${mins} min`);
      }
    }
  }));

  console.log(`${kind}: DONE — ${complete}/${rows} rows complete, ${fields} translations written, ${partial.length} partial, ${failedBatches} failed batch(es)`);
  if (partial.length) console.log(`${kind}: still incomplete (re-run to retry): ${partial.slice(0, 20).join(", ")}${partial.length > 20 ? " …" : ""}`);
}

if (which === "descriptions" || which === "both") await fill("descriptions");
if (which === "bios" || which === "both") await fill("bios");
console.log("fill-missing-translations complete");
