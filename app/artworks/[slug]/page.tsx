import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtworkCard } from "@/components/ArtworkCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArtworkJsonLd } from "@/components/ArtworkJsonLd";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, artworkImageUrl, generateAltText, slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

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
  const artistSlug = artwork.artist_display?.trim() ? slugify(artwork.artist_display) : null;

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

  let artistThumbnailUrl = "";
  let relatedArtworks: Artwork[] = [];

  if (artwork.artist_display?.trim()) {
    const relatedQuery = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
      .eq("artist_display", artwork.artist_display)
      .order("score", { ascending: false })
      .limit(20);

    if (!relatedQuery.error) {
      const rows =
        (relatedQuery.data as
          | Array<{
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
            }>
          | null) ?? [];

      const thumbnailSource = rows[0] ?? null;
      artistThumbnailUrl = thumbnailSource ? artworkImageUrl(thumbnailSource) : "";

      relatedArtworks = rows
        .filter((item) => item.slug !== artwork.slug)
        .slice(0, 10)
        .map((item) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          artistName: item.artist_display ?? artist,
          artistDisplay: item.artist_display ?? undefined,
          imageUrl: artworkImageUrl(item),
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
    }
  }

  return (
    <article className="bg-[#faf9f7] py-8">
      <div className="mx-auto max-w-7xl px-6">
        <ArtworkJsonLd artwork={artwork} />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-4">
            <div className="bg-white p-6">
              {imageUrl ? (
                <div className="flex justify-center">
                  <Image
                    src={imageUrl}
                    alt={generateAltText(artwork)}
                    width={1200}
                    height={900}
                    priority={true}
                    unoptimized
                    className="h-auto max-h-[70vh] w-auto object-contain shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
                  />
                </div>
              ) : (
                <div className="flex h-[420px] w-full items-center justify-center bg-neutral-200 text-neutral-600">
                  No image available
                </div>
              )}
            </div>
            <Breadcrumbs items={breadcrumbItems} currentPath={`/artworks/${artwork.slug}`} />
          </div>

          <aside className="w-full lg:w-80">
            <div className="space-y-4 lg:sticky lg:top-6">
              <div>
                <h1 className="mb-1 text-lg font-semibold text-[#1a1a1a]">{artwork.title}</h1>
                {artistSlug ? (
                  <Link href={`/artists/${artistSlug}`} className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
                    {artist}
                  </Link>
                ) : (
                  <p className="text-sm text-[#6b6b6b]">{artist}</p>
                )}
              </div>

              <div className="border-t border-[#e8e6e1]" />

              <div className="space-y-3">
                {artwork.medium_display?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">Medium</p>
                    <p className="text-sm text-[#1a1a1a]">{artwork.medium_display}</p>
                  </div>
                ) : null}

                {artwork.date_display?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">Date</p>
                    <p className="text-sm text-[#1a1a1a]">{artwork.date_display}</p>
                  </div>
                ) : null}

                {artwork.dimensions?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">Dimensions</p>
                    <p className="text-sm text-[#1a1a1a]">{artwork.dimensions}</p>
                  </div>
                ) : null}

                {artwork.museum?.trim() ? (
                  <div>
                    <p className="text-xs text-[#999]">Museum</p>
                    <Link
                      href={`/museums/${slugify(artwork.museum)}`}
                      className="text-sm text-[#1a1a1a] underline"
                    >
                      {artwork.museum}
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[#e8e6e1]" />

              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
                <span aria-hidden>✓</span>
                Public Domain
              </span>
            </div>
          </aside>
        </div>

        {artwork.description?.trim() ? (
          <section className="mt-10">
            <div className="overflow-hidden text-sm leading-relaxed text-[#4a4a4a]">
              {artistThumbnailUrl ? (
                <Image
                  src={artistThumbnailUrl}
                  alt={artist}
                  width={48}
                  height={48}
                  unoptimized
                  className="float-left mr-4 h-12 w-12 rounded-full object-cover"
                />
              ) : null}
              <p>{artwork.description}</p>
            </div>
            {artistSlug ? (
              <p className="mt-3">
                <Link href={`/artists/${artistSlug}`} className="underline">
                  More works by {artist}
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}

        {relatedArtworks.length > 0 && artistSlug ? (
          <section className="mt-10">
            <h2 className="mb-4 text-base font-semibold">More Artworks by {artist}</h2>
            <div className="columns-3 gap-4 lg:columns-5 [column-gap:16px]">
              {relatedArtworks.map((item) => (
                <div key={item.id} className="mb-4 break-inside-avoid">
                  <ArtworkCard artwork={item} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
