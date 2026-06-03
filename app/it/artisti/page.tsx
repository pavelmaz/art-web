import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getArtistsHubPage } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Artistas — Opere Completas Gratis para Descargar | Fine Art Free",
  description:
    "Explora opere de arte de dominio público por artista. Monet, Rembrandt, Van Gogh, Dürer y cientos más — gratis para descargar.",
  alternates: {
    canonical: canonicalHubUrl("it", "artists"),
    languages: buildHubLanguageAlternates("artists"),
  },
  openGraph: {
    title: "Artistas — Opere Completas Gratis para Descargar | Fine Art Free",
    description:
      "Explora opere de arte de dominio público por artista. Monet, Rembrandt, Van Gogh, Dürer y cientos más — gratis para descargar.",
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
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorar opere de arte por artista</p>
      </div>

      {artists.length ? (
        <BrowseHubGrid
          items={artists.map((artist) => ({
            name: artist.artistName,
            href: `/it/artisti/${slugify(artist.artistName)}`,
            count: artist.count,
            imageId: artist.image_id,
            url: artist.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">No se encontraron artisti.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/it/artisti" />
    </div>
  );
}
