import {
  CORE_LOCALES,
  CORE_XML_HEADERS,
  buildCoreSitemapIndex,
  coreArtworkPageCount,
} from "@/lib/core-sitemap";
import { getPublicSiteUrl } from "@/lib/sitemap-xml";

export const revalidate = 86400;

/**
 * The index Google gets (robots.txt + Search Console): only pages worth
 * indexing. The full catalogue index stays at /sitemap.xml for Bing/IndexNow.
 * See lib/core-sitemap.ts. No <lastmod>: we have no verifiable per-URL dates.
 */
export async function GET() {
  try {
    const base = getPublicSiteUrl();
    const locs: string[] = [`${base}/sitemap/core/hubs`, `${base}/sitemap/core/artists`];
    for (const locale of CORE_LOCALES) {
      const pages = await coreArtworkPageCount(locale);
      for (let i = 0; i < pages; i++) {
        locs.push(`${base}/sitemap/core/artworks/${locale}/${i}`);
      }
      if (locale === "en") {
        for (let i = 0; i < pages; i++) {
          locs.push(`${base}/sitemap/core/images/${i}`);
        }
      }
    }
    return new Response(buildCoreSitemapIndex(locs), { status: 200, headers: CORE_XML_HEADERS });
  } catch (err) {
    // Throw rather than cache an empty index for 24h.
    console.error("[sitemap-core.xml]", err);
    throw err;
  }
}
