import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
<<<<<<< HEAD
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, artworkImageUrl, slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

type StyleRow = {
  name: string;
  slug: string;
  description: string | null;
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

type StylePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

function unslugifyStyle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncateTo160(text: string | null): string {
  if (!text) {
    return "";
  }

  if (text.length <= 160) {
    return text;
  }

  return `${text.slice(0, 157)}...`;
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

async function getStyleBySlug(slug: string): Promise<StyleRow | null> {
  const { data, error } = await supabase
    .from("styles")
    .select("name, slug, description")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as StyleRow;
=======
import { getArtworksByStyle } from "@/lib/artworks";
import { getStyleBySlug, getStyles } from "@/lib/styles";
import { absoluteUrl } from "@/lib/utils";

type StylePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const styles = await getStyles();
  return styles.map((style) => ({ slug: style.slug }));
>>>>>>> 42d7ea5 (initial commit)
}

export async function generateMetadata({ params }: StylePageProps): Promise<Metadata> {
  const { slug } = await params;
  const style = await getStyleBySlug(slug);
<<<<<<< HEAD
  const styleName = style?.name ?? unslugifyStyle(slug);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Art Gallery";

  const ogQuery = await supabase
    .from("artworks")
    .select("url, image_id")
    .eq("style_title", styleName)
    .limit(1);
  const ogImageSource = ((ogQuery.data as Array<{ url: string | null; image_id: string | null }> | null) ?? [])[0] ?? null;
  const ogImage = ogImageSource ? artworkImageUrl(ogImageSource) : "";

  const title = `${styleName} Art — Free Public Domain Paintings | ${siteName}`;
  const description = `Explore ${styleName} artworks in the public domain. Free HD downloads.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/styles/${slug}`),
    },
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
=======

  if (!style) {
    return { title: "Style Not Found" };
  }

  return {
    title: `${style.name} Artworks`,
    description:
      style.description ?? `Browse public domain artworks in the ${style.name} style.`,
    alternates: {
      canonical: absoluteUrl(`/styles/${style.slug}`),
>>>>>>> 42d7ea5 (initial commit)
    },
  };
}

<<<<<<< HEAD
export default async function StyleDetailPage({ params, searchParams }: StylePageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);
  const style = await getStyleBySlug(slug);
  const styleName = style?.name ?? unslugifyStyle(slug);
  const styleDescription = style?.description ?? null;

  const orderedQuery = await supabase
    .from("artworks")
    .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score", {
      count: "exact",
    })
    .eq("style_title", styleName)
    .order("score", { ascending: false })
    .range(from, to);

  let rows = (orderedQuery.data as ArtworkRow[] | null) ?? [];
  let totalCount = orderedQuery.count ?? 0;

  if (orderedQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
      .eq("style_title", styleName)
      .limit(300);

    if (fallbackQuery.error?.code === "57014") {
      const secondFallbackQuery = await supabase
        .from("artworks")
        .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
        .limit(2000);

      if (secondFallbackQuery.error) {
        return <p>Error loading data</p>;
      }

      rows = ((secondFallbackQuery.data as ArtworkRow[] | null) ?? [])
        .filter((item) => item.style_title?.toLowerCase() === styleName.toLowerCase())
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(from, to + 1);
      totalCount = ((secondFallbackQuery.data as ArtworkRow[] | null) ?? []).filter(
        (item) => item.style_title?.toLowerCase() === styleName.toLowerCase()
      ).length;
    } else if (fallbackQuery.error) {
      return <p>Error loading data</p>;
    }
    else {
      rows = ((fallbackQuery.data as ArtworkRow[] | null) ?? [])
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(from, to + 1);
      totalCount = fallbackQuery.data?.length ?? totalCount;
    }
  } else if (orderedQuery.error) {
    return <p>Error loading data</p>;
  }

  if (!rows.length) {
    const slugFallbackQuery = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
      .not("style_title", "is", null)
      .limit(5000);

    if (!slugFallbackQuery.error) {
      rows = ((slugFallbackQuery.data as ArtworkRow[] | null) ?? [])
        .filter((item) => item.style_title && slugify(item.style_title) === slug)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(from, to + 1);
      totalCount = ((slugFallbackQuery.data as ArtworkRow[] | null) ?? []).filter(
        (item) => item.style_title && slugify(item.style_title) === slug
      ).length;
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
    styleSlug: style?.slug ?? slug,
    styleName: styleName,
    sourceUrl: item.url ?? undefined,
  }));

  if (!artworks.length) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{styleName} Artworks</h1>
      <p className="max-w-3xl text-neutral-700">{styleDescription ?? "No description available."}</p>
      <ArtworkGrid artworks={artworks} />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/styles/${slug}`}
      />
=======
export default async function StylePage({ params }: StylePageProps) {
  const { slug } = await params;
  const style = await getStyleBySlug(slug);

  if (!style) {
    notFound();
  }

  const artworks = await getArtworksByStyle(slug);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{style.name}</h1>
      {style.description ? <p className="max-w-3xl text-neutral-700">{style.description}</p> : null}
      <ArtworkGrid artworks={artworks} />
>>>>>>> 42d7ea5 (initial commit)
    </div>
  );
}
