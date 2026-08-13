import Link from "next/link";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { BrowseHubGrid } from "@/components/BrowseHubGrid";
import { getMatchingTagsFromArtworks, runSegmentedSearch, type SiteSearchArtworkRow } from "@/lib/site-search";
import { SearchAnalytics } from "@/components/SearchAnalytics";
import { slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string; tab?: string }>;
};

const TAB_KEYS = ["artworks", "artists", "books", "prints"] as const;
type TabKey = (typeof TAB_KEYS)[number];
const TAB_LABELS: Record<TabKey, string> = {
  artworks: "Artworks",
  artists: "Artists",
  books: "Books",
  prints: "Prints",
};
// Fetch caps — show "n+" when a tab is saturated rather than a misleading exact total.
const TAB_CAPS: Record<TabKey, number> = { artworks: 100, artists: 20, books: 60, prints: 60 };

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

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
  const activeTab: TabKey = (TAB_KEYS as readonly string[]).includes(resolved.tab ?? "")
    ? (resolved.tab as TabKey)
    : "artworks";

  if (!q) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-5 py-10">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Search</h1>
        <p className="text-sm text-[#6b6b6b]">Type a keyword in the home search bar to see results.</p>
      </div>
    );
  }

  const { paintings, prints, books, artists, error } = await runSegmentedSearch(q);

  if (error && !paintings.length && !prints.length && !books.length && !artists.length) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-5 py-10">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Search</h1>
        <p className="text-sm text-[#6b6b6b]">Error loading search results.</p>
      </div>
    );
  }

  const paintingArtworks = paintings.map(toArtwork);
  const printArtworks = prints.map(toArtwork);
  const bookArtworks = books.map(toArtwork);
  const matchingTags = getMatchingTagsFromArtworks(paintings, q);

  const counts: Record<TabKey, number> = {
    artworks: paintingArtworks.length,
    artists: artists.length,
    books: bookArtworks.length,
    prints: printArtworks.length,
  };
  const countLabel = (key: TabKey) =>
    counts[key] >= TAB_CAPS[key] ? `${counts[key]}+` : `${counts[key]}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-10">
      <SearchAnalytics
        query={q}
        locale="en"
        results={paintingArtworks.length + printArtworks.length + bookArtworks.length}
      />
      <h1 className="text-3xl font-semibold text-[#1a1a1a]">Results for &quot;{q}&quot;</h1>

      <div className="flex flex-wrap gap-x-7 gap-y-1 border-b border-[#e5e2da]">
        {TAB_KEYS.map((key) => {
          const isActive = key === activeTab;
          return (
            <Link
              key={key}
              href={`/search?q=${encodeURIComponent(q)}&tab=${key}`}
              scroll={false}
              className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[#1a1a1a] text-[#1a1a1a]"
                  : "border-transparent text-[#6b6b6b] hover:text-[#1a1a1a]"
              }`}
            >
              {TAB_LABELS[key]} ({countLabel(key)})
            </Link>
          );
        })}
      </div>

      {activeTab === "artworks" && (
        <section className="space-y-6">
          {paintingArtworks.length ? (
            <ArtworkGrid artworks={paintingArtworks} />
          ) : (
            <p className="text-sm text-[#6b6b6b]">No artworks found.</p>
          )}
          {matchingTags.length ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {matchingTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/topics/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, "-"))}`}
                  className="rounded-full bg-[#f0ede8] px-3 py-1 text-xs text-[#4a4a4a] transition-colors hover:bg-[#e0ddd8]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {activeTab === "artists" && (
        <section>
          {artists.length ? (
            <BrowseHubGrid
              items={artists.map((artist) => ({
                name: artist.name,
                href: `/artists/${artist.slug}`,
                count: artist.count,
                imageId: artist.image_id,
                url: artist.url,
              }))}
            />
          ) : (
            <p className="text-sm text-[#6b6b6b]">No artists found.</p>
          )}
        </section>
      )}

      {activeTab === "books" && (
        <section>
          {bookArtworks.length ? (
            <ArtworkGrid artworks={bookArtworks} />
          ) : (
            <p className="text-sm text-[#6b6b6b]">No book illustrations found.</p>
          )}
        </section>
      )}

      {activeTab === "prints" && (
        <section>
          {printArtworks.length ? (
            <ArtworkGrid artworks={printArtworks} />
          ) : (
            <p className="text-sm text-[#6b6b6b]">No prints found.</p>
          )}
        </section>
      )}
    </div>
  );
}
