import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getArtistsHubPage } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Artistas — 작품 Completas Gratis para Descargar | Fine Art Free",
  description:
    "Explora 작품 de arte de dominio público por artista. Monet, Rembrandt, Van Gogh, Dürer y cientos más — gratis para descargar.",
  alternates: {
    canonical: absoluteUrl("/ko/예술가"),
    languages: buildHubLanguageAlternates("artists"),
  },
  openGraph: {
    title: "Artistas — 작품 Completas Gratis para Descargar | Fine Art Free",
    description:
      "Explora 작품 de arte de dominio público por artista. Monet, Rembrandt, Van Gogh, Dürer y cientos más — gratis para descargar.",
  },
};

type ArtistsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ArtistsPage({ searchParams }: ArtistsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page } = getPaginationParams(resolvedSearchParams);

  const { artists, totalCount } = await getArtistsHubPage(page);
  const totalPages = Math.max(1, getTotalPages(totalCount));

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Artistas</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorar 작품 de arte por artista</p>
      </div>

      {artists.length ? (
        <BrowseHubGrid
          items={artists.map((artist) => ({
            name: artist.artistName,
            href: `/ko/예술가/${slugify(artist.artistName)}`,
            count: artist.count,
            imageId: artist.image_id,
            url: artist.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">No se encontraron 예술가.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ko/예술가" />
    </div>
  );
}
