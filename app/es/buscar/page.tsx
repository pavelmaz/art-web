import Link from "next/link";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { runSiteSearch, type SiteSearchArtworkRow } from "@/lib/site-search";
import { slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Búsqueda | Fine Art Free",
  robots: {
    index: false,
    follow: true,
  },
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

function toImageUrl(imageId: string | null): string {
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

function toArtwork(item: SiteSearchArtworkRow): Artwork {
  const slug = item.slug?.trim() || slugify(item.title);

  return {
    id: item.id,
    title: item.title,
    slug,
    artistName: item.artist_display ?? "Unknown artist",
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: toImageUrl(item.image_id),
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: null,
    genreTitle: null,
    score: item.score ?? null,
    url: null,
    styleSlug: "unknown",
    styleName: "Unknown style",
    sourceUrl: undefined,
    altText: item.alt_text ?? null,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = await searchParams;
  const q = resolved.q?.trim() ?? "";

  if (!q) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-5 py-10">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Búsqueda</h1>
        <p className="text-sm text-[#6b6b6b]">Escribe una palabra clave en la barra de búsqueda para ver resultados.</p>
      </div>
    );
  }

  const { artworks: rows, artists: artistResults, error } = await runSiteSearch(q);

  if (error && !rows.length) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-5 py-10">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Búsqueda</h1>
        <p className="text-sm text-[#6b6b6b]">Error al cargar los resultados de búsqueda.</p>
      </div>
    );
  }

  const artworks = rows.map(toArtwork);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-[#1a1a1a]">Resultados de &quot;{q}&quot;</h1>
        <div className="flex flex-wrap gap-4 text-sm text-[#6b6b6b]">
          <span>Obras ({artworks.length})</span>
          <span>Artistas ({artistResults.length})</span>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#1a1a1a]">Obras ({artworks.length})</h2>
        {artworks.length ? (
          <ArtworkGrid artworks={artworks} basePath="/es" />
        ) : (
          <p className="text-sm text-[#6b6b6b]">No se encontraron resultados</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#1a1a1a]">Artistas ({artistResults.length})</h2>
        {artistResults.length ? (
          <ul className="space-y-2">
            {artistResults.map((artist) => (
              <li key={artist.slug}>
                <Link href={`/es/artistas/${artist.slug}`} className="text-sm text-[#1a1a1a] underline">
                  {artist.name}
                </Link>
                <span className="ml-2 text-xs text-[#6b6b6b]">{artist.count} obras</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#6b6b6b]">No se encontraron resultados</p>
        )}
      </section>
    </div>
  );
}
