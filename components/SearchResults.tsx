import Link from "next/link";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { ArtistGrid } from "@/components/ArtistGrid";
import { SearchAnalytics } from "@/components/SearchAnalytics";
import { SearchTabs, type SearchTabItem } from "@/components/SearchTabs";
import { getMatchingTagsFromArtworks, type SegmentedSearch, type SiteSearchArtworkRow } from "@/lib/site-search";
import { slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export type SearchResultsConfig = {
  locale: string;
  /** Route that owns the results page, e.g. "/search" or "/es/buscar". */
  searchPath: string;
  /** Locale prefix for grids + topic links, e.g. "" or "/es". */
  basePath: string;
  /** Artist detail base, e.g. "/artists" or "/es/artistas". */
  artistPath: string;
  labels: {
    searchTitle: string;
    emptyPrompt: string;
    errorText: string;
    heading: (q: string) => string;
    artworks: string;
    artists: string;
    books: string;
    prints: string;
    noResults: string;
  };
};

// Fetch caps — show "n+" when a tab is saturated rather than a misleading exact total.
const TAB_CAPS = { artworks: 100, artists: 20, books: 60, prints: 60 };

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

function InfoState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-5 py-10">
      <h1 className="text-2xl font-semibold text-[#1a1a1a]">{title}</h1>
      <p className="text-sm text-[#6b6b6b]">{body}</p>
    </div>
  );
}

/** Shared, locale-parameterised search results with instant Artworks/Artists/Books/Prints tabs. */
export function SearchResults({
  q,
  tab,
  results,
  config,
}: {
  q: string;
  tab?: string;
  results: SegmentedSearch | null;
  config: SearchResultsConfig;
}) {
  const { labels } = config;

  if (!q) return <InfoState title={labels.searchTitle} body={labels.emptyPrompt} />;

  const empty =
    !results ||
    (results.error &&
      !results.paintings.length &&
      !results.prints.length &&
      !results.books.length &&
      !results.artists.length);
  if (empty) return <InfoState title={labels.searchTitle} body={labels.errorText} />;

  const paintingArtworks = results.paintings.map(toArtwork);
  const printArtworks = results.prints.map(toArtwork);
  const bookArtworks = results.books.map(toArtwork);
  const matchingTags = getMatchingTagsFromArtworks(results.paintings, q);
  const gridBasePath = config.basePath || undefined;

  const countLabel = (n: number, cap: number) => (n >= cap ? `${n}+` : `${n}`);
  const noResults = <p className="text-sm text-[#6b6b6b]">{labels.noResults}</p>;

  const tabs: SearchTabItem[] = [
    {
      key: "artworks",
      label: labels.artworks,
      count: countLabel(paintingArtworks.length, TAB_CAPS.artworks),
      content: paintingArtworks.length ? (
        <div className="space-y-6">
          <ArtworkGrid artworks={paintingArtworks} basePath={gridBasePath} />
          {matchingTags.length ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {matchingTags.map((t) => (
                <Link
                  key={t}
                  href={`${config.basePath}/artworks?tag=${encodeURIComponent(t)}`}
                  className="rounded-full bg-[#f0ede8] px-3 py-1 text-xs text-[#4a4a4a] transition-colors hover:bg-[#e0ddd8]"
                >
                  #{t}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        noResults
      ),
    },
    {
      key: "artists",
      label: labels.artists,
      count: countLabel(results.artists.length, TAB_CAPS.artists),
      content: results.artists.length ? (
        <ArtistGrid artists={results.artists} artistPath={config.artistPath} artworksWord={labels.artworks} />
      ) : (
        noResults
      ),
    },
    {
      key: "books",
      label: labels.books,
      count: countLabel(bookArtworks.length, TAB_CAPS.books),
      content: bookArtworks.length ? <ArtworkGrid artworks={bookArtworks} basePath={gridBasePath} /> : noResults,
    },
    {
      key: "prints",
      label: labels.prints,
      count: countLabel(printArtworks.length, TAB_CAPS.prints),
      content: printArtworks.length ? <ArtworkGrid artworks={printArtworks} basePath={gridBasePath} /> : noResults,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <SearchAnalytics
        query={q}
        locale={config.locale}
        results={paintingArtworks.length + printArtworks.length + bookArtworks.length}
      />
      <h1 className="mb-6 text-3xl font-semibold text-[#1a1a1a]">{labels.heading(q)}</h1>
      <SearchTabs tabs={tabs} initialTab={tab ?? "artworks"} searchPath={config.searchPath} q={q} />
    </div>
  );
}
