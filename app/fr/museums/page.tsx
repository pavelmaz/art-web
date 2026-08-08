import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { hubListPageMetadata } from "@/lib/list-page-metadata";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedMuseumHub } from "@/lib/cached-hub-data";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";
import { museumLogoSrc } from "@/lib/museum-logos";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: MuseumsPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/fr/museums",
    hub: "museums",
    title: { absolute: "Collections des musées — Téléchargement gratuit | Fine Art Free" },
    description: "Art du domaine public par musée. Prado, Rijksmuseum, MFA Boston, National Gallery et plus — gratuit à télécharger.",
    page,
    openGraph: {
    title: "Collections des musées — Téléchargement gratuit | Fine Art Free",
    description:
      "Art du domaine public par musée. Prado, Rijksmuseum, MFA Boston, National Gallery et plus — gratuit à télécharger.",
  },
  });
}


type MuseumsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function MuseumsPage({ searchParams }: MuseumsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const aggregated = await getCachedMuseumHub();

  const items = aggregated.map((row) => {
    const slug = slugify(row.display);
    return {
      name: row.display,
      href: `/fr/museums/${slug}`,
      count: row.count,
      imageId: row.image_id,
      url: row.url,
      logoSrc: museumLogoSrc(slug),
      dark: true,
    };
  });

  const totalPages = pagesOrNotFound(page, items.length);
  const paginated = items.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Musées</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorer les œuvres par musée</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">Aucun musée trouvé.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/fr/museums" />
    </div>
  );
}
