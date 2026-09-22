import {
  CORE_XML_HEADERS,
  buildCoreImageUrlset,
  coreArtworkRows,
  coreImageEntry,
  parseCorePage,
  type CoreImageEntry,
} from "@/lib/core-sitemap";
import { getPublicSiteUrl } from "@/lib/sitemap-xml";

export const revalidate = 86400;
export async function generateStaticParams(): Promise<{ page: string }[]> {
  return [];
}

/** Image sitemap for the English core artworks (Google Images is a realistic channel for art). */
export async function GET(_req: Request, ctx: { params: Promise<{ page: string }> }) {
  const { page: rawPage } = await ctx.params;
  const page = parseCorePage(rawPage);
  if (page === null) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const base = getPublicSiteUrl();
    const rows = await coreArtworkRows("en", page);
    const entries = rows.map((r) => coreImageEntry(base, r)).filter((e): e is CoreImageEntry => e !== null);
    if (!entries.length && page === 0) throw new Error("[sitemap/core/images] no URLs");
    return new Response(buildCoreImageUrlset(entries), { status: 200, headers: CORE_XML_HEADERS });
  } catch (err) {
    console.error(`[sitemap/core/images/${rawPage}]`, err);
    throw err;
  }
}
