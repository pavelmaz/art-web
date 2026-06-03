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
import { getT } from "@/lib/translations";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

const t = getT("ja");

type StyleRow = {
  name: string;
  name_es: string | null;
  name_pt: string | null;
  name_ja: string | null;
  description: string | null;
  description_es: string | null;
  description_ja: string | null;
  slug: string;
  slug_es: string | null;
  slug_pt: string | null;
  slug_ja: string | null;
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
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

async function getStyleByLocalizedSlug(slug: string): Promise<StyleRow | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const cols =
    "name, name_es, name_pt, name_ja, description, description_es, description_ja, slug, slug_es, slug_pt, slug_ja";

  for (const variant of styleSlugLookupVariants(trimmed)) {
    const { data: byLocalized } = await supabase
      .from("styles")
      .select(cols)
      .ilike("slug_es", variant)
      .limit(1)
      .maybeSingle();

    if (byLocalized) return byLocalized as StyleRow;
  }

  for (const variant of styleSlugLookupVariants(trimmed)) {
    const { data: byEnglish } = await supabase
      .from("styles")
      .select(cols)
      .ilike("slug", variant)
      .limit(1)
      .maybeSingle();

    if (byEnglish) return byEnglish as StyleRow;
  }

  return null;
}

export async function generateMetadata({ params }: StylePageProps): Promise<Metadata> {
  const { slug } = await params;
  const style = await getStyleByLocalizedSlug(slug);
  const englishName = style?.name ?? unslugifyStyle(slug);

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("style_title", englishName);

  const totalCount = countQuery.count ?? 0;

  if (!totalCount) {
    notFound();
  }

  const displayName = style?.name_ja?.trim() || style?.name || englishName;
  const title = t.stylePageTitle(displayName);
  const description =
    style?.description_ja?.trim()?.slice(0, 200) ||
    style?.description?.trim()?.slice(0, 200) ||
    `「${displayName}」のパブリックドメイン作品を${totalCount}点以上、高解像度で無料ダウンロード。`;

  const esSlug = style?.slug_es?.trim() || style?.slug || slug;
  const ptSlug = style?.slug_pt?.trim() || style?.slug || slug;
  const enSlug = style?.slug || slug;
  const jaSlug = style?.slug || slug;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/ja/styles/${jaSlug}`),
      languages: buildStyleLanguageAlternates(enSlug),
    },
    openGraph: { title, description },
  };
}

export default async function StyleDetailPage({ params, searchParams }: StylePageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);
  const styleData = await getStyleByLocalizedSlug(slug);
  const englishName = styleData?.name ?? unslugifyStyle(slug);
  const displayName = styleData?.name_ja?.trim() || styleData?.name || englishName;
  const urlSlug = styleData?.slug?.trim() || slug;

  let descriptionText =
    styleData?.description_ja?.trim() || styleData?.description?.trim() || null;
  if (!descriptionText && englishName) {
    const pattern = `%${englishName}%`;
    const { data: styleByName } = await supabase
      .from("styles")
      .select("description_es, description, description_ja")
      .ilike("name", pattern)
      .limit(1)
      .maybeSingle();
    descriptionText =
      styleByName?.description_ja?.trim() ||
      styleByName?.description?.trim() ||
      styleByName?.description_es?.trim() ||
      null;
  }

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text",
      { count: "exact" }
    )
    .eq("style_title", englishName)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[StyleDetailPage/ja]", slug, englishName, error);
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
    styleSlug: styleData?.slug || slug,
    styleName: displayName,
    sourceUrl: item.url ?? undefined,
    altText: item.alt_text ?? null,
  }));

  if (!artworks.length) {
    notFound();
  }

  return (
    <div className="space-y-6 px-5">
      <CollectionPageJsonLd
        name={`「${displayName}」の${t.artworks}`}
        path={`/ja/styles/${urlSlug}`}
        description={descriptionText}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "ホーム", href: "/ja" }, { label: t.styles, href: "/ja/styles" }, { label: displayName }]}
        currentPath={`/ja/styles/${urlSlug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">
        「{displayName}」の{t.artworks}
      </h1>
      {descriptionText ? (
        <div className="max-w-3xl mb-8 text-sm leading-relaxed text-[#4a4a4a]">
          <p>{descriptionText}</p>
        </div>
      ) : null}
      <ArtworkGrid artworks={artworks} basePath="/ja" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/ja/styles/${urlSlug}`}
      />
    </div>
  );
}
