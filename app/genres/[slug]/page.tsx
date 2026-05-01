import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, artworkImageUrl, slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

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
};

function unslugifyGenre(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugToGenreQueryValue(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

  return `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
}

function getSeoDescription(genreName: string): string {
  return `Browse free public domain ${genreName.toLowerCase()} artworks, paintings, illustrations, and museum pieces.`;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const genreName = unslugifyGenre(slug);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Art Gallery";
  const genreQueryValue = slugToGenreQueryValue(slug);

  const ogQuery = await supabase
    .from("artworks")
    .select("url, image_id, genre_title, score")
    .eq("genre_title", genreQueryValue)
    .order("score", { ascending: false })
    .limit(1);

  let ogImageSource: { url: string | null; image_id: string | null; genre_title: string | null } | null =
    ((ogQuery.data as Array<{ url: string | null; image_id: string | null; genre_title: string | null }> | null) ?? [])[0] ??
    null;

  if (!ogImageSource) {
    const fallbackQuery = await supabase
      .from("artworks")
      .select("url, image_id, genre_title")
      .not("genre_title", "is", null)
      .limit(5000);

    ogImageSource =
      ((fallbackQuery.data as Array<{ url: string | null; image_id: string | null; genre_title: string | null }> | null) ??
        []).find((item) => item.genre_title && slugify(item.genre_title) === slug) ?? null;
  }

  const ogImage = ogImageSource ? artworkImageUrl(ogImageSource) : "";
  const title = `${genreName} Paintings — Free Public Domain Art | ${siteName}`;
  const description = `Browse ${genreName} public domain artworks. Free to download, share, and use.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/genres/${slug}`),
    },
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const parsedPage = Number.parseInt(resolvedSearchParams.page ?? "1", 10);
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const from = (page - 1) * 30;
  const to = from + 29;
  const genreName = unslugifyGenre(slug);
  const genreQueryValue = slugToGenreQueryValue(slug);

  const orderedQuery = await supabase
    .from("artworks")
    .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
    .eq("genre_title", genreQueryValue)
    .order("score", { ascending: false })
    .range(from, to);

  let rows = (orderedQuery.data as ArtworkRow[] | null) ?? [];

  // Keep requested DB ordering, but gracefully recover if DB sort times out.
  if (orderedQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
      .eq("genre_title", genreQueryValue)
      .limit(200);

    if (fallbackQuery.error) {
      return <p>Error loading data</p>;
    }

    rows = ((fallbackQuery.data as ArtworkRow[] | null) ?? [])
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(from, to + 1);
  } else if (orderedQuery.error) {
    return <p>Error loading data</p>;
  }

  if (!rows.length) {
    const slugFallbackQuery = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
      .not("genre_title", "is", null)
      .limit(5000);

    if (!slugFallbackQuery.error) {
      rows = ((slugFallbackQuery.data as ArtworkRow[] | null) ?? [])
        .filter((item) => item.genre_title && slugify(item.genre_title) === slug)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(from, to + 1);
    }
  }

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
  }));

  if (!artworks.length) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Genres", href: "/genres" }, { label: genreName }]}
        currentPath={`/genres/${slug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">{genreName} Artworks</h1>
      <p className="max-w-3xl text-neutral-700">{getSeoDescription(genreName)}</p>
      <ArtworkGrid artworks={artworks} />
      <div>
        {page > 1 ? <Link href={`/genres/${slug}?page=${page - 1}`}>Previous</Link> : null}{" "}
        <Link href={`/genres/${slug}?page=${page + 1}`}>Next</Link>
      </div>
    </div>
  );
}
