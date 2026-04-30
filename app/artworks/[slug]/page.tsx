import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { absoluteUrl, slugify } from "@/lib/utils";

type ArtworkRow = {
  id: string;
  slug: string;
  title: string;
  artist_display: string | null;
  image_id: string | null;
  museum: string | null;
  style_title: string | null;
  genre_title: string | null;
  medium_display: string | null;
  date_display: string | null;
  dimensions: string | null;
  description: string | null;
};

type ArtworkPageProps = {
  params: Promise<{ slug: string }>;
};

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

  return `https://www.artic.edu/iiif/2/${imageId}/full/1200,/0/default.jpg`;
}

function truncateDescription(text: string | null): string {
  if (!text) {
    return "";
  }

  if (text.length <= 160) {
    return text;
  }

  return `${text.slice(0, 157)}...`;
}

async function getArtworkBySlug(slug: string): Promise<ArtworkRow | null> {
  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as ArtworkRow;
}

export async function generateMetadata({ params }: ArtworkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);

  if (!artwork) {
    return {
      title: "Artwork not found",
    };
  }

  const imageUrl = toImageUrl(artwork.image_id);
  const seoDescription = truncateDescription(artwork.description);
  const artist = artwork.artist_display ?? "Unknown artist";

  return {
    title: `${artwork.title} by ${artist}`,
    description: seoDescription || `${artwork.title} by ${artist}`,
    alternates: {
      canonical: absoluteUrl(`/artworks/${artwork.slug}`),
    },
    openGraph: {
      title: `${artwork.title} by ${artist}`,
      description: seoDescription || `${artwork.title} by ${artist}`,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function ArtworkDetailPage({ params }: ArtworkPageProps) {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);

  if (!artwork) {
    notFound();
  }

  const imageUrl = toImageUrl(artwork.image_id);
  const artist = artwork.artist_display ?? "Unknown artist";

  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{artwork.title}</h1>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${artwork.title} by ${artist}`}
          className="w-full max-w-4xl rounded-lg border border-neutral-200 object-cover"
        />
      ) : (
        <div className="flex h-[420px] w-full max-w-4xl items-center justify-center rounded-lg bg-neutral-200 text-neutral-600">
          No image available
        </div>
      )}

      <div className="grid gap-3 text-neutral-800 sm:grid-cols-2">
        <p>
          <strong>Artist:</strong> {artist}
        </p>
        <p>
          <strong>Museum:</strong>{" "}
          {artwork.museum ? (
            <Link href={`/museums/${slugify(artwork.museum)}`} className="underline">
              {artwork.museum}
            </Link>
          ) : (
            "-"
          )}
        </p>
        <p>
          <strong>Style:</strong>{" "}
          {artwork.style_title ? (
            <Link href={`/styles/${slugify(artwork.style_title)}`} className="underline">
              {artwork.style_title}
            </Link>
          ) : (
            "-"
          )}
        </p>
        <p>
          <strong>Genre:</strong>{" "}
          {artwork.genre_title ? (
            <Link href={`/genres/${slugify(artwork.genre_title)}`} className="underline">
              {artwork.genre_title}
            </Link>
          ) : (
            "-"
          )}
        </p>
        <p>
          <strong>Medium:</strong> {artwork.medium_display ?? "-"}
        </p>
        <p>
          <strong>Date:</strong> {artwork.date_display ?? "-"}
        </p>
        <p>
          <strong>Dimensions:</strong> {artwork.dimensions ?? "-"}
        </p>
      </div>

      <section className="max-w-4xl space-y-2">
        <h2 className="text-xl font-semibold">Description</h2>
        <p className="leading-7 text-neutral-700">{artwork.description ?? "-"}</p>
      </section>
    </article>
  );
}
