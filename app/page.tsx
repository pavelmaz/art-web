import Link from "next/link";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { supabase } from "@/lib/supabase";
import { artworkImageUrl, slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

function toImageUrl(imageId: string | null): string {
  if (!imageId) {
    return "";
  }

  if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
    return imageId;
  }

  return `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
}

export default async function HomePage() {
  const orderedQuery = await supabase
    .from("daily_artworks")
    .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
    .order("score", { ascending: false })
    .limit(12);

  let rows = orderedQuery.data ?? [];

  if (orderedQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("daily_artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score")
      .limit(300);

    if (fallbackQuery.error) {
      return <p>Error loading data</p>;
    }

    rows = (fallbackQuery.data ?? []).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 12);
  } else if (orderedQuery.error) {
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
  }));

  if (!artworks.length) {
    return <p>No artworks found</p>;
  }

  const featuredArtistsQuery = await supabase
    .from("daily_artworks")
    .select("display_artists, artist_display, image_id, url")
    .limit(500);

  const featuredArtistRows =
    (featuredArtistsQuery.data as
      | Array<{
          display_artists: string[] | string | null;
          artist_display: string | null;
          image_id: string | null;
          url: string | null;
        }>
      | null) ?? [];

  const featuredArtistsMap = new Map<
    string,
    { name: string; count: number; image_id: string | null; url: string | null }
  >();

  for (const row of featuredArtistRows) {
    const names =
      Array.isArray(row.display_artists)
        ? row.display_artists
        : typeof row.display_artists === "string"
          ? row.display_artists.split(",")
          : row.artist_display
            ? [row.artist_display]
            : [];

    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) {
        continue;
      }

      const key = name.toLowerCase();
      const existing = featuredArtistsMap.get(key);
      if (!existing) {
        featuredArtistsMap.set(key, {
          name,
          count: 1,
          image_id: row.image_id,
          url: row.url,
        });
        continue;
      }

      existing.count += 1;
      if (!existing.url && row.url) {
        existing.url = row.url;
      }
      if (!existing.image_id && row.image_id) {
        existing.image_id = row.image_id;
      }
    }
  }

  const featuredArtists = Array.from(featuredArtistsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div>
      <section
        className="relative w-full bg-[#1a1a1a] bg-cover bg-center py-24"
        style={{ backgroundImage: "url('/hero-bg.png')" }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative mx-auto max-w-7xl px-6 text-left">
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Free Public Domain Art &amp;
            <br />
            Classic Paintings &amp; Illustrations
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#d0d0d0]">
            Browse thousands of museum masterpieces free to download, share, and use for personal
            or commercial projects.
          </p>
        </div>
      </section>

      {featuredArtists.length ? (
        <section className="w-full bg-[#faf9f7] py-8">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="mb-4 text-sm font-medium text-[#4a4a4a]">Featured artists</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {featuredArtists.map((artist) => {
                const backgroundImageUrl = artworkImageUrl({
                  url: artist.url,
                  image_id: artist.image_id,
                });

                return (
                  <Link
                    key={artist.name}
                    href={`/artists/${slugify(artist.name)}`}
                    className="group relative h-28 w-44 shrink-0 overflow-hidden bg-[#d8d4cc] md:w-52 lg:w-56"
                  >
                    {backgroundImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={backgroundImageUrl}
                        alt={artist.name}
                        className="h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.12)_60%)]" />
                    <div className="absolute bottom-0 left-0 p-2">
                      <p className="truncate text-xs font-medium text-white">{artist.name}</p>
                      <p className="text-[11px] text-white/80">{artist.count} items</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="w-full bg-[#faf9f7] py-12">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-8 text-xl font-semibold text-[#1a1a1a]">Featured Artworks</h2>
          <ArtworkGrid artworks={artworks} />
        </div>
      </section>
    </div>
  );
}
