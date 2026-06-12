import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { fillArtistHubPreviewImages, getCachedArtistsHubList } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import { slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Artists — Complete Works Free to Download | Fine Art Free",
  description:
    "Browse public domain artworks by artist. Monet, Rembrandt, Van Gogh, Dürer and hundreds more — all free to download.",
  alternates: {
    canonical: "https://fineartfree.com/artists",
    languages: buildHubLanguageAlternates("artists"),
  },
  openGraph: {
    title: "Artists — Complete Works Free to Download | Fine Art Free",
    description:
      "Browse public domain artworks by artist. Monet, Rembrandt, Van Gogh, Dürer and hundreds more — all free to download.",
  },
};

type ArtistsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ArtistsPage({ searchParams }: ArtistsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const artists = await getCachedArtistsHubList();
  const totalPages = Math.max(1, getTotalPages(artists.length));
  const paginatedArtists = await fillArtistHubPreviewImages(artists.slice(from, to + 1));

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Artists</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Browse artworks by artist</p>
      </div>

      {paginatedArtists.length ? (
        <BrowseHubGrid
          items={paginatedArtists.map((item) => ({
            name: item.display,
            href: item.slug ? `/artists/${item.slug}` : `/artists/${slugify(item.display)}`,
            count: item.count,
            imageId: item.image_id,
            url: item.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">No artists found.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/artists" />
    </div>
  );
}
