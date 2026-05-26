import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data: artworks } = await supabase
    .from('artworks')
    .select('slug, title, artist_display, description, image_id, url, created_at')
    .not('description', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = (artworks || []).map(a => {
    const pageUrl = `https://fineartfree.com/artworks/${a.slug}`
    const imageUrl = a.image_id?.startsWith('http') ? a.image_id : null
    const desc = a.description?.slice(0, 300).replace(/[<>&'"]/g, (c: string) =>
      ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c] || c)
    ) + '...'

    return `
    <item>
      <title>${a.title} by ${a.artist_display || 'Unknown'}</title>
      <link>${pageUrl}</link>
      <guid isPermaLink="true">${pageUrl}</guid>
      <description>${desc}</description>
      <pubDate>${new Date(a.created_at).toUTCString()}</pubDate>
      ${imageUrl ? `<enclosure url="${imageUrl}" type="image/jpeg"/>` : ''}
    </item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Fine Art Free - Public Domain Artwork</title>
    <link>https://fineartfree.com</link>
    <description>Free public domain art downloads - paintings, drawings and illustrations</description>
    <language>en</language>
    <atom:link href="https://fineartfree.com/feed" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    }
  })
}
