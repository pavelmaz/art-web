import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedMuseumHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import { slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Museum Collections — Free Art Downloads | Fine Art Free",
  description:
    "Browse public domain art by museum. Prado, Rijksmuseum, MFA Boston, National Gallery and more — free to download.",
  alternates: {
    canonical: "https://fineartfree.com/museums",
    languages: buildHubLanguageAlternates("museums"),
  },
  openGraph: {
    title: "Museum Collections — Free Art Downloads | Fine Art Free",
    description:
      "Browse public domain art by museum. Prado, Rijksmuseum, MFA Boston, National Gallery and more — free to download.",
  },
};

type MuseumsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function MuseumsPage({ searchParams }: MuseumsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const aggregated = await getCachedMuseumHub();

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
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Museums</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Browse artworks by museum</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">No museums found.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/museums" />
    </div>
  );
}
