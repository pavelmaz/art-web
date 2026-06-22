import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { hubListPageMetadata } from "@/lib/list-page-metadata";

import { ArtistAzNav } from "@/components/ArtistAzNav";
import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getArtistsHubPage } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: ArtistsPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/de/artists",
    hub: "artists",
    title: { absolute: "Künstler — Vollständige Werke kostenlos | Fine Art Free" },
    description: "Gemeinfreie Kunst nach Künstler. Monet, Rembrandt, Van Gogh, Dürer und Hunderte mehr — kostenlos zum Download.",
    page,
    openGraph: {
    title: "Künstler — Vollständige Werke kostenlos | Fine Art Free",
    description:
      "Gemeinfreie Kunst nach Künstler. Monet, Rembrandt, Van Gogh, Dürer und Hunderte mehr — kostenlos zum Download.",
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
        <h1 className="mb-2 text-2xl font-semibold">Künstler</h1>
        <p className="mb-5 text-sm text-[#6b6b6b]">Werke nach Künstler entdecken</p>
        <ArtistAzNav basePath="/de/artists/letter" />
      </div>

      {artists.length ? (
        <BrowseHubGrid
          items={artists.map((artist) => ({
            name: artist.artistName,
            href: `/de/artists/${slugify(artist.artistName)}`,
            count: artist.count,
            imageId: artist.image_id,
            url: artist.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">Keine Künstler gefunden.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/de/artists" />
    </div>
  );
}
