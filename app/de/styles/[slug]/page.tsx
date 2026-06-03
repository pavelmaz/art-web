import { buildStyleLanguageAlternates, localePath } from "@/lib/locale-routes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl, styleSlugLookupVariants } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

type StyleRow = {
  name: string;
  name_de: string | null;
  description: string | null;
  description_de: string | null;
  slug: string;
  slug_de: string | null;
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

  const cols = "name, name_de, description, description_de, slug, slug_de";

  for (const variant of styleSlugLookupVariants(trimmed)) {
    const { data: byLocalized } = await supabase
      .from("styles")
      .select(cols)
      .ilike("slug_de", variant)
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
  const displayName = style?.name_de?.trim() || englishName;

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("style_title", englishName);

  const totalCount = countQuery.count ?? 0;

  if (!totalCount) {
    notFound();
  }

  const title = `${displayName} — Kostenlose Stile | Fine Art Free`;
  const description =
    style?.description_de?.trim() ||
    style?.description?.trim() ||
    `Entdecken Sie ${totalCount} Werke von ${displayName} in hoher Auflösung. Gemeinfrei, kostenlos.`;

  const linkSlug = style?.slug_de?.trim() || style?.slug || slug;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `https://fineartfree.com${localePath("de", "styles")}/${linkSlug}`,
      languages: buildStyleLanguageAlternates(style?.slug || slug),
    },
    openGraph: { title, description },
  };
}

export default async function StylePage({ params, searchParams }: StylePageProps) {
  const { slug } = await params;
  const style = await getStyleByLocalizedSlug(slug);
  const englishName = style?.name ?? unslugifyStyle(slug);
  const displayName = style?.name_de?.trim() || englishName;
  const intro = style?.description_de?.trim() || style?.description?.trim() || null;
  const linkSlug = style?.slug_de?.trim() || style?.slug || slug;

  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

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
    console.error("[StylePage/de]", slug, englishName, error);
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

  if (!artworks.length) notFound();

  return (
    <div className="space-y-6 px-5">
      <CollectionPageJsonLd
        name={`Stil ${displayName}`}
        path={`/de/styles/${linkSlug}`}
        description={intro}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/de" },
          { label: "Styles", href: "/de/styles" },
          { label: displayName },
        ]}
        currentPath={`/de/styles/${linkSlug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">Stil {displayName}</h1>
      {intro ? (
        <div className="max-w-3xl mb-8 text-sm leading-relaxed text-[#4a4a4a]">
          <p>{intro}</p>
        </div>
      ) : null}
      <ArtworkGrid artworks={artworks} basePath="/de" />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount))}
        basePath={`/de/styles/${linkSlug}`}
      />
    </div>
  );
}
