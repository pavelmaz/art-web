import type { Metadata } from "next";
import { paginatedAlternates } from "@/lib/list-page-metadata";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { buildStyleLanguageAlternates } from "@/lib/locale-routes";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, styleSlugLookupVariants } from "@/lib/utils";
import { localizeRowTitle } from "@/lib/artwork-i18n";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

type StyleRow = {
  name: string;
  name_es: string | null;
  name_pt: string | null;
  description: string | null;
  description_es: string | null;
  slug: string;
  slug_es: string | null;
  slug_pt: string | null;
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

  const cols = "name, name_es, name_pt, description, description_es, slug, slug_es, slug_pt";

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

export async function generateMetadata({ params, searchParams }: StylePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await searchParams;
  const style = await getStyleByLocalizedSlug(slug);
  const englishName = style?.name ?? unslugifyStyle(slug);
  const displayName = style?.name_es?.trim() || englishName;

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("style_title", englishName);

  const totalCount = countQuery.count ?? 0;

  if (!totalCount) {
    notFound();
  }

  const title = `Arte ${displayName} — Descarga Gratuita Dominio Público | Fine Art Free`;
  const description = style?.description_es?.trim()
    || `Descarga ${totalCount} obras de arte ${displayName} en alta resolución. Arte de dominio público gratis para uso personal y comercial.`;

  const esSlug = style?.slug_es?.trim() || style?.slug || slug;
  const ptSlug = style?.slug_pt?.trim() || style?.slug || slug;
  const enSlug = style?.slug || slug;

  return {
    title: { absolute: title },
    description,
    alternates: paginatedAlternates(`/es/estilos/${esSlug}`, page, buildStyleLanguageAlternates(enSlug)),
    openGraph: { title, description },
  };
}

export default async function StyleDetailPage({ params, searchParams }: StylePageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);
  const styleData = await getStyleByLocalizedSlug(slug);
  const englishName = styleData?.name ?? unslugifyStyle(slug);
  const displayName = styleData?.name_es?.trim() || englishName;
  const esSlug = styleData?.slug_es?.trim() || styleData?.slug || slug;

  let descriptionText = styleData?.description_es?.trim() || styleData?.description?.trim() || null;
  if (!descriptionText && englishName) {
    const pattern = `%${englishName}%`;
    const { data: styleByName } = await supabase
      .from("styles")
      .select("description_es, description")
      .ilike("name", pattern)
      .limit(1)
      .maybeSingle();
    descriptionText = styleByName?.description_es?.trim() || styleByName?.description?.trim() || null;
  }

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, title_sp, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text",
      { count: "exact" }
    )
    .eq("style_title", englishName)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[StyleDetailPage/es]", slug, englishName, error);
    return <p>Error loading data</p>;
  }

  const rows = (data as ArtworkRow[] | null) ?? [];
  const totalCount = count ?? 0;

  const artworks: Artwork[] = rows.map((item) => ({
    id: item.id,
    title: localizeRowTitle(item, "es"),
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
    styleSlug: esSlug,
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
        name={`Arte ${displayName}`}
        path={`/es/estilos/${esSlug}`}
        description={descriptionText}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "Inicio", href: "/es" }, { label: "Estilos", href: "/es/estilos" }, { label: displayName }]}
        currentPath={`/es/estilos/${esSlug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">Arte {displayName}</h1>
      {descriptionText ? (
        <div className="max-w-3xl mb-8 text-sm leading-relaxed text-[#4a4a4a]">
          <p>{descriptionText}</p>
        </div>
      ) : null}
      <ArtworkGrid artworks={artworks} basePath="/es" />
      <Pagination
        currentPage={page}
        totalPages={pagesOrNotFound(page, totalCount || artworks.length)}
        basePath={`/es/estilos/${esSlug}`}
      />
    </div>
  );
}
