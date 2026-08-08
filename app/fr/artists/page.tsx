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
    canonicalPath: "/fr/artists",
    hub: "artists",
    title: { absolute: "Artistes — Œuvres complètes gratuites | Fine Art Free" },
    description: "Art du domaine public par artiste. Monet, Rembrandt, Van Gogh, Dürer et des centaines d'autres — gratuit à télécharger.",
    page,
    openGraph: {
    title: "Artistes — Œuvres complètes gratuites | Fine Art Free",
    description:
      "Art du domaine public par artiste. Monet, Rembrandt, Van Gogh, Dürer et des centaines d'autres — gratuit à télécharger.",
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
        <h1 className="mb-2 text-2xl font-semibold">Artistes</h1>
        <p className="mb-5 text-sm text-[#6b6b6b]">Explorer les œuvres par artiste</p>
        <ArtistAzNav basePath="/fr/artists/letter" />
      </div>

      {artists.length ? (
        <BrowseHubGrid
          items={artists.map((artist) => ({
            name: artist.artistName,
            href: `/fr/artists/${slugify(artist.artistName)}`,
            count: artist.count,
            imageId: artist.image_id,
            url: artist.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">Aucun artiste trouvé.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/fr/artists" />
    </div>
  );
}
