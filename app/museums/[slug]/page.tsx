import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, artworkImageUrl } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

type MuseumPageProps = {
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

function unslugifyMuseum(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugifyMuseum(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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

function getSeoDescription(museumName: string): string {
  return `Browse free public domain artworks and paintings from ${museumName}.`;
}

export async function generateMetadata({ params }: MuseumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const museumName = unslugifyMuseum(slug);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Art Gallery";

  const ogQuery = await supabase
    .from("artworks")
    .select("url, image_id")
    .eq("museum", museumName)
    .limit(1);
  const ogImageSource = ((ogQuery.data as Array<{ url: string | null; image_id: string | null }> | null) ?? [])[0] ?? null;
  const ogImage = ogImageSource ? artworkImageUrl(ogImageSource) : "";

  const title = `Artworks from ${museumName} — Public Domain Collection | ${siteName}`;
  const description = `Browse public domain artworks from ${museumName}. Free to download and use commercially.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/museums/${slug}`),
    },
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function MuseumPage({ params, searchParams }: MuseumPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const parsedPage = Number.parseInt(resolvedSearchParams.page ?? "1", 10);
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const from = (page - 1) * 30;
  const to = from + 29;
  const museumName = unslugifyMuseum(slug);

  const orderedQuery = await supabase
    .from("artworks")
    .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
    .eq("museum", museumName)
    .order("score", { ascending: false })
    .range(from, to);

  let rows = (orderedQuery.data as ArtworkRow[] | null) ?? [];

  if (orderedQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
      .eq("museum", museumName)
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

  // Fallback for museum naming mismatches (e.g. aliases/punctuation/case differences).
  if (!rows.length) {
    const fallbackQuery = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
      .not("museum", "is", null)
      .limit(1500);

    if (fallbackQuery.error) {
      return <p>Error loading data</p>;
    }

    rows = ((fallbackQuery.data as ArtworkRow[] | null) ?? [])
      .filter((item) => item.museum && slugifyMuseum(item.museum) === slug)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(from, to + 1);
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
        items={[{ label: "Home", href: "/" }, { label: "Museums", href: "/museums" }, { label: museumName }]}
        currentPath={`/museums/${slug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">{museumName} Artworks</h1>
      <p className="max-w-3xl text-neutral-700">{getSeoDescription(museumName)}</p>
      <ArtworkGrid artworks={artworks} />
      <div>
        {page > 1 ? <Link href={`/museums/${slug}?page=${page - 1}`}>Previous</Link> : null}{" "}
        <Link href={`/museums/${slug}?page=${page + 1}`}>Next</Link>
      </div>
    </div>
  );
}
