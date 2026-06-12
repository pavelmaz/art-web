import type { Metadata } from "next";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { buildHubLanguageAlternates } from "@/lib/locale-routes";
import { Pagination } from "@/components/Pagination";
import { getCachedArtworksBrowseSlice, getCachedArtworksSearchResults } from "@/lib/cached-artworks-page";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Browse All Artworks — Free Public Domain Art | Fine Art Free",
  description:
    "Download 72,000+ public domain artworks in high resolution. Classic paintings, prints and illustrations free for any use.",
  alternates: {
    canonical: "https://fineartfree.com/artworks",
    languages: buildHubLanguageAlternates("artworks"),
  },
  openGraph: {
    title: "Browse All Artworks — Free Public Domain Art | Fine Art Free",
    description:
      "Download 72,000+ public domain artworks in high resolution. Classic paintings, prints and illustrations free for any use.",
  },
};

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

type ArtworksPageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q?.trim() ?? "";
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  if (q) {
    let searchRows;
    try {
      searchRows = await getCachedArtworksSearchResults(q);
    } catch (error) {
      console.error("Artworks search query error:", error);
      return (
        <div className="space-y-6 px-5">
          <h1 className="text-3xl font-bold tracking-tight">Artworks</h1>
          <p>Error loading data</p>
        </div>
      );
    }

    const artworks: Artwork[] = searchRows.map((item) => ({
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
      altText: (item.alt_text as string | null) ?? null,
    }));

    if (!artworks.length) {
      return (
        <div className="space-y-6 px-5">
          <h1 className="text-3xl font-bold tracking-tight">Artworks</h1>
          <p>No results found for {q}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 px-5">
        <h1 className="text-3xl font-bold tracking-tight">Artworks</h1>
        <p className="text-sm text-[#6b6b6b]">Results for &quot;{q}&quot;</p>
        <ArtworkGrid artworks={artworks} />
      </div>
    );
  }

  let rows;
  let totalCount;
  try {
    const slice = await getCachedArtworksBrowseSlice(from, to);
    rows = slice.rows;
    totalCount = slice.totalCount;
  } catch (error) {
    console.error("Artworks primary query error:", error);
    return <p>Error loading data</p>;
  }

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
    altText: (item.alt_text as string | null) ?? null,
  }));

  if (!artworks.length) {
    return (
      <div className="space-y-6 px-5">
        <h1 className="text-3xl font-bold tracking-tight">Artworks</h1>
        <p>No artworks found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-5">
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
