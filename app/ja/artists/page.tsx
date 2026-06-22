import type { Metadata } from "next";

import { ArtistAzNav } from "@/components/ArtistAzNav";
import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getArtistsHubPage } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { hubListPageMetadata } from "@/lib/list-page-metadata";
import { absoluteUrl, slugify } from "@/lib/utils";
import { getT } from "@/lib/translations";

export const revalidate = 86400;

const t = getT("ja");

export async function generateMetadata({ searchParams }: ArtistsPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/ja/artists",
    hub: "artists",
    title: "芸術家一覧 — 全作品無料ダウンロード | Fine Art Free",
    description: "モネ、レンブラント、ゴッホ、デューラーなど、パブリックドメインの名作を作家別に無料で高解像度ダウンロード。",
    page,
    openGraph: {
    title: "芸術家一覧 — 全作品無料ダウンロード | Fine Art Free",
    description:
      "モネ、レンブラント、ゴッホ、デューラーなど、パブリックドメインの名作を作家別に無料で高解像度ダウンロード。",
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
        <h1 className="mb-2 text-2xl font-semibold">{t.artists}</h1>
        <p className="mb-5 text-sm text-[#6b6b6b]">作家別に作品を探す</p>
        <ArtistAzNav basePath="/ja/artists/letter" />
      </div>

      {artists.length ? (
        <BrowseHubGrid
          items={artists.map((artist) => ({
            name: artist.artistName,
            href: `/ja/artists/${slugify(artist.artistName)}`,
            count: artist.count,
            imageId: artist.image_id,
            url: artist.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">{t.noArtistsFound}</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ja/artists" />
    </div>
  );
}
