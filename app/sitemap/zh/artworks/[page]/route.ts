import { buildArtworkSitemapPageResponse } from "@/lib/artwork-sitemap-response";

export const revalidate = 86400;

// Empty on purpose: nothing is generated at build time; each file is built on
// first request and cached for 24h (ISR). Without this export a dynamic route
// renders on every hit — the sitemaps were regenerated from Supabase per crawl.
export async function generateStaticParams(): Promise<{ page: string }[]> {
  return [];
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ page: string }> }
) {
  const { page } = await context.params;
  return buildArtworkSitemapPageResponse("zh", page);
}
