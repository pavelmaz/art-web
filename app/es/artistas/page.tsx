import type { Metadata } from "next";

import { ArtistAzNav } from "@/components/ArtistAzNav";
import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getArtistsHubPage } from "@/lib/cached-hub-data";
import { hubListPageMetadata } from "@/lib/list-page-metadata";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: ArtistsPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/es/artistas",
    hub: "artists",
    title: { absolute: "Artistas — Obras Completas Gratis para Descargar | Fine Art Free" },
    description: "Explora obras de arte de dominio público por artista. Monet, Rembrandt, Van Gogh, Dürer y cientos más — gratis para descargar.",
    page,
    openGraph: {
    title: "Artistas — Obras Completas Gratis para Descargar | Fine Art Free",
    description:
      "Explora obras de arte de dominio público por artista. Monet, Rembrandt, Van Gogh, Dürer y cientos más — gratis para descargar.",
  },
  });
}


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
        <p className="mb-5 text-sm text-[#6b6b6b]">Explorar obras de arte por artista</p>
        <ArtistAzNav basePath="/es/artistas/letter" />
      </div>

      {artists.length ? (
        <BrowseHubGrid
          items={artists.map((artist) => ({
            name: artist.artistName,
            href: `/es/artistas/${slugify(artist.artistName)}`,
            count: artist.count,
            imageId: artist.image_id,
            url: artist.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">No se encontraron artistas.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/es/artistas" />
    </div>
  );
}
