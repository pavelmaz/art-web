import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getArtistsHubPage } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "Artistes — Œuvres complètes gratuites | Fine Art Free" },
  description:
    "Art du domaine public par artiste. Monet, Rembrandt, Van Gogh, Dürer et des centaines d'autres — gratuit à télécharger.",
  alternates: {
    canonical: canonicalHubUrl("fr", "artists"),
    languages: buildHubLanguageAlternates("artists"),
  },
  openGraph: {
    title: "Artistes — Œuvres complètes gratuites | Fine Art Free",
    description:
      "Art du domaine public par artiste. Monet, Rembrandt, Van Gogh, Dürer et des centaines d'autres — gratuit à télécharger.",
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
        <h1 className="mb-2 text-2xl font-semibold">Artistes</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorer les œuvres par artiste</p>
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
