import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { aggregateArtworksByField } from "@/lib/aggregate-artworks";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { slugify } from "@/lib/utils";

type MuseumsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

function isPrivateCollection(name: string): boolean {
  return name.trim().toLowerCase() === "private collection";
}

export default async function MuseumsPage({ searchParams }: MuseumsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const aggregated = await aggregateArtworksByField("museum", {
    excludeValue: isPrivateCollection,
  });

  const items = aggregated.map((row) => ({
    name: row.display,
    href: `/museums/${slugify(row.display)}`,
    count: row.count,
    imageId: row.image_id,
    url: row.url,
  }));

  const totalPages = Math.max(1, getTotalPages(items.length));
  const paginated = items.slice(from, to + 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Museums</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Browse artworks by museum</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">No museums found.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/museums" />
    </div>
  );
}
