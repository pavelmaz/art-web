import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { resolveMuseumBySlug } from "@/lib/resolve-museum-by-slug";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

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
  alt_text: string | null;
};

const SELECT_COLUMNS =
  "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text";

function toImageUrl(imageId: string | null): string {
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

export async function generateMetadata({ params }: MuseumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const museumName = await resolveMuseumBySlug(slug);

  if (!museumName) {
    notFound();
  }

  const { count, error } = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("museum", museumName);

  if (error || !count) {
    notFound();
  }

  const totalCount = count;

  const title = `${museumName} — Arte Gratis para Descargar | Fine Art Free`;
  const description = `Explora ${totalCount} произведения de arte de ${museumName} gratis para descargar. Arte de dominio público en alta resolución para cualquier uso.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/ru/музеи/${slug}`),
      languages: buildHubLanguageAlternates("museums"),
    },
    openGraph: { title, description },
  };
}

export default async function MuseumPage({ params, searchParams }: MuseumPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);
  const museumName = await resolveMuseumBySlug(slug);

  if (!museumName) {
    notFound();
  }

  const { data, count, error } = await supabase
    .from("artworks")
    .select(SELECT_COLUMNS, { count: "exact" })
    .eq("museum", museumName)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[museum-primary-query/ru]", error);
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

  if (!artworks.length) {
    notFound();
  }

  return (
    <div className="space-y-6 px-5">
      <Breadcrumbs
        items={[{ label: "Главная", href: "/ru" }, { label: "Museos", href: "/ru/музеи" }, { label: museumName }]}
        currentPath={`/ru/музеи/${slug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">Произведения de {museumName}</h1>
      <p className="max-w-3xl text-neutral-700">
        Explora произведения de arte y pinturas de dominio público de {museumName}, gratis para descargar.
      </p>
      <ArtworkGrid artworks={artworks} basePath="/ru" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/ru/музеи/${slug}`}
      />
    </div>
  );
}
