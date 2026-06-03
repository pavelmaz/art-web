import { buildHubLanguageAlternates, localePath } from "@/lib/locale-routes";
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

  const title = `${museumName} — 무료 박물관 | Fine Art Free`;
  const description = `${museumName}의 ${totalCount}개 작품을 고해상도로 감상하세요. 퍼블릭 도메인, 무료.`;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `https://fineartfree.com${localePath("ko", "museums")}/${slug}`,
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
    console.error("[museum-primary-query/ko]", error);
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
        items={[{ label: "홈", href: "/ko" }, { label: "박물관", href: "/ko/museums" }, { label: museumName }]}
        currentPath={`/ko/museums/${slug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">작품 de {museumName}</h1>
      <p className="max-w-3xl text-neutral-700">
        {museumName}의 퍼블릭 도메인 작품 {totalCount}점을 고해상도로 무료 다운로드하세요.
      </p>
      <ArtworkGrid artworks={artworks} basePath="/ko" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/ko/museums/${slug}`}
      />
    </div>
  );
}
