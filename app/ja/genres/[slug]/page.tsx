import type { Metadata } from "next";
import { paginatedAlternates } from "@/lib/list-page-metadata";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionPageJsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { buildGenreLanguageAlternates } from "@/lib/locale-routes";
import { absoluteUrl } from "@/lib/utils";
import { localizeRowTitle } from "@/lib/artwork-i18n";
import { getT } from "@/lib/translations";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

const t = getT("ja");

type GenrePageProps = {
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

type GenreRow = {
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

async function getGenreByLocalizedSlug(slug: string): Promise<GenreRow | null> {
  const cols =
    "name, name_es, name_pt, name_ja, description, description_es, description_ja, slug, slug_es, slug_pt, slug_ja";

  const { data: byEnglish } = await supabase.from("genres").select(cols).eq("slug", slug).maybeSingle();

  if (byEnglish) return byEnglish as GenreRow;

  const { data: byLocalized } = await supabase.from("genres").select(cols).eq("slug_es", slug).maybeSingle();

  return (byLocalized as GenreRow) ?? null;
}

function toImageUrl(imageId: string | null): string {
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

export async function generateMetadata({ params, searchParams }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await searchParams;
  const genre = await getGenreByLocalizedSlug(slug);
  if (!genre) notFound();

  const displayName = genre.name_ja?.trim() || genre.name;

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("genre_title", genre.name);

  const totalCount = countQuery.count ?? 0;
  if (!totalCount) notFound();

  const title = `「${displayName}」の作品 — 無料ダウンロード | Fine Art Free`;
  const description =
    genre.description_ja?.trim()?.slice(0, 200) ||
    genre.description?.trim()?.slice(0, 200) ||
    `「${displayName}」のパブリックドメイン絵画を${totalCount}点以上、高解像度で無料ダウンロード。`;

  const urlSlug = genre.slug;
  const esSlug = genre.slug_es?.trim() || genre.slug;
  const ptSlug = genre.slug_pt?.trim() || genre.slug;

  return {
    title: { absolute: title },
    description,
    alternates: paginatedAlternates(`/ja/genres/${urlSlug}`, page, buildGenreLanguageAlternates(genre.slug)),
    openGraph: { title, description },
  };
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  const genre = await getGenreByLocalizedSlug(slug);
  if (!genre) notFound();

  const displayName = genre.name_ja?.trim() || genre.name;
  const intro = genre.description_ja?.trim() || genre.description?.trim() || null;
  const urlSlug = genre.slug;

  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, title_jp, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text",
      { count: "exact" }
    )
    .eq("genre_title", genre.name)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[GenrePage/ja]", slug, genre.name, error);
    return <p>Error loading data</p>;
  }

  const rows = (data as ArtworkRow[] | null) ?? [];
  const totalCount = count ?? 0;

  const artworks: Artwork[] = rows.map((item) => ({
    id: item.id,
    title: localizeRowTitle(item, "ja"),
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

  const seen = new Set<string>();
  const uniqueArtworks = artworks.filter((artwork) => {
    if (seen.has(artwork.id)) return false;
    seen.add(artwork.id);
    return true;
  });

  if (!uniqueArtworks.length) notFound();

  return (
    <div className="space-y-6 px-5">
      <CollectionPageJsonLd
        name={`「${displayName}」の${t.artworks}`}
        path={`/ja/genres/${urlSlug}`}
        description={intro}
        numberOfItems={totalCount}
      />
      <Breadcrumbs
        items={[{ label: "ホーム", href: "/ja" }, { label: t.genres, href: "/ja/genres" }, { label: displayName }]}
        currentPath={`/ja/genres/${urlSlug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">「{displayName}」の{t.artworks}</h1>
      {intro ? (
        <div className="max-w-3xl mb-8 text-sm leading-relaxed text-[#4a4a4a]">
          <p>{intro}</p>
        </div>
      ) : null}
      <ArtworkGrid artworks={uniqueArtworks} basePath="/ja" />
      <Pagination
        currentPage={page}
        totalPages={pagesOrNotFound(page, totalCount || artworks.length)}
        basePath={`/ja/genres/${urlSlug}`}
      />
    </div>
  );
}
