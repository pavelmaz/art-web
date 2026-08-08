import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { hubListPageMetadata } from "@/lib/list-page-metadata";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedGenreHub } from "@/lib/cached-hub-data";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: GenresPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/ko/genres",
    hub: "genres",
    title: { absolute: "예술 장르 — 무료 다운로드 | Fine Art Free" },
    description: "장르별 예술. 풍경, 초상, 정물, 종교 등 — 고해상도 무료 다운로드.",
    page,
    openGraph: {
    title: "예술 장르 — 무료 다운로드 | Fine Art Free",
    description:
      "장르별 예술. 풍경, 초상, 정물, 종교 등 — 고해상도 무료 다운로드.",
  },
  });
}


type GenresPageProps = {
  searchParams: Promise<{ page?: string }>;
};

type GenreListRow = {
  id: string;
  slug: string;
  name: string;
  name_ko: string | null;
  slug_ko: string | null;
  description_ko: string | null;
};

export default async function GenresPage({ searchParams }: GenresPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const [aggregated, genresQuery] = await Promise.all([
    getCachedGenreHub(),
    supabase
      .from("genres")
      .select("id, slug, name, name_ko, slug_ko, description_ko")
      .order("name"),
  ]);

  const genresByName = new Map(
    ((genresQuery.data as GenreListRow[] | null) ?? []).map((g) => [g.name.toLowerCase(), g])
  );

  const items = aggregated.flatMap((row) => {
    const genre = genresByName.get(row.display.toLowerCase());
    if (!genre) {
      return [];
    }
    const linkSlug = genre.slug_ko?.trim() || genre.slug;
    const displayName = genre.name_ko?.trim() || genre.name;
    return [
      {
        name: displayName,
        href: `/ko/genres/${linkSlug}`,
        count: row.count,
        imageId: row.image_id,
        url: row.url,
      },
    ];
  });

  const totalPages = pagesOrNotFound(page, items.length);
  const paginated = items.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">장르</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">장르별 작품 탐색</p>
      </div>

      {paginated.length ? (
        <BrowseHubGrid items={paginated} />
      ) : (
        <p className="text-sm text-[#6b6b6b]">장르를 찾을 수 없습니다.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ko/genres" />
    </div>
  );
}
