import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { hubListPageMetadata } from "@/lib/list-page-metadata";

import { ArtistAzNav } from "@/components/ArtistAzNav";
import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getArtistsHubPage } from "@/lib/cached-hub-data";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: ArtistsPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/it/artists",
    hub: "artists",
    title: { absolute: "Artisti — Opere complete gratuite | Fine Art Free" },
    description: "Arte di pubblico dominio per artista. Monet, Rembrandt, Van Gogh, Dürer e centinaia di altri — gratis da scaricare.",
    page,
    openGraph: {
    title: "Artisti — Opere complete gratuite | Fine Art Free",
    description:
      "Arte di pubblico dominio per artista. Monet, Rembrandt, Van Gogh, Dürer e centinaia di altri — gratis da scaricare.",
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
  const totalPages = pagesOrNotFound(page, totalCount);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Artisti</h1>
        <p className="mb-5 text-sm text-[#6b6b6b]">Esplora opere per artista</p>
        <ArtistAzNav basePath="/it/artists/letter" />
      </div>

      {artists.length ? (
        <BrowseHubGrid
          items={artists.map((artist) => ({
            name: artist.artistName,
            href: `/it/artists/${slugify(artist.artistName)}`,
            count: artist.count,
            imageId: artist.image_id,
            url: artist.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">Nessun artista trovato.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/it/artists" />
    </div>
  );
}
