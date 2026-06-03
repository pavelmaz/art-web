import { buildMuseumLanguageAlternates, localePath } from "@/lib/locale-routes";
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

  const title = `${museumName} — 免费博物馆 | Fine Art Free`;
  const description = `探索${museumName}的${totalCount}件高分辨率作品。公共领域，免费。`;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `https://fineartfree.com${localePath("zh", "museums")}/${slug}`,
      languages: buildMuseumLanguageAlternates(slug),
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
    console.error("[museum-primary-query/zh]", error);
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
        items={[{ label: "首页", href: "/zh" }, { label: "博物馆", href: "/zh/museums" }, { label: museumName }]}
        currentPath={`/zh/museums/${slug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">作品 de {museumName}</h1>
      <p className="max-w-3xl text-neutral-700">
        探索{museumName}的{totalCount}件公共领域艺术作品，免费高分辨率下载。
      </p>
      <ArtworkGrid artworks={artworks} basePath="/zh" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/zh/museums/${slug}`}
      />
    </div>
  );
}
