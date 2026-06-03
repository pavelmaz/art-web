import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedGenreHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "艺术流派 — 免费下载 | Fine Art Free" },
  description:
    "按流派浏览。风景、肖像、静物、宗教等 — 高分辨率免费下载。",
  alternates: {
    canonical: canonicalHubUrl("zh", "genres"),
    languages: buildHubLanguageAlternates("genres"),
  },
  openGraph: {
    title: "艺术流派 — 免费下载 | Fine Art Free",
    description:
      "按流派浏览。风景、肖像、静物、宗教等 — 高分辨率免费下载。",
  },
};

type GenresPageProps = {
  searchParams: Promise<{ page?: string }>;
};

type GenreListRow = {
  id: string;
  slug: string;
  name: string;
  name_zh: string | null;
  slug_zh: string | null;
  description_zh: string | null;
};

export default async function GenresPage({ searchParams }: GenresPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const [aggregated, genresQuery] = await Promise.all([
    getCachedGenreHub(),
    supabase
      .from("genres")
      .select("id, slug, name, name_zh, slug_zh, description_zh")
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
    const linkSlug = genre.slug_zh?.trim() || genre.slug;
    const displayName = genre.name_zh?.trim() || genre.name;
    return [
      {
        name: displayName,
        href: `/zh/genres/${linkSlug}`,
        count: row.count,
        imageId: row.image_id,
        url: row.url,
      },
    ];
  });

  const totalPages = Math.max(1, getTotalPages(items.length));
  const paginated = items.slice(from, to + 1);

  return (
    <div className="space-y-8 px-5">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">流派</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">按流派浏览作品</p>
      </div>

      {paginated.length ? (
        <BrowseHubGrid items={paginated} />
      ) : (
        <p className="text-sm text-[#6b6b6b]">未找到流派。</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/zh/genres" />
    </div>
  );
}
