import { buildHomeLanguageAlternates } from "@/lib/locale-routes";
import type { Metadata } from "next";
import Link from "next/link";

import { ArtworkGrid } from "@/components/ArtworkGrid";
import { WebSiteJsonLd } from "@/components/JsonLd";
import { supabase } from "@/lib/supabase";
import { getT } from "@/lib/translations";
import {
  getCachedGenresForHomeStrip,
  getGenreLabelForLocale,
  getGenreSlugForLocale,
} from "@/lib/browse-genres";
import { localePath } from "@/lib/locale-routes";
import { artworkImageUrl, slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

const t = getT('it');

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Fine Art Free — Descarga 500.000+ Opere d\'arte de Dominio Público",
  description:
    "Explora y descarga 500.000+ pinturas clásicas gratis. Arte de dominio público de los mejores musei del mundo. Gratis para uso personal y comercial.",
  openGraph: {
    title: "Fine Art Free — Descarga 500.000+ Opere d\'arte de Dominio Público",
    description:
      "Explora y descarga 500.000+ pinturas clásicas gratis. Arte de dominio público de los mejores musei del mundo. Gratis para uso personal y comercial.",
  },
  alternates: {
    canonical: "https://fineartfree.com/it",
    languages: buildHomeLanguageAlternates(),
  },
};

export default async function HomePageIt() {
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

  const browseGenres = await getCachedGenresForHomeStrip();

  const genreImages = await Promise.all(
    browseGenres.map(async (genre) => {
      const { data } = await supabase
        .from("artworks")
        .select("image_id, url")
        .eq("genre_title", genre.name)
        .limit(1);
      const row = data?.[0];
      const slug = getGenreSlugForLocale(genre, "it");
      const label = getGenreLabelForLocale(genre, "it");
      return {
        slug,
        label,
        imageUrl: row ? artworkImageUrl({ url: row.url ?? null, image_id: row.image_id }, { quality: 30 }) : null,
      };
    })
  );

  return (
    <div>
      <WebSiteJsonLd />
      <section className="relative w-full bg-[#1a1a1a] py-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-bg-moonrise.svg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          fetchPriority="high"
          decoding="sync"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            {t.heroH1}
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-white">
            {t.heroSubtitle}
          </p>
          <form action="/it/search" method="get" className="mt-14 max-w-3xl md:mt-16">
            <div className="flex items-center border-b border-white">
              <input
                type="text"
                name="q"
                placeholder={t.searchPlaceholder}
                className="w-full bg-transparent py-2 text-[15px] leading-normal text-white placeholder:text-white focus:outline-none"
                aria-label={t.searchPlaceholder}
              />
              <button type="submit" className="px-2 text-3xl text-white hover:text-white" aria-label="Buscar">
                ⌕
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="w-full overflow-x-auto scrollbar-hide bg-[#faf9f7] px-5 py-6">
        <div className="flex gap-3 min-w-max">
          {genreImages.map((genre) => (
            <Link
              key={genre.slug}
              href={`${localePath("it", "genres")}/${genre.slug}`}
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

      <section className="w-full bg-[#faf9f7] py-8">
        <div className="px-5">
          <h2 className="mb-8 text-xl font-semibold text-[#1a1a1a]">{t.browseByArtist}</h2>
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
                    href={`/it/artists/${slugify(artist.name)}`}
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

      <section className="w-full bg-[#faf9f7] py-12">
        <div className="px-5">
          <h2 className="mb-8 text-xl font-semibold text-[#1a1a1a]">{t.freeArtworks}</h2>
          <ArtworkGrid artworks={artworks} basePath="/it" />
          <div className="mt-8">
            <Link
              href="/it/artworks?page=2"
              className="inline-flex items-center rounded-md bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white hover:bg-[#333]"
            >
              Avanti
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
