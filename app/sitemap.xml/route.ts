import { artworkSitemapPageCount } from "@/lib/artwork-sitemap-response";
import { getPublicSiteUrl, escapeXml } from "@/lib/sitemap-xml";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// No <lastmod> on index entries. The old value was one constant stamped on all
// 2,419 children; Google uses lastmod only when "consistently and verifiably
// accurate", and an identical date across the board is the opposite signal.

function emptySitemapIndex(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>
`;
}

export async function GET() {
  try {
    const base = getPublicSiteUrl();
    const pageCount = await artworkSitemapPageCount(supabase);
    const locs: string[] = [`${base}/sitemap/static`];
    for (let i = 0; i < pageCount; i++) {
      locs.push(`${base}/sitemap/artworks/${i}`);
    }
    for (let i = 0; i < pageCount; i++) {
      locs.push(`${base}/sitemap/es/artworks/${i}`);
    }
    for (let i = 0; i < pageCount; i++) {
      locs.push(`${base}/sitemap/pt/artworks/${i}`);
    }
    for (let i = 0; i < pageCount; i++) {
      locs.push(`${base}/sitemap/ja/artworks/${i}`);
    }
    for (const loc of ["fr", "de", "it", "ko", "ru", "zh"] as const) {
      for (let i = 0; i < pageCount; i++) {
        locs.push(`${base}/sitemap/${loc}/artworks/${i}`);
      }
      locs.push(`${base}/sitemap/${loc}`);
    }
    locs.push(`${base}/sitemap/es`);
    locs.push(`${base}/sitemap/pt`);
    locs.push(`${base}/sitemap/ja`);
    for (let i = 0; i < pageCount; i++) {
      locs.push(`${base}/sitemap/images/${i}`);
    }

    const body =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      locs
        .map((loc) => `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n  </sitemap>`)
        .join("\n") +
      "\n</sitemapindex>\n";

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new Response(emptySitemapIndex(), {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }
}
