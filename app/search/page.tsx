import Link from "next/link";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

type ArtworkRow = {
  id: string;
  title: string;
  slug: string | null;
  artist_display: string | null;
  image_id: string | null;
  museum: string | null;
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

function toArtwork(item: ArtworkRow): Artwork | null {
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
    score: null,
    url: null,
    styleSlug: "unknown",
    styleName: "Unknown style",
    sourceUrl: undefined,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = await searchParams;
  const q = resolved.q?.trim() ?? "";

  if (!q) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-6 py-10">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Search</h1>
        <p className="text-sm text-[#6b6b6b]">Type a keyword in the home search bar to see results.</p>
      </div>
    );
  }

  const query = q.replace(/[%_]/g, "");
  const { data, error } = await supabase
    .from("artworks")
    .select("id, title, slug, artist_display, image_id, museum")
    .or(`title.ilike.%${query}%,artist_display.ilike.%${query}%`)
    .limit(50);

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-6 py-10">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Search</h1>
        <p className="text-sm text-[#6b6b6b]">Error loading search results.</p>
      </div>
    );
  }

  const artworks = (((data as ArtworkRow[] | null) ?? []).map(toArtwork).filter(Boolean) as Artwork[]);

  const artistsMap = new Map<string, { name: string; count: number }>();
  for (const artwork of artworks) {
    const name = artwork.artistDisplay?.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    const existing = artistsMap.get(key);
    if (!existing) {
      artistsMap.set(key, { name, count: 1 });
    } else {
      existing.count += 1;
    }
  }
  const artistResults = Array.from(artistsMap.values()).sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-[#1a1a1a]">Results for &quot;{q}&quot;</h1>
        <div className="flex flex-wrap gap-4 text-sm text-[#6b6b6b]">
          <span>Artworks ({artworks.length})</span>
          <span>Artists ({artistResults.length})</span>
          <span>Books (0)</span>
          <span>Galleries (0)</span>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#1a1a1a]">Artworks ({artworks.length})</h2>
        {artworks.length ? (
          <ArtworkGrid artworks={artworks} />
        ) : (
          <p className="text-sm text-[#6b6b6b]">No artworks found.</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[#1a1a1a]">Artists ({artistResults.length})</h2>
        {artistResults.length ? (
          <ul className="space-y-2">
            {artistResults.map((artist) => (
              <li key={artist.name}>
                <Link href={`/artists/${slugify(artist.name)}`} className="text-sm text-[#1a1a1a] underline">
                  {artist.name}
                </Link>
                <span className="ml-2 text-xs text-[#6b6b6b]">{artist.count} artworks</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#6b6b6b]">No artists found.</p>
        )}
      </section>
    </div>
  );
}
