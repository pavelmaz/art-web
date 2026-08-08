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
    canonicalPath: "/ru/genres",
    hub: "genres",
    title: { absolute: "Художественные жанры — Бесплатная загрузка | Fine Art Free" },
    description: "Искусство по жанрам. Пейзаж, портрет, натюрморт, религиозное и др. — бесплатно в высоком разрешении.",
    page,
    openGraph: {
    title: "Художественные жанры — Бесплатная загрузка | Fine Art Free",
    description:
      "Искусство по жанрам. Пейзаж, портрет, натюрморт, религиозное и др. — бесплатно в высоком разрешении.",
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
  name_ru: string | null;
  slug_ru: string | null;
  description_ru: string | null;
};

export default async function GenresPage({ searchParams }: GenresPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const [aggregated, genresQuery] = await Promise.all([
    getCachedGenreHub(),
    supabase
      .from("genres")
      .select("id, slug, name, name_ru, slug_ru, description_ru")
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
    const linkSlug = genre.slug_ru?.trim() || genre.slug;
    const displayName = genre.name_ru?.trim() || genre.name;
    return [
      {
        name: displayName,
        href: `/ru/genres/${linkSlug}`,
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
        <h1 className="mb-2 text-2xl font-semibold">Жанры</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Работы по жанрам</p>
      </div>

      {paginated.length ? (
        <BrowseHubGrid items={paginated} />
      ) : (
        <p className="text-sm text-[#6b6b6b]">Жанры не найдены.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ru/genres" />
    </div>
  );
}
