import {
  CORE_XML_HEADERS,
  buildCoreUrlset,
  coreArtworkLoc,
  coreArtworkSlugs,
  isCoreLocale,
  parseCorePage,
} from "@/lib/core-sitemap";
import { getPublicSiteUrl } from "@/lib/sitemap-xml";

export const revalidate = 86400;
export async function generateStaticParams(): Promise<{ locale: string; page: string }[]> {
  return [];
}

export async function GET(_req: Request, ctx: { params: Promise<{ locale: string; page: string }> }) {
  const { locale, page: rawPage } = await ctx.params;
  const page = parseCorePage(rawPage);
  if (!isCoreLocale(locale) || page === null) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const base = getPublicSiteUrl();
    const slugs = await coreArtworkSlugs(locale, page);
    if (!slugs.length && page === 0) throw new Error(`[sitemap/core/artworks/${locale}] no URLs`);
    const locs = slugs.map((slug) => coreArtworkLoc(base, locale, slug.trim()));
    return new Response(buildCoreUrlset(locs), { status: 200, headers: CORE_XML_HEADERS });
  } catch (err) {
    console.error(`[sitemap/core/artworks/${locale}/${rawPage}]`, err);
    throw err;
  }
}
