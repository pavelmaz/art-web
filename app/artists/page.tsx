import Link from "next/link";
import Image from "next/image";

import { Pagination } from "@/components/Pagination";
import { getPaginationParams, getTotalPages } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { artworkImageUrl, slugify } from "@/lib/utils";

type ArtistRow = {
  artist_display: string | null;
  image_id: string | null;
  url: string | null;
  slug: string;
};

type ArtistsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ArtistsPage({ searchParams }: ArtistsPageProps) {
  const resolvedSearchParams = await searchParams;
  const { page, from, to } = getPaginationParams(resolvedSearchParams);

  const primaryQuery = await supabase
    .from("artworks")
    .select("artist_display, image_id, url, slug")
    .not("artist_display", "is", null)
    .neq("artist_display", "")
    .limit(10000);

  let rows = (primaryQuery.data as ArtistRow[] | null) ?? [];

  if (primaryQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("artworks")
      .select("artist_display, image_id, url, slug")
      .not("artist_display", "is", null)
      .neq("artist_display", "")
      .limit(5000);

    if (fallbackQuery.error) {
      return <p>Error loading data</p>;
    }

    rows = (fallbackQuery.data as ArtistRow[] | null) ?? [];
  } else if (primaryQuery.error) {
    return <p>Error loading data</p>;
  }

  const grouped = new Map<
    string,
    { artistName: string; count: number; image_id: string | null; url: string | null; slug: string }
  >();

  for (const row of rows) {
    const artistName = row.artist_display?.trim();
    if (!artistName) {
      continue;
    }

    const key = artistName.toLowerCase();
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        artistName,
        count: 1,
        image_id: row.image_id,
        url: row.url,
        slug: row.slug,
      });
      continue;
    }

    existing.count += 1;
  }

  const artists = Array.from(grouped.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.artistName.localeCompare(b.artistName);
  });
  const totalPages = Math.max(1, getTotalPages(artists.length));
  const paginatedArtists = artists.slice(from, to + 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Artists</h1>
        <p className="mb-8 text-sm text-[#6b6b6b]">Browse artworks by artist</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {paginatedArtists.map((artist) => {
          const imageUrl = artworkImageUrl({ url: artist.url, image_id: artist.image_id });

          return (
            <Link key={artist.artistName} href={`/artists/${slugify(artist.artistName)}`}>
              <div className="group relative aspect-square cursor-pointer overflow-hidden">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={artist.artistName}
                    fill={true}
                    unoptimized
                    className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-[#f0ede8]" />
                )}

                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.1)_60%)]" />

                <div className="absolute bottom-0 left-0 p-3">
                  <p className="text-sm font-semibold text-white">{artist.artistName}</p>
                  <p className="mt-0.5 text-xs text-white/70">
                    {artist.count} {artist.count === 1 ? "artwork" : "artworks"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} basePath="/artists" />
    </div>
  );
}
