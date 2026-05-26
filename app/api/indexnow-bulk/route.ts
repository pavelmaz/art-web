import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (key !== process.env.IMPORT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allUrls: string[] = [
    'https://fineartfree.com',
    'https://fineartfree.com/artworks',
    'https://fineartfree.com/artists',
    'https://fineartfree.com/museums',
    'https://fineartfree.com/genres',
    'https://fineartfree.com/styles',
    'https://fineartfree.com/topics',
    'https://fineartfree.com/countries',
    'https://fineartfree.com/es',
    'https://fineartfree.com/pt',
    'https://fineartfree.com/es/artistas',
    'https://fineartfree.com/es/museos',
    'https://fineartfree.com/pt/artistas',
    'https://fineartfree.com/pt/museus',
  ]

  // Fetch all artwork slugs in batches
  let from = 0
  const batchSize = 1000
  let total = 0

  while (true) {
    const { data, error } = await supabase
      .from('artworks')
      .select('slug')
      .range(from, from + batchSize - 1)

    if (error || !data || data.length === 0) break

    for (const { slug } of data) {
      if (!slug) continue
      allUrls.push(`https://fineartfree.com/artworks/${slug}`)
      allUrls.push(`https://fineartfree.com/es/obras/${slug}`)
      allUrls.push(`https://fineartfree.com/pt/obras/${slug}`)
    }

    total += data.length
    from += batchSize
    if (data.length < batchSize) break
  }

  // Submit to IndexNow in batches of 10,000
  const BATCH = 10000
  let submitted = 0
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
    submitted += batch.length
    results.push({ batch: i / BATCH + 1, status: res.status, urls: batch.length })
    await new Promise(r => setTimeout(r, 500))
  }

  return NextResponse.json({
    message: `Submitted ${submitted} URLs to IndexNow`,
    artworks: total,
    totalUrls: allUrls.length,
    results
  })
}
