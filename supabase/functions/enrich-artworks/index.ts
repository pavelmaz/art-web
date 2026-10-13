import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// v35 (12 Oct 2026): factual catalogue voice + anti-duplicate guard. Every draft
// is checked before it is published — banned stock phrases, rhetorical questions,
// reader-address, and an opening that other works already use (fingerprints in
// public.desc_openings, kept in sync by a trigger on artworks.description). A work
// whose drafts keep failing is flagged in artworks.description_rejects instead of
// getting a repetitive text.

const BATCH_SIZE = 10
const MAX_DRAFTS = 3   // attempts at a description that passes the guard
const W6_LIMIT = 3     // other works allowed to share the first 6 words
const W3_LIMIT = 50    // other works allowed to share a generic 3-word opening

const VALID_GENRES = [
  'Landscape', 'Marine', 'Architecture', 'Genre Scene', 'Religious',
  'Portrait', 'Figurative', 'Decorative Art', 'Historical', 'Interior',
  'Botanical', 'Abstract', 'Animal', 'Still Life', 'Mythology',
  'Allegory', 'Drawing', 'Illustration'
]

const VALID_STYLES = [
  'Romanticism', 'Impressionism', 'Dutch Golden Age', 'Realism',
  'Post-Impressionism', 'Northern Renaissance', 'Symbolism', 'Modernism',
  'Baroque', 'Rococo', 'Expressionism', 'Ukiyo-e', 'Victorian',
  'Chinese Traditional', 'Renaissance', 'Neoclassicism', 'Gothic',
  'Art Nouveau', 'Islamic Art', 'Colonial American', 'Buddhist Art',
  'Mannerism', 'Academic', 'Japanese Traditional', 'Mughal',
  'Contemporary', 'Indian Traditional', 'Korean Traditional',
  'Surrealism', 'Folk Art', 'Pre-Raphaelite', 'Naturalism',
  'Abstract Expressionism', 'Art Deco', 'Cubism', 'Orientalism'
]

const VALID_MEDIUMS = [
  'oil on canvas', 'etching', 'engraving', 'watercolor on paper',
  'paper', 'oil on panel', 'ink on paper', 'woodblock print',
  'lithograph', 'tempera on panel', 'chalk on paper', 'pencil on paper',
  'gouache on paper', 'pastel on paper', 'fresco', 'oil on board'
]

// "Private collection" is NOT a default any more: it is accepted only when the
// work's source page says so. Unknown holder = null (the page shows nothing).
const PRIVATE_COLLECTION = 'Private collection'
const VALID_MUSEUMS = [
  'Museo de Arte de São Paulo',
  'Museum of Fine Arts Boston',
  'Museo del Prado',
  'National Gallery of Art Washington',
  'Museo di Capodimonte',
  'Mauritshuis',
  'Museo Thyssen-Bornemisza',
  'Rijksmuseum',
  'Alte Pinakothek',
  'Museo Nacional de Bellas Artes (Chile)',
  "Musee d'Orsay",
  'National Gallery London',
  'National Museum of Modern Art Tokyo',
  'Museo Nacional de Bellas Artes (Argentina)',
  'Louvre Museum',
  'Kunsthaus Zürich',
  'Museum of Islamic Art Doha',
  'Kunsthistorisches Museum',
  'National Gallery of Australia',
  'Tate Britain',
  'Kunstmuseum Basel',
  'Museo Frida Kahlo',
  'Albertina Museum',
  'Belvedere Museum',
  'Guggenheim Museum',
  'Museo Nacional de Arte de Cataluña',
  'National Gallery of Victoria',
  'National Portrait Gallery London',
  'British Museum',
  'Tate Modern',
  'Museu de Arte Antiga',
  'Museo Soumaya',
  'Städel Museum',
  'Metropolitan Museum of Art',
  'Philadelphia Museum of Art',
  'Mori Art Museum',
  'Museo Egizio',
  'Neue Pinakothek',
  'National Palace Museum Taipei',
  'Art Institute of Chicago',
  'National Museum of Korea',
  'Galleria Borghese',
  'Victoria and Albert Museum',
  'Van Gogh Museum',
  'Whitney Museum of American Art',
  'Hirshhorn Museum',
  'Uffizi Gallery',
  'Guggenheim Bilbao',
  'Brooklyn Museum'
]

// Stock phrases the old generators repeated across tens of thousands of pages
// (measured in desc_openings on 12 Oct 2026), plus guide-voice clichés.
const BANNED: Array<[RegExp, string]> = [
  [/(^|[.!]\s+|\n\s*)(look|notice|observe|focus|consider|imagine|note|see|follow|step|let your)\b/i, 'tells the reader where to look ("Notice…", "Look to…", "Focus first…")'],
  [/\byou(r|rs)?\b/i, 'addresses the reader ("you")'],
  [/\b(invites?|inviting|beckons?|beckoning)\b/i, 'uses "invites"/"beckons"'],
  [/\b(draws?|drawing|catch(es)?|catching|seizes?|leads?|guides?) (the |our )?(viewer'?s'? )?eyes?\b/i, 'uses "draws/catches the eye"'],
  [/\bthe eye (is|first)\b|\bfirst thing (that|to)\b/i, 'uses "the eye is drawn"/"the first thing"'],
  [/\b(tapestry|interplay|steeped in|frozen in time|stillness|quietude|in the realm of|in a world where)\b/i, 'uses guide-voice clichés (tapestry, interplay, stillness…)'],
  [/\b(sublime|transcendent|ethereal|evocative|timeless|masterful|poignant|breathtaking|stunning)\b/i, 'uses a forbidden adjective'],
  [/\b(little|nothing|no (further|other|additional|specific))( else| information)? (is|has been|was)? ?(recorded|documented|known)\b|\bprovided here\b|\b(documented|available) (records|documentation|information)\b|\baccording to (the )?(documented|available|source)|\bas recorded in\b|\bhistory has kept\b/i, 'talks about missing or available documentation instead of the work'],
]

/** Reasons a draft must not be published; empty array = passes the text checks. */
function textReasons(text: string): string[] {
  const reasons: string[] = []
  // Titles are *asterisked*; a title like Gauguin's may legitimately contain "?" or "you".
  const prose = text.replace(/\*[^*\n]{1,200}\*/g, 'TITLE').trim()
  if (/^[“"«„「『‘'(]/.test(prose)) reasons.push('opens with a quotation')
  if (prose.includes('?')) reasons.push('contains a rhetorical question')
  if (/^(this|the) (painting|work|image|picture|artwork|print|drawing) (depicts|shows|portrays|presents|captures)\b/i.test(prose)) reasons.push('opens with "This painting depicts"')
  if (/^in the\b/i.test(prose)) reasons.push('opens with "In the…"')
  for (const [re, why] of BANNED) if (re.test(prose)) reasons.push(why)
  return reasons
}

/** Duplicate-opening check against every published description. */
async function openingReasons(supabase: any, text: string, artwork: any): Promise<string[]> {
  const { data, error } = await supabase.rpc('desc_opening_check', { t: text, exclude_id: artwork.id })
  if (error || !data?.[0]) { console.error(`opening check failed: ${error?.message}`); return [] }
  const { w3, n3, w6, n6 } = data[0]
  const reasons: string[] = []
  if (n6 >= W6_LIMIT) reasons.push(`its first words "${w6}…" already open ${n6} other works`)
  // Openings naming this work's own title/artist (or a year) are specific by
  // nature — "claude monet painted…" — so only generic 3-word openings are capped.
  const generic = new Set(['with', 'from', 'that', 'this', 'into', 'over', 'under', 'near', 'after', 'before',
    'their', 'portrait', 'landscape', 'painting', 'study', 'view', 'scene', 'still', 'life', 'unknown'])
  const own = new Set(`${artwork.title || ''} ${artwork.artist_display || ''}`.toLowerCase()
    .split(/[^a-z0-9à-ÿ]+/).filter((w: string) => w.length >= 4 && !generic.has(w)))
  const specific = /\d/.test(w3) || w3.split(' ').some((w: string) => own.has(w))
  if (!specific && n3 >= W3_LIMIT) reasons.push(`its opening "${w3}…" is already used by ${n3} works`)
  return reasons
}

async function chatJson(openaiKey: string, model: string, prompt: string, maxTokens: number): Promise<any> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No OpenAI response')
  return JSON.parse(content)
}

/** Public, fetchable URL for the artwork image (OpenAI vision downloads it).
 *  Direct supabase.co object URLs 400 since the bucket went private — serve via
 *  the CDN Worker instead. External (wikimedia) URLs pass through unchanged. */
function visionImageUrl(imageId: string | null): string | null {
  if (!imageId || !/^https?:\/\//i.test(imageId)) return null
  return imageId.replace(/^https:\/\/[a-z0-9-]+\.supabase\.co\//i, 'https://cdn.fineartfree.com/').split('?')[0]
}

/** Documented facts from the work's Wikimedia Commons file page (when its source
 *  url points there). These are the ONLY external facts the writer may lean on. */
async function commonsFacts(url: string | null): Promise<string | null> {
  try {
    if (!url || !/commons\.wikimedia\.org\/wiki\/File(:|%3A)/i.test(url)) return null
    const file = decodeURIComponent(url.split('/wiki/')[1] || '')
    if (!file) return null
    const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(file)}&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`
    const res = await fetch(api, { headers: { 'User-Agent': 'FineArtFree-enricher/1.0 (https://fineartfree.com)' } })
    if (!res.ok) return null
    const pages = (await res.json())?.query?.pages ?? {}
    const meta = (Object.values(pages)[0] as any)?.imageinfo?.[0]?.extmetadata
    if (!meta) return null
    const strip = (s: string) => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const parts: string[] = []
    if (meta.ImageDescription?.value) parts.push(`Source description: ${strip(meta.ImageDescription.value).slice(0, 600)}`)
    if (meta.DateTimeOriginal?.value) parts.push(`Date (per source): ${strip(meta.DateTimeOriginal.value).slice(0, 120)}`)
    if (meta.Credit?.value) parts.push(`Source/collection: ${strip(meta.Credit.value).slice(0, 250)}`)
    return parts.length ? parts.join('\n') : null
  } catch { return null }
}

/** Stage 1: a factual catalogue entry. The model SEES the artwork (vision) and
 *  gets the Commons source facts; when it has no solid knowledge of the specific
 *  work it writes a shorter, visually-grounded entry instead of inventing history.
 *  `rejected` carries the guard's reasons from the previous draft, if any. */
async function writeDescription(openaiKey: string, artwork: any, facts: string | null, rejected: string[]): Promise<string> {
  const imageUrl = visionImageUrl(artwork.image_id)

  const prompt = `You are writing the catalogue entry for an artwork page in an online public-domain art collection. Write like a careful museum catalogue or encyclopedia: factual, specific, plain English. The actual artwork image ${imageUrl ? 'is attached — study it before writing' : 'is not available'}.

Artwork: *${artwork.title}* by ${artwork.artist_display || 'Unknown'}, ${artwork.date_display || 'date unknown'}, ${artwork.medium_display || 'medium unknown'}.
${facts ? `\nDocumented facts about this work (its source page and its Wikidata record). They are verified — use them. For a well-known work, ALSO use what you know FOR CERTAIN about its commission, context and history; never add anything you are not sure of:\n${facts}\n` : ''}
STEP 1 — decide honestly: do you have solid, specific, verifiable knowledge about THIS exact work (its commission, history, provenance)? Famous museum pieces: usually yes. Minor or obscure works: almost always NO — do not talk yourself into false confidence.

IF YES (well-documented work you are certain you know) — 3 paragraphs, 3-5 sentences each, separated by blank lines:
P1 — WHAT IT IS: the documented facts that identify the work — subject, date, the circumstances of its making, its place in the artist's career.
P2 — WHAT IT SHOWS: the subject, composition, light, colour and technique as seen in the attached image, and the documented meaning of key details.
P3 — ITS HISTORY: patron, provenance, versions, exhibitions, reception, the collection that holds it today — documented facts only.

IF NO (little or no verified knowledge of this specific work — the common case) — 2 paragraphs, 3-5 sentences each, separated by a blank line:
P1 — WHAT IT SHOWS: the subject, composition, light, colour and technique, described plainly from the attached image. Interpret only what is visible.
P2 — CONTEXT: the documented general history of this kind of picture in its period and place, plus the documented facts about this work (collection, date, size). If little is known, keep the entry shorter.

FIRST SENTENCE (strict): state a concrete fact about THIS work — its subject, date, maker, setting or technique — in words specific to it. Thousands of entries share this collection, so a stock opening is a failure. NEVER open with a question, a quotation, "In the…", "This painting depicts/shows", or an instruction to the reader.

ABSOLUTE RULES:
- NEVER invent events, dates, voyages, commissions, patrons, sales, wars, provenance, survival claims or quotes about THIS specific work. If you do not know it, it does not go in.
- TRUE general context about the era, genre or artist's documented life IS allowed.
- Describe ONLY what the attached image shows — never weather, drama, damage or scenes that are not visible in it.
- Specific names, dates and numbers ONLY when you are certain, or when given in the source facts.
- Name the museum or collection that holds the work ONLY if the source facts document it or you are certain of it; otherwise do not mention where it is held.
- No rhetorical questions anywhere. No quotations unless a documented quote you are certain of — and never as the opening.
- Write only about the work. NEVER mention sources, records, documentation, "the facts provided", or what is or is not known or recorded — if something is unknown, simply leave it out.
- Never address the reader: no "you", "notice", "look", "observe", "focus", "imagine".
- No guide-voice clichés: "invites", "beckons", "draws/catches the eye", "the first thing", "tapestry", "interplay", "steeped in", "stillness", "frozen in time".
- FORBIDDEN words: sublime, transcendent, ethereal, evocative, timeless, masterful, poignant, breathtaking, stunning.
- Plain, varied sentences; no flourish for its own sake.
- FORMATTING (STRICT): wrap EVERY artwork title, artist name and movement name in *asterisks*, e.g. *The Music Lesson*, *Jan Steen*, *Baroque*. NEVER put titles in quotation marks.
${rejected.length ? `\nYOUR PREVIOUS DRAFT WAS REJECTED because it ${rejected.join('; ')}. Write a new entry that avoids all of this, with a different, specific first sentence.\n` : ''}
Return ONLY the paragraphs.`

  type Attempt = { model: string, withImage: boolean }
  const attempts: Attempt[] = imageUrl
    ? [{ model: 'gpt-4.1', withImage: true }, { model: 'gpt-4.1', withImage: false }, { model: 'gpt-4o-mini', withImage: false }]
    : [{ model: 'gpt-4.1', withImage: false }, { model: 'gpt-4o-mini', withImage: false }]

  for (const attempt of attempts) {
    try {
      const content = attempt.withImage
        ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }]
        : prompt
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: attempt.model,
          max_tokens: 1200,
          temperature: rejected.length ? 0.6 : 0.4,
          messages: [{ role: 'user', content }]
        })
      })
      if (!res.ok) { console.error(`stage1 ${attempt.model}${attempt.withImage ? '+img' : ''}: ${res.status}`); continue }
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content?.trim()
      if (text && text.length > 200) return text
    } catch (e) {
      console.error(`stage1 ${attempt.model}${attempt.withImage ? '+img' : ''}: ${e.message}`)
    }
  }
  throw new Error('stage 1 description failed on all models')
}

/** Drafts until one passes the guard (max MAX_DRAFTS). */
async function writeGuardedDescription(supabase: any, openaiKey: string, artwork: any, facts: string | null):
  Promise<{ text: string | null, drafts: number, reasons: string[], lastDraft: string }> {
  let reasons: string[] = []
  let lastDraft = ''
  for (let d = 1; d <= MAX_DRAFTS; d++) {
    lastDraft = await writeDescription(openaiKey, artwork, facts, reasons)
    reasons = [...textReasons(lastDraft), ...await openingReasons(supabase, lastDraft, artwork)]
    if (!reasons.length) return { text: lastDraft, drafts: d, reasons: [], lastDraft }
    console.error(`draft ${d} rejected for ${artwork.id}: ${reasons.join(' | ')}`)
  }
  return { text: null, drafts: MAX_DRAFTS, reasons, lastDraft }
}

/** Translate the description into a group of languages. Small groups + explicit
 *  completeness rule + length validation, because one 9-language mega-request
 *  makes gpt-4o-mini fill the first field and leave the rest empty. */
async function translateGroup(
  openaiKey: string,
  english: string,
  langs: Array<{ key: string, name: string, minChars: number }>
): Promise<Record<string, string>> {
  const prompt = `Translate this museum artwork description into ${langs.map(l => l.name).join(', ')}.
Keep the paragraph structure (blank line between paragraphs). Keep *asterisks* around artwork/artist/movement names — do NOT convert them to quotation marks. Translate naturally, not word-for-word.

EVERY field in your JSON answer MUST contain the COMPLETE translated description — every paragraph. Empty or partial fields are not acceptable.

---
${english}
---

Return ONLY JSON: {${langs.map(l => `"${l.key}": "complete ${l.name} translation"`).join(', ')}}`

  for (let attempt = 1; attempt <= 2; attempt++) {
    const data = await chatJson(openaiKey, 'gpt-4o-mini', prompt, 8000)
    const ok = langs.every(l => typeof data[l.key] === 'string' && data[l.key].length >= l.minChars)
    if (ok) return data
    console.error(`translateGroup attempt ${attempt} incomplete: ` + langs.map(l => `${l.key}=${(data[l.key] || '').length}`).join(','))
  }
  throw new Error(`translations incomplete for ${langs.map(l => l.key).join(',')}`)
}

/** Wikidata record (public.artwork_wikidata, filled by scripts/wikidata-artwork-facts.mjs) as prompt facts. */
function wikidataFactsText(f: any): string | null {
  if (!f?.qid) return null
  const parts: string[] = []
  if (f.title) parts.push(`Title: ${f.title}`)
  if (f.creator?.length) parts.push(`Creator: ${f.creator.join(', ')}`)
  if (f.inception) parts.push(`Date: ${f.inception}`)
  if (f.collections?.length) parts.push(`Held by: ${f.collections.map((c: any) => c.label + (c.inventory ? ` (inventory ${c.inventory})` : '')).join('; ')}`)
  if (f.material?.length) parts.push(`Materials: ${f.material.join(', ')}`)
  if (f.height && f.width) parts.push(`Size: ${f.height} × ${f.width}`)
  if (f.genre?.length) parts.push(`Genre: ${f.genre.join(', ')}`)
  if (f.movement?.length) parts.push(`Movement: ${f.movement.join(', ')}`)
  if (f.depicts?.length) parts.push(`Depicts: ${f.depicts.join(', ')}`)
  if (f.created_in?.length) parts.push(`Made in: ${f.created_in.join(', ')}`)
  if (f.enwiki) parts.push(`English Wikipedia article: "${f.enwiki}"`)
  return parts.length ? `Wikidata record ${f.qid}:\n${parts.join('\n')}` : null
}

/** The holder, when the work came straight from that museum's own open-access site/API. */
function museumFromSource(artwork: any): string | null {
  const u = (artwork.url || '').toLowerCase()
  const src = (artwork.source || '').toLowerCase()
  if (src === 'rijksmuseum') return 'Rijksmuseum'
  if (src === 'aic') return 'Art Institute of Chicago'
  if (u.includes('artic.edu')) return 'Art Institute of Chicago'
  if (u.includes('harvardartmuseums.org')) return 'Harvard Art Museums'
  if (u.includes('rijksmuseum.nl')) return 'Rijksmuseum'
  if (u.includes('metmuseum.org')) return 'Metropolitan Museum of Art'
  if (u.includes('nga.gov')) return 'National Gallery of Art Washington'
  if (u.includes('clevelandart.org')) return 'Cleveland Museum of Art'
  return null
}

/** Our current museum value, kept only when the documented facts mention it too. */
function corroboratedMuseum(museum: string | null, facts: string | null): string | null {
  if (!museum || !facts || museum === PRIVATE_COLLECTION) return null
  const fold = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  // City suffixes only — never "museum": "Van Gogh Museum" must not match the creator name.
  const core = fold(museum).replace(/ (washington|london|boston)$/, '').trim()
  // Whole-name match: "national gallery" must not match "National Gallery of Art".
  const re = new RegExp(core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z]| of\\b)')
  return core.length >= 5 && re.test(fold(facts)) ? museum : null
}

/** Museum shown after a rewrite: Wikidata > the museum's own source > our value if the
 *  documented facts corroborate it > nothing. */
function rewriteMuseum(artwork: any, wd: any, facts: string | null): string | null {
  return wd?.museum || museumFromSource(artwork) || corroboratedMuseum(artwork.museum, facts) || null
}

/** rewrite = targeted rewrite of an existing page (ids mode): museum, date and size
 *  then come ONLY from documented sources (Wikidata / the museum's own site), or stay empty. */
async function enrichArtwork(supabase: any, openaiKey: string, artwork: any, dryRun: boolean, rewrite: boolean): Promise<any> {
  try {
    const { data: wdRow } = await supabase.from('artwork_wikidata').select('facts').eq('artwork_id', artwork.id).maybeSingle()
    const wd = wdRow?.facts?.qid ? wdRow.facts : null
    const facts = [await commonsFacts(artwork.url), wikidataFactsText(wd)].filter(Boolean).join('\n\n') || null

    // Stage 1: strong model writes the English description, guarded against repetition.
    const guarded = await writeGuardedDescription(supabase, openaiKey, artwork, facts)
    if (dryRun) {
      return { success: !!guarded.text, id: artwork.id, title: artwork.title, drafts: guarded.drafts,
               reasons: guarded.reasons, description: guarded.text ?? guarded.lastDraft,
               museum_now: artwork.museum, museum_after: rewrite ? rewriteMuseum(artwork, wd, facts) : undefined,
               wikidata: wd?.qid || null }
    }
    if (!guarded.text) {
      // Flag instead of publishing a repetitive text; flagged works leave the queue.
      await supabase.from('artworks').update({
        description_rejects: { at: new Date().toISOString(), reasons: guarded.reasons, draft: guarded.lastDraft.slice(0, 400) }
      }).eq('id', artwork.id)
      return { success: false, id: artwork.id, error: `${artwork.id}: rejected after ${MAX_DRAFTS} drafts — ${guarded.reasons.join('; ')}` }
    }
    const englishDescription = guarded.text

    // The grounded description can be legitimately shorter for obscure works, so
    // translation minimums scale with the English source length.
    const latinMin = Math.min(400, Math.round(englishDescription.length * 0.5))
    const cjkMin = Math.min(150, Math.round(englishDescription.length * 0.2))

    // Stage 2a/2b: translations in two digestible groups.
    const latin = await translateGroup(openaiKey, englishDescription, [
      { key: 'desc_es', name: 'Spanish', minChars: latinMin },
      { key: 'desc_pt', name: 'Portuguese', minChars: latinMin },
      { key: 'desc_fr', name: 'French', minChars: latinMin },
      { key: 'desc_de', name: 'German', minChars: latinMin },
      { key: 'desc_it', name: 'Italian', minChars: latinMin },
    ])
    const cjk = await translateGroup(openaiKey, englishDescription, [
      { key: 'desc_zh', name: 'Simplified Chinese', minChars: cjkMin },
      { key: 'desc_ja', name: 'Japanese', minChars: cjkMin },
      { key: 'desc_ko', name: 'Korean', minChars: cjkMin },
      { key: 'desc_ru', name: 'Russian', minChars: latinMin },
    ])

    // Stage 2c: metadata + SEO + alt texts (the old "basic" task).
    const meta = await chatJson(openaiKey, 'gpt-4o-mini', `You are cataloguing an artwork for a multilingual gallery.

Artwork:
- Title: "${artwork.title}"
- Artist: ${artwork.artist_display || 'Unknown'}
- Medium: ${artwork.medium_display || 'Unknown'}
- Date: ${artwork.date_display || 'Unknown'}
- Museum: ${artwork.museum || 'Unknown'}
${facts ? `\nDocumented facts about this work:\n${facts}\n` : ''}
English description for context (factually grounded — do NOT add anything beyond it):
${englishDescription.slice(0, 1500)}

CRITICAL - MUSEUM FIELD:
Pick the museum from this EXACT list (use the exact spelling) ONLY if you are certain this specific work is held there:
${VALID_MUSEUMS.join('\n')}
Use "${PRIVATE_COLLECTION}" ONLY if the documented facts above say the work is in a private collection.
Otherwise — holder unknown or not on the list — use null. NEVER guess and NEVER invent museum names.

CRITICAL - DIMENSIONS: give the documented physical dimensions ONLY if you are confident they are correct for this specific work (e.g. "73.7 x 92.1 cm"); otherwise null. NEVER estimate or invent.

For genre pick ONE: ${VALID_GENRES.join(', ')}
For style pick ONE: ${VALID_STYLES.join(', ')}
For medium pick ONE (lowercase): ${VALID_MEDIUMS.join(', ')}
For score: 0.95+ world famous, 0.60-0.84 notable work, 0.30-0.59 minor work, 0.01-0.29 obscure
For date_display: period-level estimate grounded in the artist's active years (e.g. "c. 1880s", "19th century") — null if even the period is unknown. NEVER a precise invented year.
seo_* fields: <155 chars, natural meta description in that language, factual, no questions.
alt_text fields: 1 sentence describing ONLY what the image visibly shows (per the description above) — no events or history, in that language.

Return ONLY JSON:
{
  "genre_title": "", "style_title": "", "alt_text": "",
  "tags": ["t1","t2","t3","t4","t5"],
  "medium_display": "", "date_display": "", "dimensions": null, "location": "country",
  "museum": null, "score": 0.25,
  "seo_en": "", "seo_es": "", "seo_pt": "", "seo_fr": "", "seo_de": "",
  "seo_it": "", "seo_zh": "", "seo_ja": "", "seo_ko": "", "seo_ru": "",
  "alt_text_es": "", "alt_text_pt": "", "alt_text_fr": "", "alt_text_de": "", "alt_text_it": "",
  "alt_text_zh": "", "alt_text_ja": "", "alt_text_ko": "", "alt_text_ru": ""
}`, 4000)

    const genre = VALID_GENRES.includes(meta.genre_title) ? meta.genre_title : null
    const style = VALID_STYLES.includes(meta.style_title) ? meta.style_title : (artwork.style_title || null)
    const mediumRaw = (meta.medium_display || '').toLowerCase().trim()
    const medium = VALID_MEDIUMS.includes(mediumRaw) ? mediumRaw : (artwork.medium_display || mediumRaw || null)
    const currentScore = parseFloat(artwork.score)
    const aiScore = typeof meta.score === 'number' ? Math.min(0.99, Math.max(0.01, meta.score)) : null
    const finalScore = (currentScore === 50 && aiScore) ? aiScore : currentScore
    // Museum: valid list pick > existing value > null. "Private collection" only
    // when the source page documents it.
    const privateOk = meta.museum === PRIVATE_COLLECTION && /private collection/i.test(facts || '')
    const finalMuseum = rewrite
      ? rewriteMuseum(artwork, wd, facts)
      : (VALID_MUSEUMS.includes(meta.museum) || privateOk) ? meta.museum : (artwork.museum || null)

    const rawDimensions = meta.dimensions
    const wdDimensions = wd?.height && wd?.width ? `${wd.height} × ${wd.width}` : null
    const finalDimensions = rewrite
      ? wdDimensions
      : rawDimensions && rawDimensions.toLowerCase() !== 'null' && rawDimensions.trim() !== ''
        ? rawDimensions
        : (artwork.dimensions || null)

    await supabase.from('artworks').update({
      genre_title: genre,
      style_title: style,
      alt_text: meta.alt_text || null,
      tags: meta.tags || null,
      medium_display: artwork.medium_display || medium || null,
      date_display: (rewrite && wd?.inception) || artwork.date_display || meta.date_display || null,
      dimensions: finalDimensions,
      location: artwork.location || meta.location || null,
      museum: finalMuseum,
      score: finalScore,
      description: englishDescription,
      description_sp: latin.desc_es,
      description_pt: latin.desc_pt,
      description_fr: latin.desc_fr,
      description_ger: latin.desc_de,
      description_it: latin.desc_it,
      description_ch: cjk.desc_zh,
      description_jp: cjk.desc_ja,
      description_ko: cjk.desc_ko,
      description_ru: cjk.desc_ru,
      description_rejects: null,
    }).eq('id', artwork.id)

    await supabase.from('artwork_translations').upsert([
      { artwork_id: artwork.id, locale: 'en', seo_description: meta.seo_en || null, alt_text: meta.alt_text },
      { artwork_id: artwork.id, locale: 'es', seo_description: meta.seo_es || null, alt_text: meta.alt_text_es || meta.alt_text },
      { artwork_id: artwork.id, locale: 'pt', seo_description: meta.seo_pt || null, alt_text: meta.alt_text_pt || meta.alt_text },
      { artwork_id: artwork.id, locale: 'fr', seo_description: meta.seo_fr || null, alt_text: meta.alt_text_fr || meta.alt_text },
      { artwork_id: artwork.id, locale: 'de', seo_description: meta.seo_de || null, alt_text: meta.alt_text_de || meta.alt_text },
      { artwork_id: artwork.id, locale: 'it', seo_description: meta.seo_it || null, alt_text: meta.alt_text_it || meta.alt_text },
      { artwork_id: artwork.id, locale: 'zh', seo_description: meta.seo_zh || null, alt_text: meta.alt_text_zh || meta.alt_text },
      { artwork_id: artwork.id, locale: 'ja', seo_description: meta.seo_ja || null, alt_text: meta.alt_text_ja || meta.alt_text },
      { artwork_id: artwork.id, locale: 'ko', seo_description: meta.seo_ko || null, alt_text: meta.alt_text_ko || meta.alt_text },
      { artwork_id: artwork.id, locale: 'ru', seo_description: meta.seo_ru || null, alt_text: meta.alt_text_ru || meta.alt_text },
    ], { onConflict: 'artwork_id,locale' })

    console.log(`✅ ${artwork.title} | drafts=${guarded.drafts} | museum=${finalMuseum} | score=${finalScore}`)
    return { success: true, id: artwork.id }
  } catch (err: any) {
    return { success: false, id: artwork.id, error: `${artwork.id}: ${err.message}` }
  }
}

/** verify_jwt already checked the signature; targeted/dry runs additionally need the service role. */
function isServiceRole(req: Request): boolean {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (token && token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return true
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64 + '='.repeat((4 - b64.length % 4) % 4))).role === 'service_role'
  } catch { return false }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) return json({ error: 'OPENAI_API_KEY not set' }, 500)

    // Optional body: { ids: string[], dryRun: boolean }. ids rewrites specific works
    // (even ones that already have a description); dryRun returns the English draft
    // without saving anything.
    let body: any = {}
    try { body = await req.json() } catch { /* empty body = queue mode */ }
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.slice(0, BATCH_SIZE).map(String) : []
    const dryRun = body?.dryRun === true
    if ((ids.length || dryRun) && !isServiceRole(req)) return json({ error: 'service role required' }, 403)

    const columns = 'id, title, artist_display, style_title, medium_display, date_display, location, museum, dimensions, score, image_id, url, source'
    const query = ids.length
      ? supabase.from('artworks').select(columns).in('id', ids)
      : supabase.from('artworks').select(columns).is('description', null).is('description_rejects', null).limit(BATCH_SIZE)
    const { data: artworks, error } = await query

    if (error) return json({ error: error.message }, 500)
    if (!artworks || artworks.length === 0) return json({ message: 'No artworks need enrichment', enriched: 0 })

    const resultsList = await Promise.all(
      artworks.map(artwork => enrichArtwork(supabase, openaiKey, artwork, dryRun, ids.length > 0))
    )

    if (dryRun) return json({ dryRun: true, results: resultsList })

    const success = resultsList.filter(r => r.success).length
    const failed = resultsList.filter(r => !r.success).length
    const errors = resultsList.filter(r => r.error).map(r => r.error!)

    const { count } = await supabase
      .from('artworks')
      .select('id', { count: 'exact', head: true })
      .is('description', null)
      .is('description_rejects', null)

    return json({
      message: `Enriched ${success}, failed ${failed}`,
      remaining: ids.length ? null : (count || 0),
      success, failed, errors
    })

  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})
