// Backfill localized artwork titles (title_<locale>) for main-catalogue paintings,
// most-viewed first, via gpt-4.1-mini. Also fixes the English title embedded in the
// already-translated descriptions (cheap string replace, no extra API cost).
//
// Needs OPENAI_API_KEY (copy from Vercel → Settings → Environment Variables).
// Env: TR_LIMIT (default 40) TR_BATCH (40 titles/call) TR_MIN_SCORE (skip below)
//      TR_FIX_DESC (default "1") TR_DRY ("1" = translate + print, no writes)
import { createClient } from "@supabase/supabase-js";

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.log("Set OPENAI_API_KEY in .env.local first."); process.exit(1); }
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const LIMIT = Number(process.env.TR_LIMIT || 40);
const BATCH = Number(process.env.TR_BATCH || 40);
const MIN_SCORE = process.env.TR_MIN_SCORE ? Number(process.env.TR_MIN_SCORE) : null;
const FIX_DESC = (process.env.TR_FIX_DESC ?? "1") === "1";
const DRY = process.env.TR_DRY === "1";

// output key -> { title column, description column }
const LOC = [
  { k: "es", tc: "title_sp", dc: "description_sp" }, { k: "pt", tc: "title_pt", dc: "description_pt" },
  { k: "fr", tc: "title_fr", dc: "description_fr" }, { k: "de", tc: "title_ger", dc: "description_ger" },
  { k: "it", tc: "title_it", dc: "description_it" }, { k: "ja", tc: "title_jp", dc: "description_jp" },
  { k: "ko", tc: "title_ko", dc: "description_ko" }, { k: "ru", tc: "title_ru", dc: "description_ru" },
  { k: "zh", tc: "title_ch", dc: "description_ch" },
];
const SELECT = "id, slug, title, score, " + LOC.map((l) => l.dc).join(", ");

const SYS = "You are an art historian and professional translator. You translate painting titles into other languages using the CONVENTIONAL, established title in each language when one exists (e.g. English 'The Starry Night' -> French 'La Nuit étoilée', not a literal rendering). You NEVER translate proper nouns — personal names, place names, and coined/invented one-word titles stay identical in every language (e.g. 'Guernica' -> 'Guernica', 'Mona Lisa' keeps its established name). Only the descriptive, common-noun parts are translated.";

async function translateBatch(titles) {
  const user = `Translate these ${titles.length} artwork titles into 9 languages: es, pt, fr, de, it, ja, ko, ru, zh.\n`
    + `Return STRICT JSON: {"items":[{"i":<index>,"es":"..","pt":"..","fr":"..","de":"..","it":"..","ja":"..","ko":"..","ru":"..","zh":".."}, ...]} with one object per input index.\n`
    + `Titles:\n` + titles.map((t, i) => `${i}: ${t}`).join("\n");
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4.1-mini", temperature: 0.2, response_format: { type: "json_object" },
          messages: [{ role: "system", content: SYS }, { role: "user", content: user }] }),
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) { if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 3000 * attempt)); continue; } throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`); }
      const j = await res.json();
      return JSON.parse(j.choices[0].message.content).items;
    } catch (e) { if (attempt === 4) throw e; await new Promise(r => setTimeout(r, 2000 * attempt)); }
  }
}

async function nextBatch(n) {
  let q = supabase.from("artworks").select(SELECT)
    .is("object_type", null).is("title_fr", null).not("title", "is", null)
    .order("score", { ascending: false, nullsFirst: false });
  if (MIN_SCORE != null) q = q.gte("score", MIN_SCORE);
  const { data, error } = await q.limit(n);
  if (error) throw error;
  return data || [];
}

console.log(`TRANSLATE TITLES — limit=${LIMIT} batch=${BATCH} fixDesc=${FIX_DESC}${DRY ? " (DRY)" : ""}`);
let done = 0, descFixed = 0, failed = 0;
while (done + failed < LIMIT) {
  const rows = (await nextBatch(Math.min(BATCH, LIMIT - done - failed)));
  if (!rows.length) { console.log("no more untranslated titles"); break; }
  let items;
  try { items = await translateBatch(rows.map((r) => r.title)); }
  catch (e) { console.log(`batch failed: ${e.message}`); failed += rows.length; continue; }
  const byIdx = new Map(items.map((it) => [it.i, it]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], t = byIdx.get(i);
    if (!t) { failed++; console.log(`✗ ${row.slug} (no translation returned)`); continue; }
    const upd = {};
    for (const l of LOC) {
      const val = (t[l.k] || "").trim();
      if (!val) continue;
      upd[l.tc] = val;
      // embedded-title fix: only multi-word English titles, only where they appear verbatim
      if (FIX_DESC && /\s/.test(row.title) && row[l.dc] && row[l.dc].includes(row.title)) {
        upd[l.dc] = row[l.dc].split(row.title).join(val);
        descFixed++;
      }
    }
    if (DRY) { console.log(`  ${row.slug}: ${row.title} -> fr:${t.fr} | ja:${t.ja} | ru:${t.ru}`); done++; continue; }
    const { error } = await supabase.from("artworks").update(upd).eq("id", row.id);
    if (error) { failed++; console.log(`✗ ${row.slug}: ${error.message}`); }
    else { done++; if (done % 40 === 0) console.log(`  …${done} titles translated`); }
  }
}
console.log(`\nTRANSLATE DONE — titles=${done} descLinesFixed=${descFixed} failed=${failed}`);
