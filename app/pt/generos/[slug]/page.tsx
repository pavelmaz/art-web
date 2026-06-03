import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { buildGenreLanguageAlternates } from "@/lib/locale-routes";
import { absoluteUrl } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

type GenrePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

type ArtworkRow = {
  id: string;
  title: string;
  slug: string;
  artist_display: string | null;
  image_id: string | null;
  url: string | null;
  museum: string | null;
  style_title: string | null;
  genre_title: string | null;
  score: number | null;
  alt_text: string | null;
};

type GenreRow = {
  name: string;
  name_es: string | null;
  name_pt: string | null;
  description: string | null;
  description_pt: string | null;
  slug: string;
  slug_es: string | null;
  slug_pt: string | null;
};

async function getGenreByLocalizedSlug(slug: string): Promise<GenreRow | null> {
  const cols = "name, name_es, name_pt, description, description_pt, slug, slug_es, slug_pt";

  const { data: byLocalized } = await supabase
    .from("genres")
    .select(cols)
    .eq("slug_pt", slug)
    .single();

  if (byLocalized) return byLocalized as GenreRow;

  const { data: byEnglish } = await supabase
    .from("genres")
    .select(cols)
    .eq("slug", slug)
    .single();

  return (byEnglish as GenreRow) ?? null;
}

function toImageUrl(imageId: string | null): string {
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const genre = await getGenreByLocalizedSlug(slug);
  if (!genre) notFound();

  const displayName = genre.name_pt?.trim() || genre.name;

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("genre_title", genre.name);

  const totalCount = countQuery.count ?? 0;
  if (!totalCount) notFound();

  const title = `Pinturas de ${displayName} — Download Gratuito | Fine Art Free`;
  const description = genre.description_pt?.trim()
    || `Baixe ${totalCount} pinturas de ${displayName} em alta resolução. Arte de domínio público grátis para uso pessoal e comercial.`;

  const esSlug = genre.slug_es?.trim() || genre.slug;
  const ptSlug = genre.slug_pt?.trim() || genre.slug;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/pt/generos/${ptSlug}`),
      languages: buildGenreLanguageAlternates(genre.slug),
    },
    openGraph: { title, description },
  };
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  const genre = await getGenreByLocalizedSlug(slug);
  if (!genre) notFound();

  const displayName = genre.name_pt?.trim() || genre.name;
  const intro = genre.description_pt?.trim() || genre.description?.trim() || null;
  const ptSlug = genre.slug_pt?.trim() || genre.slug;

  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text",
      { count: "exact" }
    )
    .eq("genre_title", genre.name)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[GenrePage/pt]", slug, genre.name, error);
    return <p>Error loading data</p>;
  }

  const rows = (data as ArtworkRow[] | null) ?? [];
  const totalCount = count ?? 0;

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
    altText: item.alt_text ?? null,
  }));

  const seen = new Set<string>();
  const uniqueArtworks = artworks.filter((artwork) => {
    if (seen.has(artwork.id)) return false;
    seen.add(artwork.id);
    return true;
  });

  if (!uniqueArtworks.length) notFound();

  return (
    <div className="space-y-6 px-5">
      <CollectionPageJsonLd
        name={`Pinturas de ${displayName}`}
        path={`/pt/generos/${ptSlug}`}
        description={intro}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "Início", href: "/pt" }, { label: "Géneros", href: "/pt/generos" }, { label: displayName }]}
        currentPath={`/pt/generos/${ptSlug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">Pinturas de {displayName}</h1>
      {intro ? (
        <div className="max-w-3xl mb-8 text-sm leading-relaxed text-[#4a4a4a]">
          <p>{intro}</p>
        </div>
      ) : null}
      <ArtworkGrid artworks={uniqueArtworks} basePath="/pt" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/pt/generos/${ptSlug}`}
      />
    </div>
  );
}
