import type { Metadata } from "next";
import Link from "next/link";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { MuseumLogoStrip } from "@/components/MuseumLogoStrip";
import { RotatingProHero } from "@/components/RotatingProHero";
import { WebSiteJsonLd } from "@/components/JsonLd";
import { supabase } from "@/lib/supabase";
import { artworkImageUrl, slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Fine Art Free — Download 500,000+ Public Domain Paintings & Art",
  description:
    "Download 500,000+ public domain paintings, classic artworks and fine art images free. High resolution, from the world's top museums. Free for commercial use.",
  alternates: {
    canonical: "https://fineartfree.com",
  },
  openGraph: {
    title: "Fine Art Free — Download 500,000+ Public Domain Paintings & Art",
    description:
      "Browse and download 500,000+ classic paintings free. Public domain art from top museums. Free for any use.",
  },
};

const GENRE_STRIPS = [
  { slug: "landscape", label: "Landscape", genreTitle: "Landscape" },
  { slug: "portrait", label: "Portrait", genreTitle: "Portrait" },
  { slug: "religious", label: "Religious", genreTitle: "Religious" },
  { slug: "marine", label: "Marine", genreTitle: "Marine" },
  { slug: "still-life", label: "Still Life", genreTitle: "Still Life" },
  { slug: "historical", label: "Historical", genreTitle: "Historical" },
  { slug: "architecture", label: "Architecture", genreTitle: "Architecture" },
  { slug: "genre-scene", label: "Genre Scene", genreTitle: "Genre Scene" },
  { slug: "animal", label: "Animal", genreTitle: "Animal" },
  { slug: "mythology", label: "Mythology", genreTitle: "Mythology" },
  { slug: "abstract", label: "Abstract", genreTitle: "Abstract" },
  { slug: "figurative", label: "Figurative", genreTitle: "Figurative" },
  { slug: "interior", label: "Interior", genreTitle: "Interior" },
  { slug: "botanical", label: "Botanical", genreTitle: "Botanical" },
  { slug: "illustration", label: "Illustration", genreTitle: "Illustration" },
  { slug: "decorative-art", label: "Decorative Art", genreTitle: "Decorative Art" },
  { slug: "allegory", label: "Allegory", genreTitle: "Allegory" },
  { slug: "drawing", label: "Drawing", genreTitle: "Drawing" },
];

export default async function HomePage() {
  const orderedQuery = await supabase
    .from("daily_artworks")
    .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text")
    .order("score", { ascending: false })
    .limit(12);

  let rows = orderedQuery.data ?? [];

  if (orderedQuery.error?.code === "57014") {
    const fallbackQuery = await supabase
      .from("daily_artworks")
      .select("id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text")
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
    imageUrl: artworkImageUrl({ url: item.url ?? null, image_id: item.image_id }),
    imageId: item.image_id,
    museum: item.museum,
    styleTitle: item.style_title,
    genreTitle: item.genre_title,
    score: item.score,
    url: item.url,
    styleSlug: "unknown",
    styleName: item.style_title ?? "Unknown style",
    sourceUrl: item.url ?? undefined,
    altText: item.alt_text ?? null,
  }));

  if (!artworks.length) {
    return <p>No artworks found</p>;
  }

  const featuredArtistsMap = new Map<
    string,
    { name: string; count: number; image_id: string | null; url: string | null }
  >();

  for (const item of artworks) {
    const name = item.artistName?.trim();
    if (!name || name.toLowerCase() === "unknown artist") {
      continue;
    }

    const key = name.toLowerCase();
    const existing = featuredArtistsMap.get(key);
    if (!existing) {
      featuredArtistsMap.set(key, {
        name,
        count: 1,
        image_id: item.imageId ?? null,
        url: item.url ?? null,
      });
      continue;
    }

    existing.count += 1;
    if (!existing.url && item.url) {
      existing.url = item.url;
    }
    if (!existing.image_id && item.imageId) {
      existing.image_id = item.imageId;
    }
  }

  const safeFeaturedArtistsBase = Array.from(featuredArtistsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const safeFeaturedArtists = await Promise.all(
    safeFeaturedArtistsBase.map(async (artist) => {
      const { count, error } = await supabase
        .from("artworks")
        .select("id", { count: "exact", head: true })
        .eq("artist_display", artist.name);
      if (error) {
        return artist;
      }
      return { ...artist, count: count ?? 0 };
    })
  );

  const genreImages = await Promise.all(
    GENRE_STRIPS.map(async (genre) => {
      const { data } = await supabase
        .from("artworks")
        .select("image_id, url")
        .eq("genre_title", genre.genreTitle)
        .limit(1);
      const row = data?.[0];
      return {
        ...genre,
        imageUrl: row ? artworkImageUrl({ url: row.url ?? null, image_id: row.image_id }, { quality: 30 }) : null,
      };
    })
  );

  return (
    <div>
      <WebSiteJsonLd />
      <section className="relative w-full bg-[#1a1a1a] py-20">
        <div className="relative z-10 mx-auto flex max-w-7xl items-center gap-12 px-5">
          <div className="min-w-0 flex-1 text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              Classic Art, Free to Download
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg text-white">
              500,000+ public domain paintings, prints and illustrations from the world&apos;s
              greatest museums — free for personal and commercial use.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {["Public Domain", "Commercial Use", "No Attribution", "High Resolution"].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/15 px-3 py-1 text-xs text-white backdrop-blur"
                >
                  <span aria-hidden>✓</span>
                  {badge}
                </span>
              ))}
            </div>
            <form action="/search" method="get" className="mt-8 max-w-xl">
              <div className="flex items-center rounded-full border border-white/25 bg-white/10 px-5 py-3 backdrop-blur-md">
                <input
                  type="text"
                  name="q"
                  placeholder="Search by artwork title or artist"
                  className="w-full bg-transparent text-[15px] text-white placeholder:text-white/55 focus:outline-none"
                  aria-label="Search by artwork title or artist"
                />
                <button type="submit" className="pl-2 text-2xl text-white" aria-label="Search">
                  ⌕
                </button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-white/70">Popular:</span>
              {[
                { href: "/artists/vincent-van-gogh", label: "van gogh" },
                { href: "/artworks/water-lilies-claude-monet", label: "monet water lilies" },
                { href: "/genres/botanical", label: "botanical prints" },
                { href: "/styles/ukiyo-e", label: "japanese woodblock" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm text-white/90 backdrop-blur-md transition hover:border-white/40 hover:bg-white/20 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden w-[340px] shrink-0 lg:block xl:w-[380px]">
            <div className="overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <RotatingProHero alt="Famous public domain paintings, free to download" />
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-14 max-w-7xl px-5">
          <MuseumLogoStrip />
        </div>
      </section>

      <div className="w-full overflow-x-auto scrollbar-hide bg-[#f6f4ee] px-5 py-6">
        <div className="flex gap-3 min-w-max">
          {genreImages.map((genre) => (
            <Link
              key={genre.slug}
              href={`/genres/${genre.slug}`}
              className="relative overflow-hidden rounded-lg h-22 px-10 flex items-center justify-center whitespace-nowrap transition-opacity hover:opacity-90"
            >
              {genre.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={genre.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60" />
                </>
              ) : (
                <div className="absolute inset-0 bg-[#1a1a1a]" />
              )}
              <span className="relative text-sm font-medium text-white">{genre.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <section className="w-full bg-[#f6f4ee] py-8">
        <div className="px-5">
          <h2 className="mb-8 text-xl font-semibold text-[#1a1a1a]">Browse by Artist</h2>
          {safeFeaturedArtists.length ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {safeFeaturedArtists.map((artist) => {
                const backgroundImageUrl = artworkImageUrl({
                  url: artist.url,
                  image_id: artist.image_id,
                });

                return (
                  <Link
                    key={artist.name}
                    href={`/artists/${slugify(artist.name)}`}
                    className="group relative h-40 w-44 shrink-0 overflow-hidden bg-[#d8d4cc] md:h-44 md:w-52 lg:h-48 lg:w-56"
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
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/90 via-black/65 to-transparent"
                      aria-hidden
                    />
                    <div className="absolute bottom-0 left-0 p-3">
                      <p className="truncate text-xs font-medium text-white drop-shadow-sm">{artist.name}</p>
                      <p className="text-[11px] text-white/90 drop-shadow-sm">{artist.count} items</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#6b6b6b]">No featured artists available yet.</p>
          )}
        </div>
      </section>

      <section className="w-full bg-[#f6f4ee] py-12">
        <div className="px-5">
          <h2 className="mb-8 text-xl font-semibold text-[#1a1a1a]">Free Public Domain Artworks</h2>
          <ArtworkGrid artworks={artworks} />
          <div className="mt-8">
            <Link
              href="/artworks?page=2"
              className="inline-flex items-center rounded-md bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white hover:bg-[#333]"
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
