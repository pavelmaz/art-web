import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedMuseumHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Collections des musées — Téléchargement gratuit | Fine Art Free",
  description:
    "Art du domaine public par musée. Prado, Rijksmuseum, MFA Boston, National Gallery et plus — gratuit à télécharger.",
  alternates: {
    canonical: canonicalHubUrl("fr", "museums"),
    languages: buildHubLanguageAlternates("museums"),
  },
  openGraph: {
    title: "Collections des musées — Téléchargement gratuit | Fine Art Free",
    description:
      "Art du domaine public par musée. Prado, Rijksmuseum, MFA Boston, National Gallery et plus — gratuit à télécharger.",
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
    href: `/fr/museums/${slugify(row.display)}`,
    count: row.count,
    imageId: row.image_id,
    url: row.url,
  }));

  const totalPages = Math.max(1, getTotalPages(items.length));
  const paginated = items.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Museos</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorar œuvres de arte por museo</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">No se encontraron musées.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/fr/museums" />
    </div>
  );
}
