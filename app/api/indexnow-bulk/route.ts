import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { HREFLANG_LOCALES, LOCALE_ROUTE_CONFIG, type SiteLocale } from '@/lib/locale-routes'
import { slugify } from '@/lib/utils'

// ~110 IndexNow batches + ~100 slug fetches: needs well beyond the default timeout.
export const maxDuration = 300

const BASE = 'https://fineartfree.com'

/** Artwork/artist detail URL for a locale, mirroring the sitemap loc builder. */
function detailLoc(locale: SiteLocale, kind: 'artworks' | 'artists', slug: string): string {
  const encoded = encodeURIComponent(slug)
  if (locale === 'en') return `${BASE}/${kind}/${encoded}`
  const { prefix, segments } = LOCALE_ROUTE_CONFIG[locale]
  return `${BASE}${prefix}/${segments[kind]}/${encoded}`
}

/**
 * Submits the FULL catalog to IndexNow (Bing/Yahoo): artworks and artists across
 * all 10 locales plus the hub pages — ~1.1M URLs. The previous version only
 * covered en/es/pt artworks (~300k) and no artist pages.
 */
export async function POST(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (key !== process.env.IMPORT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allUrls: string[] = []

  // Hub pages per locale (home, artworks, artists, museums, genres, styles).
  for (const locale of HREFLANG_LOCALES) {
    if (locale === 'en') {
      allUrls.push(
        BASE,
        `${BASE}/artworks`,
        `${BASE}/artists`,
        `${BASE}/museums`,
        `${BASE}/genres`,
        `${BASE}/styles`,
      )
      continue
    }
    const { prefix, segments } = LOCALE_ROUTE_CONFIG[locale]
    allUrls.push(
      `${BASE}${prefix}`,
      `${BASE}${prefix}/${segments.artworks}`,
      `${BASE}${prefix}/${segments.artists}`,
      `${BASE}${prefix}/${segments.museums}`,
      `${BASE}${prefix}/${segments.genres}`,
      `${BASE}${prefix}/${segments.styles}`,
    )
  }

  // All artwork slugs + distinct artist slugs. Keyset pagination on id — a plain
  // OFFSET scan hits the statement timeout past ~80k rows (see sitemap builder).
  const artistSlugs = new Set<string>()
  let artworkCount = 0
  let cursor = 0
  while (true) {
    const { data, error } = await supabase
      .from('artworks')
      .select('id, slug, artist_display')
      .order('id', { ascending: true })
      .gt('id', cursor)
      .limit(1000)

    if (error || !data || data.length === 0) break

    for (const row of data as Array<{ id: number; slug: string | null; artist_display: string | null }>) {
      if (row.slug) {
        artworkCount++
        for (const locale of HREFLANG_LOCALES) {
          allUrls.push(detailLoc(locale, 'artworks', row.slug))
        }
      }
      const artist = row.artist_display?.trim()
      if (artist && !/^https?:\/\//i.test(artist)) {
        const seg = slugify(artist)
        if (seg) artistSlugs.add(seg)
      }
    }

    cursor = data[data.length - 1].id
    if (data.length < 1000) break
  }

  for (const seg of artistSlugs) {
    for (const locale of HREFLANG_LOCALES) {
      allUrls.push(detailLoc(locale, 'artists', seg))
    }
  }

  // Submit to IndexNow in batches of 10,000 (the API's per-request cap).
  const BATCH = 10000
  let submitted = 0
  let failed = 0
  const results = []

  for (let i = 0; i < allUrls.length; i += BATCH) {
    const batch = allUrls.slice(i, i + BATCH)
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'fineartfree.com',
        key: process.env.INDEXNOW_KEY,
        keyLocation: `https://fineartfree.com/${process.env.INDEXNOW_KEY}.txt`,
        urlList: batch
      })
    })
    if (res.status === 200 || res.status === 202) submitted += batch.length
    else failed += batch.length
    results.push({ batch: i / BATCH + 1, status: res.status, urls: batch.length })
    await new Promise(r => setTimeout(r, 200))
  }

  return NextResponse.json({
    message: `Submitted ${submitted} URLs to IndexNow (${failed} failed)`,
    artworks: artworkCount,
    artists: artistSlugs.size,
    totalUrls: allUrls.length,
    results
  })
}
