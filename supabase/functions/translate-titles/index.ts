import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Backfill localized artwork titles (title_<locale>) for main-catalogue paintings,
// most-viewed first, one cheap gpt-4o-mini call per batch. Also fixes the English
// title embedded in the already-translated descriptions (string replace, no extra
// API cost). Uses the same OPENAI_API_KEY secret as enrich-artworks. Invoke in a
// loop (POST {limit, dry}) until it returns translated:0.

// OpenAI key -> { title column, description column }
const LOC = [
  { k: 'es', tc: 'title_sp', dc: 'description_sp' },
  { k: 'pt', tc: 'title_pt', dc: 'description_pt' },
  { k: 'fr', tc: 'title_fr', dc: 'description_fr' },
  { k: 'de', tc: 'title_ger', dc: 'description_ger' },
  { k: 'it', tc: 'title_it', dc: 'description_it' },
  { k: 'ja', tc: 'title_jp', dc: 'description_jp' },
  { k: 'ko', tc: 'title_ko', dc: 'description_ko' },
  { k: 'ru', tc: 'title_ru', dc: 'description_ru' },
  { k: 'zh', tc: 'title_ch', dc: 'description_ch' },
]

const SYS = `You are an art historian and professional translator. You translate painting titles into other languages using the CONVENTIONAL, established title in each language when one exists (English "The Starry Night" -> French "La Nuit étoilée", never a literal word-for-word rendering). You NEVER translate proper nouns: personal names, place names, and coined or invented one-word titles stay IDENTICAL in every language (e.g. "Guernica" -> "Guernica"; "Mona Lisa" keeps its established name in each language). Only the descriptive, common-noun parts are translated. Output only the translated title itself — no quotation marks, no notes.`

async function translateTitles(openaiKey: string, titles: string[]): Promise<any[]> {
  const user = `Translate these ${titles.length} artwork titles into 9 languages: es, pt, fr, de, it, ja, ko, ru, zh.\n`
    + `Return STRICT JSON: {"items":[{"i":<index>,"es":"..","pt":"..","fr":"..","de":"..","it":"..","ja":"..","ko":"..","ru":"..","zh":".."}, ...]} with exactly one object per input index, every language filled.\n`
    + `Titles:\n` + titles.map((t, i) => `${i}: ${t}`).join('\n')
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, max_tokens: 16000, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }] }),
    })
    if (!res.ok) { if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 2500 * attempt)); continue } throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`) }
    const data = await res.json()
    return JSON.parse(data.choices?.[0]?.message?.content).items || []
  }
  throw new Error('OpenAI retries exhausted')
}

function json(o: unknown, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } }) }

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) return json({ error: 'OPENAI_API_KEY not set' }, 500)

    const body = await req.json().catch(() => ({} as any))
    const limit = Math.min(Number(body.limit) || 40, 50)
    const dry = body.dry === true

    const { data: rows, error } = await supabase.from('artworks')
      .select('id, title, ' + LOC.map(l => l.dc).join(', '))
      .is('object_type', null).is('title_fr', null).not('title', 'is', null)
      .order('score', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (error) return json({ error: error.message }, 500)
    if (!rows || rows.length === 0) return json({ translated: 0, more: false, message: 'no untranslated titles left' })

    const items = await translateTitles(openaiKey, rows.map((r: any) => r.title))
    const byIdx = new Map(items.map((it: any) => [it.i, it]))

    let translated = 0, descFixed = 0, skipped = 0
    const sample: string[] = []
    for (let i = 0; i < rows.length; i++) {
      const row: any = rows[i], t: any = byIdx.get(i)
      // completeness guard: only write when ALL 9 languages came back, so a partial
      // response never permanently leaves a language null (the row retries next run).
      if (!t || LOC.some(l => !(t[l.k] || '').trim())) { skipped++; continue }
      const upd: any = {}
      for (const l of LOC) {
        const val = String(t[l.k]).trim()
        upd[l.tc] = val
        if (/\s/.test(row.title) && row[l.dc] && row[l.dc].includes(row.title)) { upd[l.dc] = row[l.dc].split(row.title).join(val); descFixed++ }
      }
      if (sample.length < 4) sample.push(`${row.title} → fr:${t.fr} | ja:${t.ja} | ru:${t.ru}`)
      if (dry) { translated++; continue }
      const { error: ue } = await supabase.from('artworks').update(upd).eq('id', row.id)
      if (ue) skipped++; else translated++
    }
    return json({ translated, descFixed, skipped, more: rows.length === limit, sample })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})
