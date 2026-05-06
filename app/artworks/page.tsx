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
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q?.trim() ?? "";
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  if (q) {
    const { data, error } = await supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, museum")
      .or(`title.ilike.%${q}%,artist_display.ilike.%${q}%`)
      .limit(48);

    if (error) {
      console.error("Artworks search query error:", error);
      return (
        <div className="space-y-6 px-[10px]">
          <h1 className="text-3xl font-bold tracking-tight">Artworks</h1>
          <p>Error loading data</p>
        </div>
      );
    }

    const artworks: Artwork[] = (
      (data as Array<{
        id: string;
        title: string;
        slug: string;
        artist_display: string | null;
        image_id: string | null;
        museum: string | null;
      }> | null) ?? []
    ).map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      artistName: item.artist_display ?? "Unknown artist",
      artistDisplay: item.artist_display ?? undefined,
      imageUrl: toImageUrl(item.image_id),
      imageId: item.image_id,
      museum: item.museum,
      styleTitle: null,
      genreTitle: null,
      score: null,
      url: null,
      styleSlug: "unknown",
      styleName: "Unknown style",
      sourceUrl: undefined,
    }));

    if (!artworks.length) {
      return (
        <div className="space-y-6 px-[10px]">
          <h1 className="text-3xl font-bold tracking-tight">Artworks</h1>
          <p>No results found for {q}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 px-[10px]">
        <h1 className="text-3xl font-bold tracking-tight">Artworks</h1>
        <p className="text-sm text-[#6b6b6b]">Results for &quot;{q}&quot;</p>
        <ArtworkGrid artworks={artworks} />
      </div>
    );
  }

  const orderedQueryBuilder = supabase
    .from("artworks")
    .select("*", { count: "exact" })
    .order("score", { ascending: false });

  const orderedQuery = await orderedQueryBuilder.range(from, to);

  let rows = orderedQuery.data ?? [];
  let totalCount = orderedQuery.count ?? 0;

  if (orderedQuery.error?.code === "57014") {
    let fallbackBuilder = supabase
      .from("artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score");

    if (q) {
      const escaped = q.replace(/[%_]/g, "");
      fallbackBuilder = fallbackBuilder.or(
        `title.ilike.%${escaped}%,artist_display.ilike.%${escaped}%`
      );
    }

    const fallbackQuery = await fallbackBuilder.limit(300);

    if (fallbackQuery.error) {
      console.error("Artworks fallback query error:", fallbackQuery.error);
      return <p>Error loading data</p>;
    }

    rows = (fallbackQuery.data ?? [])
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(from, to + 1);
    totalCount = fallbackQuery.data?.length ?? totalCount;
  } else if (orderedQuery.error) {
    console.error("Artworks primary query error:", orderedQuery.error);
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
    return (
      <div className="space-y-6 px-[10px]">
        <h1 className="text-3xl font-bold tracking-tight">Artworks</h1>
        <p>No artworks found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-[10px]">
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
