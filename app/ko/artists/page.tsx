import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getArtistsHubPage } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { absoluteUrl, slugify } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "예술가 — 전 작품 무료 다운로드 | Fine Art Free" },
  description:
    "예술가별 퍼블릭 도메인 예술. 모네, 렘브란트, 반 고흐, 뒤러 등 수백 명 — 무료 다운로드.",
  alternates: {
    canonical: canonicalHubUrl("ko", "artists"),
    languages: buildHubLanguageAlternates("artists"),
  },
  openGraph: {
    title: "예술가 — 전 작품 무료 다운로드 | Fine Art Free",
    description:
      "예술가별 퍼블릭 도메인 예술. 모네, 렘브란트, 반 고흐, 뒤러 등 수백 명 — 무료 다운로드.",
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
        <h1 className="mb-2 text-2xl font-semibold">예술가</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">예술가별 작품 탐색</p>
      </div>

      {artists.length ? (
        <BrowseHubGrid
          items={artists.map((artist) => ({
            name: artist.artistName,
            href: `/ko/artists/${slugify(artist.artistName)}`,
            count: artist.count,
            imageId: artist.image_id,
            url: artist.url,
          }))}
        />
      ) : (
        <p className="text-sm text-[#6b6b6b]">예술가를 찾을 수 없습니다.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ko/artists" />
    </div>
  );
}
