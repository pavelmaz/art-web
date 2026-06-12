import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedMuseumHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Coleções de Museus — Arte Grátis para Baixar | Fine Art Free",
  description:
    "Explore arte de domínio público por museu. Prado, Rijksmuseum, MFA Boston, National Gallery e mais — grátis para baixar.",
  alternates: {
    canonical: absoluteUrl("/pt/museus"),
    languages: buildHubLanguageAlternates("museums"),
  },
  openGraph: {
    title: "Coleções de Museus — Arte Grátis para Baixar | Fine Art Free",
    description:
      "Explore arte de domínio público por museu. Prado, Rijksmuseum, MFA Boston, National Gallery e mais — grátis para baixar.",
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
    href: `/pt/museus/${slugify(row.display)}`,
    count: row.count,
    imageId: row.image_id,
    url: row.url,
  }));

  const totalPages = Math.max(1, getTotalPages(items.length));
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
