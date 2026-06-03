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
  name_es: string | null;
  name_pt: string | null;
  description: string | null;
  description_pt: string | null;
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

  const cols = "name, name_es, name_pt, description, description_pt, slug, slug_es, slug_pt";

  for (const variant of styleSlugLookupVariants(trimmed)) {
    const { data: byLocalized } = await supabase
      .from("styles")
      .select(cols)
      .ilike("slug_pt", variant)
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
  const displayName = style?.name_pt?.trim() || englishName;

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("style_title", englishName);

  const totalCount = countQuery.count ?? 0;

  if (!totalCount) {
    notFound();
  }

  const title = `Arte ${displayName} — Download Gratuito Domínio Público | Fine Art Free`;
  const description = style?.description_pt?.trim()
    || `Baixe ${totalCount} obras de arte ${displayName} em alta resolução. Arte de domínio público grátis para uso pessoal e comercial.`;

  const esSlug = style?.slug_es?.trim() || style?.slug || slug;
  const ptSlug = style?.slug_pt?.trim() || style?.slug || slug;
  const enSlug = style?.slug || slug;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/pt/estilos/${ptSlug}`),
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
  const displayName = styleData?.name_pt?.trim() || englishName;
  const ptSlug = styleData?.slug_pt?.trim() || styleData?.slug || slug;

  let descriptionText = styleData?.description_pt?.trim() || styleData?.description?.trim() || null;
  if (!descriptionText && englishName) {
    const pattern = `%${englishName}%`;
    const { data: styleByName } = await supabase
      .from("styles")
      .select("description_pt, description")
      .ilike("name", pattern)
      .limit(1)
      .maybeSingle();
    descriptionText = styleByName?.description_pt?.trim() || styleByName?.description?.trim() || null;
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
    console.error("[StyleDetailPage/pt]", slug, englishName, error);
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
    styleSlug: ptSlug,
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
        path={`/pt/estilos/${ptSlug}`}
        description={descriptionText}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "Início", href: "/pt" }, { label: "Estilos", href: "/pt/estilos" }, { label: displayName }]}
        currentPath={`/pt/estilos/${ptSlug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">Arte {displayName}</h1>
      {descriptionText ? (
        <div className="max-w-3xl mb-8 text-sm leading-relaxed text-[#4a4a4a]">
          <p>{descriptionText}</p>
        </div>
      ) : null}
      <ArtworkGrid artworks={artworks} basePath="/pt" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount || artworks.length))}
        basePath={`/pt/estilos/${ptSlug}`}
      />
    </div>
  );
}
