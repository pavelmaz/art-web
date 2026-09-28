import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Fill in MISSING translations of text that already exists in English:
//   kind "descriptions" — artworks.description -> description_<suffix>
//   kind "bios"         — artists.bio          -> bio_<locale>
// Pure translation: it never writes or changes the English source and never
// overwrites a translation that is already there, so it cannot introduce facts.
// Uses the same OPENAI_API_KEY secret as enrich-artworks. Driven with explicit ids
// by scripts/fill-missing-translations.mjs:  POST { kind, ids: [...] }  (max 12).

type Lang = 'es' | 'pt' | 'fr' | 'de' | 'it' | 'zh' | 'ja' | 'ko' | 'ru'

const KINDS: Record<string, { table: string, src: string, what: string, cols: Record<Lang, string> }> = {
  descriptions: {
    table: 'artworks', src: 'description', what: 'museum artwork description',
    cols: { es: 'description_sp', pt: 'description_pt', fr: 'description_fr', de: 'description_ger', it: 'description_it', zh: 'description_ch', ja: 'description_jp', ko: 'description_ko', ru: 'description_ru' },
  },
  bios: {
    table: 'artists', src: 'bio', what: 'artist biography',
    cols: { es: 'bio_es', pt: 'bio_pt', fr: 'bio_fr', de: 'bio_de', it: 'bio_it', zh: 'bio_zh', ja: 'bio_ja', ko: 'bio_ko', ru: 'bio_ru' },
  },
}

const NAMES: Record<Lang, string> = {
  es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German', it: 'Italian',
  zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean', ru: 'Russian',
}
// Two digestible groups, as in enrich-artworks: one 9-language request makes
// gpt-4o-mini fill the first field and leave the rest empty.
const GROUPS: Lang[][] = [['es', 'pt', 'fr', 'de', 'it'], ['zh', 'ja', 'ko', 'ru']]
const DENSE = new Set<Lang>(['zh', 'ja', 'ko'])
const MAX_IDS = 12

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } })
}

/** The gateway has already verified the token's signature (verify_jwt); this only
 *  narrows who may spend OpenAI credit to the service role, not any signed-in user. */
function isServiceRole(req: Request): boolean {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return false
  if (token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.role === 'service_role'
  } catch { return false }
}

/** Shortest acceptable translation, scaled to the English source so a one-line
 *  bio and a three-paragraph description are both judged fairly. */
function minChars(lang: Lang, english: string): number {
  return DENSE.has(lang)
    ? Math.min(150, Math.round(english.length * 0.2))
    : Math.min(400, Math.round(english.length * 0.5))
}

async function translateGroup(openaiKey: string, what: string, english: string, langs: Lang[]): Promise<Partial<Record<Lang, string>>> {
  const prompt = `Translate this ${what} into ${langs.map(l => NAMES[l]).join(', ')}.
Keep the paragraph structure (blank line between paragraphs). Keep *asterisks* around artwork/artist/movement names — do NOT convert them to quotation marks. Translate naturally, not word-for-word. Add nothing and leave nothing out.

EVERY field in your JSON answer MUST contain the COMPLETE translation — every paragraph. Empty or partial fields are not acceptable.

---
${english}
---

Return ONLY JSON: {${langs.map(l => `"${l}": "complete ${NAMES[l]} translation"`).join(', ')}}`

  let best: Partial<Record<Lang, string>> = {}
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini', max_tokens: 8000, temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 2500 * attempt)); continue }
      throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    let data: any = {}
    try { data = JSON.parse((await res.json()).choices?.[0]?.message?.content || '{}') } catch { /* retry */ }
    // keep every language that came back complete, even if another one did not
    for (const l of langs) {
      const text = typeof data[l] === 'string' ? data[l].trim() : ''
      if (text.length >= minChars(l, english) && text.length > 0) best[l] = text
    }
    if (langs.every(l => best[l])) break
  }
  return best
}

Deno.serve(async (req) => {
  try {
    if (!isServiceRole(req)) return json({ error: 'service role required' }, 403)

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) return json({ error: 'OPENAI_API_KEY not set' }, 500)

    const body = await req.json().catch(() => ({} as any))
    const kind = KINDS[String(body.kind)]
    if (!kind) return json({ error: 'kind must be "descriptions" or "bios"' }, 400)
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).slice(0, MAX_IDS)
    if (ids.length === 0) return json({ error: 'ids required' }, 400)

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const langs = Object.keys(kind.cols) as Lang[]
    const { data: rows, error } = await supabase.from(kind.table)
      .select(['id', kind.src, ...langs.map(l => kind.cols[l])].join(', '))
      .in('id', ids)
    if (error) return json({ error: error.message }, 500)

    const results = await Promise.all((rows || []).map(async (row: any) => {
      try {
        const english = (row[kind.src] || '').trim()
        if (!english) return { id: row.id, filled: 0, missing: 0 }
        const missing = langs.filter(l => !(row[kind.cols[l]] || '').trim())
        if (missing.length === 0) return { id: row.id, filled: 0, missing: 0 }

        const upd: Record<string, string> = {}
        for (const group of GROUPS) {
          const wanted = group.filter(l => missing.includes(l))
          if (wanted.length === 0) continue
          const out = await translateGroup(openaiKey, kind.what, english, wanted)
          for (const l of wanted) if (out[l]) upd[kind.cols[l]] = out[l]!
        }
        const filled = Object.keys(upd).length
        if (filled > 0) {
          const { error: ue } = await supabase.from(kind.table).update(upd).eq('id', row.id)
          if (ue) throw new Error(ue.message)
        }
        return { id: row.id, filled, missing: missing.length }
      } catch (e: any) {
        console.error(`translate-missing ${kind.table} ${row.id}: ${e.message}`)
        return { id: row.id, filled: 0, missing: -1, error: String(e.message).slice(0, 160) }
      }
    }))

    const complete = results.filter(r => r.missing >= 0 && r.filled === r.missing).length
    const partial = results.filter(r => r.missing > 0 && r.filled < r.missing).map(r => r.id)
    const errors = results.filter(r => r.error).map(r => `${r.id}: ${r.error}`)
    console.log(`translate-missing ${body.kind}: ${complete}/${results.length} complete, ${results.reduce((n, r) => n + r.filled, 0)} fields`)
    return json({ rows: results.length, complete, fields: results.reduce((n, r) => n + r.filled, 0), partial, errors })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})
