import type { Metadata } from "next";

import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedGenreHub } from "@/lib/cached-hub-data";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { hubListPageMetadata } from "@/lib/list-page-metadata";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 86400;

export async function generateMetadata({ searchParams }: GenresPageProps): Promise<Metadata> {
  const { page } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/es/generos",
    hub: "genres",
    title: "Géneros Artísticos — Descarga Gratuita Dominio Público | Fine Art Free",
    description: "Explora arte de dominio público por género. Paisaje, Retrato, Naturaleza Muerta, Religioso y más — gratis para descargar en alta resolución.",
    page,
    openGraph: {
    title: "Géneros Artísticos — Descarga Gratuita Dominio Público | Fine Art Free",
    description:
      "Explora arte de dominio público por género. Paisaje, Retrato, Naturaleza Muerta, Religioso y más — gratis para descargar en alta resolución.",
  },
  });
}


type GenresPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function GenresPage({ searchParams }: GenresPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const [aggregated, genresQuery] = await Promise.all([
    getCachedGenreHub(),
    supabase.from("genres").select("name, name_es, slug, slug_es").order("name"),
  ]);

  const genresByName = new Map(
    ((genresQuery.data as Array<{ name: string; name_es: string | null; slug: string; slug_es: string | null }>) ?? [])
      .map((g) => [g.name.toLowerCase(), g])
  );

  const items = aggregated.flatMap((row) => {
    const genre = genresByName.get(row.display.toLowerCase());
    if (!genre) {
      return [];
    }
    const linkSlug = genre.slug_es?.trim() || genre.slug;
    return [
      {
        name: genre.name_es?.trim() || row.display,
        href: `/es/generos/${linkSlug}`,
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

      {paginated.length ? <BrowseHubGrid items={paginated} /> : <p className="text-sm text-[#6b6b6b]">No se encontraron géneros.</p>}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/es/generos" />
    </div>
  );
}
