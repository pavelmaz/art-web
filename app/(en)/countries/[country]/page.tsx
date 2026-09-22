import type { Metadata } from "next";
import { topicsCountriesPageMetadata } from "@/lib/topics-countries-seo";
import { notFound } from "next/navigation";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

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

  const title = `${countryName} Paintings — Free Public Domain Art | Fine Art Free`;
  const description = `Browse ${totalCount} public domain artworks from ${countryName} free to download in high resolution.`;

  return topicsCountriesPageMetadata({
    canonicalPath: `/countries/${slug}`,
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

/** Countries whose "famous {adjective} paintings" query has real search volume;
 *  maps the DB country name to the searched adjective (France → French). */
const FAMOUS_SECTION_COUNTRIES: Record<string, string> = {
  France: "French",
  Spain: "Spanish",
  Italy: "Italian",
};

export default async function CountryPage({ params, searchParams }: CountryPageProps) {
  const { country: slug } = await params;
  const countryName = unslugify(decodeURIComponent(slug));

  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const { data, count, error } = await supabase
    .from("artworks")
    .select(
      "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, alt_text",
      { count: "exact" }
    )
    .eq("location", countryName)
    .range(from, to);

  if (error) {
    console.error("[CountryPage]", slug, error);
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
          { label: "Home", href: "/" },
          { label: "Countries", href: "/countries" },
          { label: countryName },
        ]}
        currentPath={`/countries/${slug}`}
      />
      <h1 className="text-3xl font-bold tracking-tight">{countryName} Paintings</h1>
      <p className="max-w-3xl text-neutral-700">
        Browse free public domain artworks from {countryName} — paintings, illustrations, and museum pieces.
      </p>
      {page === 1 && FAMOUS_SECTION_COUNTRIES[countryName] ? (
        <h2 className="text-base font-semibold">Famous {FAMOUS_SECTION_COUNTRIES[countryName]} Paintings</h2>
      ) : null}
      <ArtworkGrid artworks={uniqueArtworks} />
      <Pagination
        currentPage={page}
        totalPages={pagesOrNotFound(page, totalCount || uniqueArtworks.length)}
        basePath={`/countries/${slug}`}
      />
    </div>
  );
}
