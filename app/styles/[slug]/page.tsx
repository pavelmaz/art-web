import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { buildStyleLanguageAlternates } from "@/lib/locale-routes";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, styleSlugLookupVariants } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

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
  alt_text: string | null;
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

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

async function getStyleBySlug(slug: string): Promise<StyleRow | null> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return null;
  }

  for (const variant of styleSlugLookupVariants(trimmed)) {
    const { data: bySlug, error } = await supabase
      .from("styles")
      .select("name, slug, description")
      .ilike("slug", variant)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (bySlug) return bySlug as StyleRow;
  }

  return null;
}

export async function generateMetadata({ params }: StylePageProps): Promise<Metadata> {
  const { slug } = await params;
  const style = await getStyleBySlug(slug);
  const styleName = style?.name ?? unslugifyStyle(slug);

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("style_title", styleName);

  const totalCount = countQuery.count ?? 0;

  if (!totalCount) {
    notFound();
  }

  const title = `${styleName} Art — Free Public Domain Downloads | Fine Art Free`;
  const description = `Browse ${totalCount} ${styleName} artworks free to download in high resolution. Public domain paintings and prints free for personal and commercial use.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/styles/${slug}`),
      languages: buildStyleLanguageAlternates(slug),
    },
    openGraph: {
      title,
      description,
    },
  };
}

export default async function StyleDetailPage({ params, searchParams }: StylePageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);
  const styleData = await getStyleBySlug(slug);
  const styleName = styleData?.name ?? unslugifyStyle(slug);

  let descriptionText = styleData?.description?.trim() || null;
  if (!descriptionText && styleName) {
    const pattern = `%${styleName}%`;
    const { data: styleByName } = await supabase
      .from("styles")
      .select("description")
      .ilike("name", pattern)
      .limit(1)
      .maybeSingle();
    descriptionText = styleByName?.description?.trim() || null;
  }

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text",
      { count: "exact" }
    )
    .eq("style_title", styleName)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[StyleDetailPage]", slug, styleName, error);
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
    styleSlug: slug,
    styleName: styleName,
    sourceUrl: item.url ?? undefined,
    altText: item.alt_text ?? null,
  }));

  if (!artworks.length) {
    notFound();
  }

  return (
    <div className="space-y-6 px-5">
      <CollectionPageJsonLd
        name={`${styleName} Art`}
        path={`/styles/${slug}`}
        description={descriptionText}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Styles", href: "/styles" }, { label: styleName }]}
        currentPath={`/styles/${slug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">{styleName} Art</h1>
      {descriptionText ? (
        <div className="max-w-3xl mb-8 text-sm leading-relaxed text-[#4a4a4a]">
          <p>{descriptionText}</p>
        </div>
      ) : null}
      <ArtworkGrid artworks={artworks} />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/styles/${slug}`}
      />
    </div>
  );
}
