import { buildArtworkSitemapPageResponse } from "@/lib/artwork-sitemap-response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ page: string }> }
) {
  const { page } = await context.params;
  return buildArtworkSitemapPageResponse("ru", page);
}
