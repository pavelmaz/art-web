import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedGenreHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";
import { getT } from "@/lib/translations";

export const revalidate = 86400;

const t = getT("ja");

export const metadata: Metadata = {
  title: "ジャンル一覧 — パブリックドメイン無料 | Fine Art Free",
  description:
    "風景、肖像、静物、宗教画など、ジャンル別にパブリックドメインの名作を高解像度で無料ダウンロード。",
  alternates: {
    canonical: absoluteUrl("/ja/genres"),
    languages: {
      en: absoluteUrl("/genres"),
      es: absoluteUrl("/es/generos"),
      pt: absoluteUrl("/pt/generos"),
      ja: absoluteUrl("/ja/genres"),
    },
  },
  openGraph: {
    title: "ジャンル一覧 — パブリックドメイン無料 | Fine Art Free",
    description:
      "風景、肖像、静物、宗教画など、ジャンル別にパブリックドメインの名作を高解像度で無料ダウンロード。",
  },
};

type GenresPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function GenresPage({ searchParams }: GenresPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const [aggregated, genresQuery] = await Promise.all([
    getCachedGenreHub(),
    supabase.from("genres").select("name, name_es, name_ja, slug, slug_es, slug_ja, description, description_ja").order("name"),
  ]);

  const genresByName = new Map(
    (
      (genresQuery.data as Array<{
        name: string;
        name_es: string | null;
        name_ja: string | null;
        slug: string;
        slug_es: string | null;
        slug_ja: string | null;
        description: string | null;
        description_ja: string | null;
      }>) ?? []
    ).map((g) => [g.name.toLowerCase(), g])
  );

  const items = aggregated.flatMap((row) => {
    const genre = genresByName.get(row.display.toLowerCase());
    if (!genre) {
      return [];
    }
    const linkSlug = genre.slug;
    return [
      {
        name: genre.name_ja?.trim() || genre.name,
        href: `/ja/genres/${linkSlug}`,
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
        <h1 className="mb-2 text-2xl font-semibold">{t.genres}</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">ジャンル別に作品を探す</p>
      </div>

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">{t.noResults}</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/ja/genres" />
    </div>
  );
}
