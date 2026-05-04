import { getPublicSiteUrl, escapeXml } from "@/lib/sitemap-xml";

export const dynamic = "force-dynamic";

/** 72_297 / 500 → pages 0 … 144 (145 child sitemaps). */
const ARTWORK_SITEMAP_COUNT = 145;

function emptySitemapIndex(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>
`;
}

export async function GET() {
  try {
    const base = getPublicSiteUrl();
    const locs: string[] = [`${base}/sitemap/static`];
    for (let i = 0; i < ARTWORK_SITEMAP_COUNT; i++) {
      locs.push(`${base}/sitemap/artworks/${i}`);
    }

    const body =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      locs
        .map(
          (loc) =>
            `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n  </sitemap>`
        )
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
