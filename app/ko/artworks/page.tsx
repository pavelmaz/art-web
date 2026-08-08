import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { hubListPageMetadata } from "@/lib/list-page-metadata";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedArtworksBrowseSlice, getCachedArtworksSearchResults } from "@/lib/cached-artworks-page";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { absoluteUrl } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: ArtworksPageProps): Promise<Metadata> {
  const { page, q } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/ko/artworks",
    hub: "artworks",
    title: { absolute: "모든 작품 탐색 — 무료 퍼블릭 도메인 아트 | Fine Art Free" },
    description: "72,000점 이상의 퍼블릭 도메인 작품을 고해상도로 다운로드하세요. 클래식 회화, 판화, 일러스트를 무료로 이용하세요.",
    page,
    q,
    openGraph: {
    title: "모든 작품 탐색 — 무료 퍼블릭 도메인 아트 | Fine Art Free",
    description:
      "72,000점 이상의 퍼블릭 도메인 작품을 고해상도로 다운로드하세요. 클래식 회화, 판화, 일러스트를 무료로 이용하세요.",
  },
  });
}


function toImageUrl(imageId: string | null): string {
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

type ArtworksPageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q?.trim() ?? "";
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  if (q) {
    let searchRows;
    try {
      searchRows = await getCachedArtworksSearchResults(q);
    } catch (error) {
      console.error("Artworks search query error:", error);
      return (
        <div className="space-y-6 px-5">
          <h1 className="text-3xl font-bold tracking-tight">작품</h1>
          <p>데이터를 불러오는 중 오류가 발생했습니다</p>
        </div>
      );
    }

    const artworks: Artwork[] = searchRows.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      artistName: item.artist_display ?? "Unknown artist",
      artistDisplay: item.artist_display ?? undefined,
      imageUrl: toImageUrl(item.image_id),
      imageId: item.image_id,
      museum: item.museum,
      styleTitle: null,
      genreTitle: null,
      score: null,
      url: null,
      styleSlug: "unknown",
      styleName: "Unknown style",
      sourceUrl: undefined,
      altText: (item.alt_text as string | null) ?? null,
    }));

    if (!artworks.length) {
      return (
        <div className="space-y-6 px-5">
          <h1 className="text-3xl font-bold tracking-tight">작품</h1>
          <p>검색 결과 없음: {q}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 px-5">
        <h1 className="text-3xl font-bold tracking-tight">작품</h1>
        <p className="text-sm text-[#6b6b6b]">검색 결과: &quot;{q}&quot;</p>
        <ArtworkGrid artworks={artworks} basePath="/ko" />
      </div>
    );
  }

  let rows;
  let totalCount;
  try {
    const slice = await getCachedArtworksBrowseSlice(from, to);
    rows = slice.rows;
    totalCount = slice.totalCount;
  } catch (error) {
    console.error("Artworks primary query error:", error);
    return <p>데이터를 불러오는 중 오류가 발생했습니다</p>;
  }

  const artworks: Artwork[] = rows.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    artistName: item.artist_display ?? "Unknown artist",
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: toImageUrl(item.image_id),
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: item.style_title,
    genreTitle: item.genre_title,
    score: item.score,
    url: item.url,
    styleSlug: "unknown",
    styleName: item.style_title ?? "Unknown style",
    sourceUrl: item.url ?? undefined,
    altText: (item.alt_text as string | null) ?? null,
  }));

  if (!artworks.length) {
    return (
      <div className="space-y-6 px-5">
        <h1 className="text-3xl font-bold tracking-tight">작품</h1>
        <p>작품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-5">
      <h1 className="text-3xl font-bold tracking-tight">작품</h1>
      <ArtworkGrid artworks={artworks} basePath="/ko" />
      <Pagination
        currentPage={page}
        totalPages={pagesOrNotFound(page, totalCount)}
        basePath="/ko/artworks"
      />
    </div>
  );
}
