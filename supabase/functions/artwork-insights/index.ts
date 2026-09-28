import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// "Visual description" insights for an artwork (the Discover pill on artwork
// images, components/ArtworkInsights.tsx). The browser used to call OpenAI with
// a key shipped in public JS; that key died (401) and anyone could read it.
// Now: POST { slug | artwork_id, locale } -> { insights }.
//   - The title and artist come from the database, never from the caller, so this
//     cannot be used to generate arbitrary text.
//   - Each artwork + language is generated once and cached in
//     public.artwork_insights; repeats are instant and free.
//   - At most DAILY_CAP new generations per 24 h (cached answers are unlimited),
//     so a script walking the catalogue cannot run up the OpenAI bill.
// Uses the same OPENAI_API_KEY secret as translate-missing / enrich-artworks.

const MODEL = 'gpt-4o-mini'
const DAILY_CAP = 300 // ~$0.10/day at gpt-4o-mini prices

const LANGUAGE: Record<string, string> = {
  en: 'English', es: 'Spanish', pt: 'Portuguese', ja: 'Japanese', fr: 'French',
  de: 'German', it: 'Italian', ko: 'Korean', ru: 'Russian', zh: 'Chinese',
}
// Same per-locale title the artwork pages show.
const TITLE_COL: Record<string, string | null> = {
  en: null, es: 'title_sp', pt: 'title_pt', ja: 'title_jp', fr: 'title_fr',
  de: 'title_ger', it: 'title_it', ko: 'title_ko', ru: 'title_ru', zh: 'title_ch',
}

const ALLOWED_ORIGINS = new Set([
  'https://fineartfree.com',
  'https://www.fineartfree.com',
  'http://localhost:3000',
])

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://fineartfree.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(req: Request, o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } })
}

function buildPrompt(title: string, artist: string, language: string): string {
  return `You are a world-class museum audio guide writer and art historian.
For the painting "${title}" by ${artist}, generate exactly 4 insights
that make viewers feel like insiders — people who now see what others miss.

Each insight must belong to ONE of these 4 categories (use all 4, in this order):

1. THE HIDDEN SECRET — A detail most people walk past but changes everything once
   you see it. A symbol, hidden figure, visual trick, or disguised meaning embedded
   in a specific part of the painting.

2. WHY IT WAS PAINTED — The real reason, commission, political motive, personal
   obsession, or historical moment that made the artist create this. Not "he loved
   beauty" — the actual documented reason or context.

3. TIME CAPSULE — One element in the painting that reveals something surprising
   about everyday life, fashion, technology, or society in that exact era.
   Anchor it with a specific date or time period (e.g., "In 1665, only nobility
   could afford...").

4. THE PAINTER'S TRICK — A deliberate technical or compositional decision the
   artist made — a perspective cheat, an impossible light source, a brushwork
   innovation, a color that shouldn't work but does — and why they did it.

Rules for ALL insights:
- Point to a SPECIFIC visible element (not "the painting overall")
- 2 sentences max: sentence 1 = what to look at / the fact, sentence 2 = why it matters or surprises
- Write like you're whispering a secret to a friend, not lecturing
- NO philosophical fluff, NO vague praise ("masterful", "timeless")
- At least 1 insight must contain a concrete data point: a year, a price, a
  measurement, a documented historical fact with a date
- Write every "title" and "text" field in ${language}. Keep JSON keys and "category" values in English.

Provide x/y position (0-100 percentage) for where the dot should appear on the
painting, placed precisely on the element being described.

Return ONLY valid JSON:
{
  "insights": [
    {
      "id": 1,
      "category": "hidden_secret",
      "x": 45,
      "y": 30,
      "title": "3-4 word label",
      "text": "Sentence one: the specific fact or observation. Sentence two: why it's surprising or what it reveals."
    }
  ]
}`
}

type Insight = { id: number, category?: string, x: number, y: number, title: string, text: string }

/** Keep only well-formed insights, with dots clamped onto the image. */
function clean(raw: unknown): Insight[] {
  const list = (raw as { insights?: unknown })?.insights
  if (!Array.isArray(list)) return []
  const out: Insight[] = []
  for (const item of list.slice(0, 4)) {
    const i = item as Record<string, unknown>
    const x = Number(i.x), y = Number(i.y)
    if (typeof i.title !== 'string' || typeof i.text !== 'string' || !Number.isFinite(x) || !Number.isFinite(y)) continue
    out.push({
      id: out.length + 1,
      category: typeof i.category === 'string' ? i.category : undefined,
      x: Math.min(95, Math.max(5, x)),
      y: Math.min(95, Math.max(5, y)),
      title: i.title.slice(0, 80),
      text: i.text.slice(0, 600),
    })
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'method not allowed' }, 405)

  let body: { slug?: unknown, artwork_id?: unknown, locale?: unknown }
  try { body = await req.json() } catch { return json(req, { error: 'invalid json' }, 400) }
  const locale = typeof body.locale === 'string' && body.locale in LANGUAGE ? body.locale : null
  const slug = typeof body.slug === 'string' && body.slug.length <= 300 ? body.slug : null
  const artworkId = typeof body.artwork_id === 'string' && body.artwork_id.length <= 100 ? body.artwork_id : null
  if (!locale || (!slug && !artworkId)) return json(req, { error: 'slug or artwork_id and locale required' }, 400)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const titleCol = TITLE_COL[locale]
  const cols = ['id', 'title', 'artist_display', ...(titleCol ? [titleCol] : [])].join(', ')
  const lookup = db.from('artworks').select(cols)
  const { data: artwork, error: artErr } = await (slug ? lookup.eq('slug', slug) : lookup.eq('id', artworkId!)).maybeSingle()
  if (artErr) return json(req, { error: 'lookup failed' }, 500)
  if (!artwork) return json(req, { error: 'artwork not found' }, 404)
  const row = artwork as Record<string, string | null>

  const { data: cached } = await db.from('artwork_insights')
    .select('insights').eq('artwork_id', row.id).eq('locale', locale).maybeSingle()
  if (cached) return json(req, { insights: cached.insights, cached: true })

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await db.from('artwork_insights').select('artwork_id', { count: 'exact', head: true }).gte('created_at', since)
  if ((count ?? 0) >= DAILY_CAP) return json(req, { error: 'daily limit reached' }, 429)

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) return json(req, { error: 'OPENAI_API_KEY not set' }, 500)

  const title = (titleCol && row[titleCol]?.trim()) || row.title || ''
  const artist = row.artist_display?.trim() || 'Unknown artist'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: buildPrompt(title, artist, LANGUAGE[locale]) }],
    }),
  })
  if (!res.ok) {
    console.error('openai', res.status, (await res.text()).slice(0, 200))
    return json(req, { error: 'generation failed' }, 502)
  }
  const content = (await res.json())?.choices?.[0]?.message?.content
  let insights: Insight[] = []
  try { insights = clean(JSON.parse(content ?? '')) } catch { /* handled below */ }
  if (insights.length === 0) return json(req, { error: 'generation failed' }, 502)

  await db.from('artwork_insights')
    .upsert({ artwork_id: row.id, locale, insights, model: MODEL }, { onConflict: 'artwork_id,locale', ignoreDuplicates: true })
  return json(req, { insights, cached: false })
})
