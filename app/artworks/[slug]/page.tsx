import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArtworkJsonLd } from "@/components/ArtworkJsonLd";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, artworkImageUrl, generateAltText, slugify } from "@/lib/utils";

type ArtworkRow = {
  id: string;
  slug: string;
  title: string;
  artist_display: string | null;
  url: string | null;
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
    .select(
      "id, slug, title, artist_display, url, image_id, museum, style_title, genre_title, medium_display, date_display, dimensions, description"
    )
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

  const artist = artwork.artist_display ?? "Unknown artist";
  const title = `${artwork.title} by ${artist} — Free Public Domain Art`;

  const descriptionParts = [
    artwork.medium_display,
    artwork.date_display,
    artwork.museum,
    artwork.dimensions,
  ].filter((part): part is string => Boolean(part?.trim()));

  const description =
    descriptionParts.length > 0
      ? truncateDescription(descriptionParts.join(" · "))
      : `${artwork.title} by ${artist}.`;

  const imageUrl = artworkImageUrl(artwork);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/artworks/${slug}`),
    },
    openGraph: {
      title,
      description,
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

  const imageUrl = artworkImageUrl(artwork);
  const artist = artwork.artist_display ?? "Unknown artist";

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    ...(artwork.genre_title?.trim()
      ? [{ label: artwork.genre_title.trim(), href: `/genres/${slugify(artwork.genre_title)}` }]
      : []),
    ...(artwork.artist_display?.trim()
      ? [{ label: artwork.artist_display.trim(), href: `/artists/${slugify(artwork.artist_display)}` }]
      : []),
    { label: artwork.title },
  ];

  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{artwork.title}</h1>

      <Breadcrumbs items={breadcrumbItems} currentPath={`/artworks/${artwork.slug}`} />
      <ArtworkJsonLd artwork={artwork} />

      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={generateAltText(artwork)}
          width={1200}
          height={900}
          priority={true}
          unoptimized
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
        {artwork.artist_display?.trim() ? (
          <p>
            <Link href={`/artists/${slugify(artwork.artist_display)}`} className="underline">
              More works by {artwork.artist_display}
            </Link>
          </p>
        ) : null}
      </section>
    </article>
  );
}
