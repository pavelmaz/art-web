import { buildHubLanguageAlternates, canonicalHubUrl } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { hubListPageMetadata } from "@/lib/list-page-metadata";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedGenreHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: GenresPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/it/genres",
    hub: "genres",
    title: { absolute: "Generi artistici — Download gratuito | Fine Art Free" },
    description: "Arte per genere. Paesaggio, ritratto, natura morta, religioso e altro — gratis in alta risoluzione.",
    page,
    openGraph: {
    title: "Generi artistici — Download gratuito | Fine Art Free",
    description:
      "Arte per genere. Paesaggio, ritratto, natura morta, religioso e altro — gratis in alta risoluzione.",
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
  name_it: string | null;
  slug_it: string | null;
  description_it: string | null;
};

export default async function GenresPage({ searchParams }: GenresPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const [aggregated, genresQuery] = await Promise.all([
    getCachedGenreHub(),
    supabase
      .from("genres")
      .select("id, slug, name, name_it, slug_it, description_it")
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
    const linkSlug = genre.slug_it?.trim() || genre.slug;
    const displayName = genre.name_it?.trim() || genre.name;
    return [
      {
        name: displayName,
        href: `/it/genres/${linkSlug}`,
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
        <h1 className="mb-2 text-2xl font-semibold">Generi</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Esplora opere per genere</p>
      </div>

      {paginated.length ? (
        <BrowseHubGrid items={paginated} />
      ) : (
        <p className="text-sm text-[#6b6b6b]">Nessun genere trovato.</p>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/it/genres" />
    </div>
  );
}
