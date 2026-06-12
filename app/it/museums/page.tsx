import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { hubListPageMetadata } from "@/lib/list-page-metadata";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedMuseumHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: MuseumsPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/it/museums",
    hub: "museums",
    title: { absolute: "Collezioni dei musei — Download gratuito | Fine Art Free" },
    description: "Arte di pubblico dominio per museo. Prado, Rijksmuseum, MFA Boston, National Gallery e altri — gratis da scaricare.",
    page,
    openGraph: {
    title: "Collezioni dei musei — Download gratuito | Fine Art Free",
    description:
      "Arte di pubblico dominio per museo. Prado, Rijksmuseum, MFA Boston, National Gallery e altri — gratis da scaricare.",
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

  const items = aggregated.map((row) => ({
    name: row.display,
    href: `/it/museums/${slugify(row.display)}`,
    count: row.count,
    imageId: row.image_id,
    url: row.url,
  }));

  const totalPages = Math.max(1, getTotalPages(items.length));
  const paginated = items.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Musei</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Esplora opere per museo</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">Nessun museo trovato.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/it/museums" />
    </div>
  );
}
