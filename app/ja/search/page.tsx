import type { Metadata } from "next";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { runSiteSearch, type SiteSearchArtworkRow } from "@/lib/site-search";
import { getT } from "@/lib/translations";
import { absoluteUrl, slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const dynamic = "force-dynamic";

const t = getT("ja");

export const metadata: Metadata = {
  title: "検索 | Fine Art Free",
  description: "アーティスト名やキーワードから作品と作家を検索します。",
  alternates: {
    canonical: absoluteUrl("/ja/search"),
    languages: {
      en: absoluteUrl("/search"),
      es: absoluteUrl("/es/buscar"),
      pt: absoluteUrl("/pt/buscar"),
      ja: absoluteUrl("/ja/search"),
    },
  },
  robots: {
    index: false,
    follow: true,
  },
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

function toImageUrl(imageId: string | null): string {
  if (!imageId) return "";
  if (imageId.startsWith("http://") || imageId.startsWith("https://")) return imageId;
  return `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`;
}

function toArtwork(item: SiteSearchArtworkRow): Artwork {
  const slug = item.slug?.trim() || slugify(item.title);

  return {
    id: item.id,
    title: item.title,
    slug,
    artistName: item.artist_display ?? "Unknown artist",
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: toImageUrl(item.image_id),
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: null,
    genreTitle: null,
    score: item.score ?? null,
    url: item.url,
    styleSlug: "unknown",
    styleName: "Unknown style",
    sourceUrl: undefined,
    altText: item.alt_text ?? null,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = await searchParams;
  const q = resolved.q?.trim() ?? "";

  if (!q) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-5 py-10">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">{t.search}</h1>
        <p className="text-sm text-[#6b6b6b]">検索バーにキーワードを入力すると{t.results}が表示されます。</p>
      </div>
    );
  }

  const { artworks: rows, artists: artistResults, error } = await runSiteSearch(q);

  if (error && !rows.length) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-5 py-10">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">{t.search}</h1>
        <p className="text-sm text-[#6b6b6b]">検索{t.results}の読み込みに失敗しました。</p>
      </div>
    );
  }

  const artworks = rows.map(toArtwork);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-[#1a1a1a]">「{q}」の{t.results}</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#1a1a1a]">
          {t.artworks}（{artworks.length}）
        </h2>
        {artworks.length ? (
          <ArtworkGrid artworks={artworks} basePath="/ja" />
        ) : (
          <p className="text-sm text-[#6b6b6b]">{t.noArtworksFound}</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#1a1a1a]">
          {t.artists}（{artistResults.length}）
        </h2>
        {artistResults.length ? (
          <BrowseHubGrid
            items={artistResults.map((artist) => ({
              name: artist.name,
              href: `/ja/artists/${artist.slug}`,
              count: artist.count,
              imageId: artist.image_id,
              url: artist.url,
            }))}
          />
        ) : (
          <p className="text-sm text-[#6b6b6b]">{t.noArtistsFound}</p>
        )}
      </section>
    </div>
  );
}
