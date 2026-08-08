import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedMuseumHub } from "@/lib/cached-hub-data";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { hubListPageMetadata } from "@/lib/list-page-metadata";
import { absoluteUrl, slugify } from "@/lib/utils";
import { museumLogoSrc } from "@/lib/museum-logos";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: MuseumsPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/pt/museus",
    hub: "museums",
    title: { absolute: "Coleções de Museus — Arte Grátis para Baixar | Fine Art Free" },
    description: "Explore arte de domínio público por museu. Prado, Rijksmuseum, MFA Boston, National Gallery e mais — grátis para baixar.",
    page,
    openGraph: {
    title: "Coleções de Museus — Arte Grátis para Baixar | Fine Art Free",
    description:
      "Explore arte de domínio público por museu. Prado, Rijksmuseum, MFA Boston, National Gallery e mais — grátis para baixar.",
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
      href: `/pt/museus/${slug}`,
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
        <h1 className="mb-2 text-2xl font-semibold">Museus</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorar obras de arte por museu</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">Nenhum museu encontrado.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/pt/museus" />
    </div>
  );
}
