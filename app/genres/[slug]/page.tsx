import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
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

const GENRE_MAP: Record<string, string> = {
  landscape: "Landscape",
  marine: "Marine",
  architecture: "Architecture",
  "genre-scene": "Genre Scene",
  religious: "Religious",
  portrait: "Portrait",
  figurative: "Figurative",
  "decorative-art": "Decorative Art",
  historical: "Historical",
  interior: "Interior",
  botanical: "Botanical",
  abstract: "Abstract",
  animal: "Animal",
  "still-life": "Still Life",
  mythology: "Mythology",
  allegory: "Allegory",
  drawing: "Drawing",
  illustration: "Illustration",
};

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!Object.hasOwn(GENRE_MAP, slug)) {
    notFound();
  }
  const genreTitle = GENRE_MAP[slug];

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("genre_title", genreTitle);

  const totalCount = countQuery.count ?? 0;

  if (!totalCount) {
    notFound();
  }

  const title = `${genreTitle} Paintings — Free Download | Fine Art Free`;
  const description = `Download ${totalCount} ${genreTitle} paintings in high resolution. Public domain art free for personal and commercial use.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/genres/${slug}`),
    },
    openGraph: {
      title,
      description,
    },
  };
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  if (!Object.hasOwn(GENRE_MAP, slug)) {
    notFound();
  }
  const genreTitle = GENRE_MAP[slug];
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const { data: genreData } = await supabase
    .from("genres")
    .select("name, description")
    .eq("slug", slug)
    .single();

  const intro = genreData?.description || null;

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text",
      { count: "exact" }
    )
    .eq("genre_title", genreTitle)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[GenrePage]", slug, genreTitle, error);
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

  if (!uniqueArtworks.length) {
    notFound();
  }

  return (
    <div className="space-y-6 px-5">
      <CollectionPageJsonLd
        name={`${genreTitle} Paintings`}
        path={`/genres/${slug}`}
        description={intro}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Genres", href: "/genres" }, { label: genreTitle }]}
        currentPath={`/genres/${slug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">{genreTitle} Paintings</h1>
      {intro ? (
        <div className="max-w-3xl mb-8 text-sm leading-relaxed text-[#4a4a4a]">
          <p>{intro}</p>
        </div>
      ) : null}
      <ArtworkGrid artworks={uniqueArtworks} />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/genres/${slug}`}
      />
    </div>
  );
}
