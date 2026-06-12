import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedGenreHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { hubListPageMetadata } from "@/lib/list-page-metadata";
import { slugify } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: GenresPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/genres",
    hub: "genres",
    title: "Art Genres — Free Public Domain Downloads | Fine Art Free",
    description: "Browse public domain art by genre. Landscape, Portrait, Still Life, Religious and more — all free to download in high resolution.",
    page,
    openGraph: {
    title: "Art Genres — Free Public Domain Downloads | Fine Art Free",
    description:
      "Browse public domain art by genre. Landscape, Portrait, Still Life, Religious and more — all free to download in high resolution.",
  },
  });
}


type GenresPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function GenresPage({ searchParams }: GenresPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const aggregated = await getCachedGenreHub();

  const items = aggregated.map((row) => ({
    name: row.display,
    href: `/genres/${slugify(row.display)}`,
    count: row.count,
    imageId: row.image_id,
    url: row.url,
  }));

  const totalPages = Math.max(1, getTotalPages(items.length));
  const paginated = items.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Genres</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Browse artworks by genre</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">No genres found.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/genres" />
    </div>
  );
}
