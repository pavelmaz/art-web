import type { Metadata } from "next";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const metadata: Metadata = {
  title: "Artworks",
  description: "Browse top-ranked public domain artworks.",
  alternates: {
    canonical: absoluteUrl("/artworks"),
  },
};

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

  return `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
}

type ArtworksPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const orderedQuery = await supabase
    .from("artworks")
    .select("*", { count: "exact" })
    .order("score", { ascending: false })
    .range(from, to);

  let rows = orderedQuery.data ?? [];
  let totalCount = orderedQuery.count ?? 0;

  if (orderedQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("artworks")
      .select(
        "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score"
      )
      .limit(300);

    if (fallbackQuery.error) {
      return <p>Error loading data</p>;
    }

    rows = (fallbackQuery.data ?? [])
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(from, to + 1);
    totalCount = fallbackQuery.data?.length ?? totalCount;
  } else if (orderedQuery.error) {
    return <p>Error loading data</p>;
  }

  const artworks: Artwork[] = rows.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    artistName: item.artist_display ?? "Unknown artist",
    artistDisplay: item.artist_display,
    imageUrl: toImageUrl(item.image_id),
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: item.style_title,
    genreTitle: item.genre_title,
    score: item.score,
    url: item.url,
    styleSlug: "unknown",
    styleName: item.style_title ?? "Unknown style",
    sourceUrl: item.url,
  }));

  if (!artworks.length) {
    return <p>No artworks found</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Artworks</h1>
      <ArtworkGrid artworks={artworks} />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, getTotalPages(totalCount))}
        basePath="/artworks"
      />
    </div>
  );
}
