import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

type ArtistPageProps = {
  params: Promise<{ slug: string }>;
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
};

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

  return `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
}

function unslugifyArtist(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { slug } = await params;
  const fallbackName = unslugifyArtist(slug);

  return {
    title: `${fallbackName} Artworks – Public Domain Art`,
    description: `Browse public domain artworks by ${fallbackName}.`,
  };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { slug } = await params;

  const { data, error } = await supabase
    .from("artworks")
    .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
    .not("artist_display", "is", null)
    .limit(5000);

  if (error) {
    return <p>Error loading data</p>;
  }

  const matchedRows = ((data as ArtworkRow[] | null) ?? [])
    .filter((item) => item.artist_display && slugify(item.artist_display) === slug)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 30);

  if (!matchedRows.length) {
    notFound();
  }

  const artistName = matchedRows[0].artist_display ?? unslugifyArtist(slug);

  const artworks: Artwork[] = matchedRows.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    artistName: item.artist_display ?? artistName,
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
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{artistName}</h1>
      <ArtworkGrid artworks={artworks} />
    </div>
  );
}
