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
  title: "Kunstgenres — Kostenloser Download | Fine Art Free",
  description:
    "Gemeinfreie Kunst nach Genre. Landschaft, Porträt, Stillleben, Religiös und mehr — kostenlos in hoher Auflösung.",
  alternates: {
    canonical: canonicalHubUrl("de", "genres"),
    languages: buildHubLanguageAlternates("genres"),
  },
  openGraph: {
    title: "Kunstgenres — Kostenloser Download | Fine Art Free",
    description:
      "Gemeinfreie Kunst nach Genre. Landschaft, Porträt, Stillleben, Religiös und mehr — kostenlos in hoher Auflösung.",
  },
};

type GenresPageProps = {
  searchParams: Promise<{ page?: string }>;
};

type GenreListRow = {
  id: string;
  slug: string;
  name: string;
  name_de: string | null;
  slug_de: string | null;
  description_de: string | null;
};

export default async function GenresPage({ searchParams }: GenresPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const [aggregated, genresQuery] = await Promise.all([
    getCachedGenreHub(),
    supabase
      .from("genres")
      .select("id, slug, name, name_de, slug_de, description_de")
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
    const linkSlug = genre.slug_de?.trim() || genre.slug;
    const displayName = genre.name_de?.trim() || genre.name;
    return [
      {
        name: displayName,
        href: `/de/genres/${linkSlug}`,
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
        <h1 className="mb-2 text-2xl font-semibold">Géneros</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Explorar obras de arte por género</p>
      </div>

      {paginated.length ? (
        <BrowseHubGrid items={paginated} />
      ) : (
        <p className="text-sm text-[#6b6b6b]">No se encontraron géneros.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/de/genres" />
    </div>
  );
}
