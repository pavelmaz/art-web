import { CORE_XML_HEADERS, buildCoreUrlset, coreArtistSlugs } from "@/lib/core-sitemap";
import { getPublicSiteUrl } from "@/lib/sitemap-xml";

export const revalidate = 86400;

/** Artists with ≥ 5 works and a real biography (English pages; locale twins are linked via hreflang). */
export async function GET() {
  try {
    const base = getPublicSiteUrl();
    const slugs = await coreArtistSlugs();
    if (!slugs.length) throw new Error("[sitemap/core/artists] no URLs");
    const locs = slugs.map((slug) => `${base}/artists/${encodeURIComponent(slug)}`);
    return new Response(buildCoreUrlset(locs), { status: 200, headers: CORE_XML_HEADERS });
  } catch (err) {
    console.error("[sitemap/core/artists]", err);
    throw err;
  }
}
