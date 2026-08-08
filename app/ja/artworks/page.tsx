import type { Metadata } from "next";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { Pagination } from "@/components/Pagination";
import { getCachedArtworksBrowseSlice, getCachedArtworksSearchResults } from "@/lib/cached-artworks-page";
import { getPaginationParams, pagesOrNotFound } from "@/lib/pagination";
import { hubListPageMetadata } from "@/lib/list-page-metadata";
import { absoluteUrl } from "@/lib/utils";
import { getT } from "@/lib/translations";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

const t = getT("ja");

export async function generateMetadata({ searchParams }: ArtworksPageProps): Promise<Metadata> {
  const { page, q } = await searchParams;
  return hubListPageMetadata({
    canonicalPath: "/ja/artworks",
    hub: "artworks",
    title: { absolute: "作品一覧 — パブリックドメイン無料ダウンロード | Fine Art Free" },
    description: "7万件以上のパブリックドメイン美術作品を高解像度で無料ダウンロード。古典絵画、版画、イラストを個人・商用にご利用いただけます。",
    page,
    q,
    openGraph: {
    title: "作品一覧 — パブリックドメイン無料ダウンロード | Fine Art Free",
    description:
      "7万件以上のパブリックドメイン美術作品を高解像度で無料ダウンロード。古典絵画、版画、イラストを個人・商用にご利用いただけます。",
  },
  });
}


function toImageUrl(imageId: string | null): string {
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
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
          <h1 className="text-3xl font-bold tracking-tight">{t.artworks}</h1>
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
          <h1 className="text-3xl font-bold tracking-tight">{t.artworks}</h1>
          <p>「{q}」の{t.noResults}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 px-5">
        <h1 className="text-3xl font-bold tracking-tight">{t.artworks}</h1>
        <p className="text-sm text-[#6b6b6b]">「{q}」の{t.results}</p>
        <ArtworkGrid artworks={artworks} basePath="/ja" />
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
        <h1 className="text-3xl font-bold tracking-tight">{t.artworks}</h1>
        <p>{t.noArtworksFound}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-5">
      <h1 className="text-3xl font-bold tracking-tight">{t.artworks}</h1>
      <ArtworkGrid artworks={artworks} basePath="/ja" />
      <Pagination
        currentPage={page}
        totalPages={pagesOrNotFound(page, totalCount)}
        basePath="/ja/artworks"
      />
    </div>
  );
}
