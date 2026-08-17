import type { Metadata } from "next";
import { topicsCountriesPageMetadata } from "@/lib/topics-countries-seo";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";
import { localizeRowTitle } from "@/lib/artwork-i18n";
import { getT } from "@/lib/translations";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

const t = getT("ja");

type CountryPageProps = {
  params: Promise<{ country: string }>;
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
  alt_text: string | null;
};

function toImageUrl(imageId: string | null): string {
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

function unslugify(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({ params, searchParams }: CountryPageProps): Promise<Metadata> {
  const { country: slug } = await params;
  const { page } = await searchParams;
  const countryName = unslugify(decodeURIComponent(slug));

  const countQuery = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("location", countryName);

  const totalCount = countQuery.count ?? 0;

  if (!totalCount) {
    notFound();
  }

  const title = `${countryName} — パブリックドメイン無料 | Fine Art Free`;
  const description = `${countryName}のパブリックドメイン作品を${totalCount}点以上、高解像度で無料ダウンロード。`;

  return topicsCountriesPageMetadata({
    canonicalPath: `/ja/countries/${slug}`,
    kind: "countries",
    slug,
    title,
    description,
    page,
    openGraph: {
      title,
      description,
    },
  });
}

export default async function CountryPageJa({ params, searchParams }: CountryPageProps) {
  const { country: slug } = await params;
  const countryName = unslugify(decodeURIComponent(slug));

  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, title_jp, slug, artist_display, image_id, url, museum, style_title, genre_title, alt_text",
      { count: "exact" }
    )
    .eq("location", countryName)
    .range(from, to);

  if (error) {
    console.error("[CountryPage/ja]", slug, error);
    return <p>データの読み込みに失敗しました。</p>;
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
    score: null,
    url: item.url,
    styleSlug: "unknown",
    styleName: item.style_title ?? "Unknown style",
    sourceUrl: item.url ?? undefined,
    altText: item.alt_text ?? null,
  }));

  if (!artworks.length) {
    notFound();
  }

  const seen = new Set<string>();
  const uniqueArtworks = artworks.filter((artwork) => {
    if (seen.has(artwork.id)) return false;
    seen.add(artwork.id);
    return true;
  });

  return (
    <div className="space-y-6 px-5">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/ja" },
          { label: t.countries, href: "/ja/countries" },
          { label: countryName },
        ]}
        currentPath={`/ja/countries/${slug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">
        {countryName}の{t.artworks}
      </h1>
      <p className="max-w-3xl text-neutral-700">
        {countryName}のパブリックドメイン作品・絵画・美術館コレクションを無料でダウンロードできます。
      </p>
      <ArtworkGrid artworks={uniqueArtworks} basePath="/ja" />
      <Pagination
        currentPage={page}
        totalPages={pagesOrNotFound(page, totalCount || uniqueArtworks.length)}
        basePath={`/ja/countries/${slug}`}
      />
    </div>
  );
}
