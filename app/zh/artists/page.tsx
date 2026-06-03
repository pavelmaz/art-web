import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getArtistsHubPage } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "艺术家 — 全集免费下载 | Fine Art Free" },
  description:
    "按艺术家浏览公共领域艺术。莫奈、伦勃朗、梵高、丢勒等数百位 — 免费下载。",
  alternates: {
    canonical: canonicalHubUrl("zh", "artists"),
    languages: buildHubLanguageAlternates("artists"),
  },
  openGraph: {
    title: "艺术家 — 全集免费下载 | Fine Art Free",
    description:
      "按艺术家浏览公共领域艺术。莫奈、伦勃朗、梵高、丢勒等数百位 — 免费下载。",
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
        <h1 className="mb-2 text-2xl font-semibold">艺术家</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">按艺术家浏览作品</p>
      </div>

      {artists.length ? (
        <BrowseHubGrid
          items={artists.map((artist) => ({
            name: artist.artistName,
            href: `/zh/artists/${slugify(artist.artistName)}`,
            count: artist.count,
            imageId: artist.image_id,
            url: artist.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">未找到艺术家。</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/zh/artists" />
    </div>
  );
}
