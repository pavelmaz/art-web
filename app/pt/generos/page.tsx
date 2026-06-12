import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedGenreHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Géneros Artísticos — Download Gratuito Domínio Público | Fine Art Free",
  description:
    "Explore arte de domínio público por género. Paisagem, Retrato, Natureza Morta, Religioso e mais — grátis para baixar em alta resolução.",
  alternates: {
    canonical: absoluteUrl("/pt/generos"),
    languages: buildHubLanguageAlternates("genres"),
  },
  openGraph: {
    title: "Géneros Artísticos — Download Gratuito Domínio Público | Fine Art Free",
    description:
      "Explore arte de domínio público por género. Paisagem, Retrato, Natureza Morta, Religioso e mais — grátis para baixar em alta resolução.",
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
    supabase.from("genres").select("name, name_pt, slug, slug_pt").order("name"),
  ]);

  const genresByName = new Map(
    ((genresQuery.data as Array<{ name: string; name_pt: string | null; slug: string; slug_pt: string | null }>) ?? [])
      .map((g) => [g.name.toLowerCase(), g])
  );

  const items = aggregated.flatMap((row) => {
    const genre = genresByName.get(row.display.toLowerCase());
    if (!genre) {
      return [];
    }
    const linkSlug = genre.slug_pt?.trim() || genre.slug;
    return [
      {
        name: genre.name_pt?.trim() || row.display,
        href: `/pt/generos/${linkSlug}`,
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

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">Nenhum género encontrado.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/pt/generos" />
    </div>
  );
}
