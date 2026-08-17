import { cache } from "react";

import { fillArtistHubPreviewImages, type ArtistHubListItem } from "@/lib/cached-hub-data";
import { resolveMuseumBySlug } from "@/lib/resolve-museum-by-slug";
import { supabase } from "@/lib/supabase";
import type { Locale } from "@/lib/translations";
import { artworkGridImageUrl, slugify } from "@/lib/utils";
import { localizeRowTitle } from "@/lib/artwork-i18n";
import type { Artwork } from "@/types/artwork";

export type MuseumPageData = {
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  artworkCount: number;
  description: string | null;
  seoDescription: string | null;
};

type MuseumRow = {
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
};

type MuseumTranslationRow = {
  description: string | null;
  seo_description: string | null;
};

type ArtworkRow = {
  id: string;
  title: string;
  slug: string;
  artist_display: string | null;
  image_id: string | null;
  url: string | null;
  museum: string | null;
  style_title: string | null;
  genre_title: string | null;
  score: number | null;
  alt_text: string | null;
  [key: string]: unknown;
};

const ARTWORK_COLUMNS =
  "id, title, title_sp, title_pt, title_fr, title_ger, title_it, title_jp, title_ko, title_ru, title_ch, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text";

async function fetchMuseumRow(slug: string): Promise<MuseumRow | null> {
  const { data, error } = await supabase
    .from("museums")
    .select("slug, name, city, country")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[fetchMuseumRow]", slug, error.message);
    return null;
  }

  return (data as MuseumRow | null) ?? null;
}

async function fetchMuseumTranslation(
  museumSlug: string,
  locale: Locale,
): Promise<MuseumTranslationRow | null> {
  const { data, error } = await supabase
    .from("museum_translations")
    .select("description, seo_description")
    .eq("museum_slug", museumSlug)
    .eq("locale", locale)
    .maybeSingle();

  if (error) {
    console.error("[fetchMuseumTranslation]", museumSlug, locale, error.message);
    return null;
  }

  return (data as MuseumTranslationRow | null) ?? null;
}

async function fetchArtworkCount(museumName: string): Promise<number> {
  const { count, error } = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("museum", museumName);

  if (error) {
    console.error("[fetchArtworkCount]", museumName, error.message);
    return 0;
  }

  return count ?? 0;
}

function pickTranslationText(
  localized: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const primary = localized?.trim();
  if (primary) {
    return primary;
  }

  const secondary = fallback?.trim();
  return secondary || null;
}

async function getMuseumPageDataUncached(slug: string, locale: Locale): Promise<MuseumPageData | null> {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) {
    return null;
  }

  const [museumRow, localizedTranslation, enTranslation] = await Promise.all([
    fetchMuseumRow(trimmedSlug),
    fetchMuseumTranslation(trimmedSlug, locale),
    locale === "en" ? Promise.resolve(null) : fetchMuseumTranslation(trimmedSlug, "en"),
  ]);

  let name = museumRow?.name?.trim() ?? null;
  if (!name) {
    name = await resolveMuseumBySlug(trimmedSlug);
  }

  if (!name) {
    return null;
  }

  const artworkCount = await fetchArtworkCount(name);
  if (!artworkCount) {
    return null;
  }

  return {
    slug: museumRow?.slug ?? trimmedSlug,
    name,
    city: museumRow?.city ?? null,
    country: museumRow?.country ?? null,
    artworkCount,
    description: pickTranslationText(
      localizedTranslation?.description,
      enTranslation?.description,
    ),
    seoDescription: pickTranslationText(
      localizedTranslation?.seo_description,
      enTranslation?.seo_description,
    ),
  };
}

export const getMuseumPageData = cache(getMuseumPageDataUncached);

export type MuseumTopArtist = {
  name: string;
  slug: string;
  count: number;
  imageId: string | null;
  url: string | null;
};

async function enrichTopArtistImages(
  artists: { name: string; slug: string; count: number }[],
): Promise<MuseumTopArtist[]> {
  if (!artists.length) {
    return [];
  }

  const slugs = artists.map((artist) => artist.slug);
  const { data: artistRows } = await supabase.from("artists").select("slug, image_url").in("slug", slugs);

  const imageBySlug = new Map<string, string | null>();
  for (const row of artistRows ?? []) {
    const slug = (row as { slug?: string }).slug?.trim();
    if (slug) {
      imageBySlug.set(slug, (row as { image_url?: string | null }).image_url ?? null);
    }
  }

  const hubItems: ArtistHubListItem[] = artists.map((artist) => ({
    display: artist.name,
    count: artist.count,
    image_id: imageBySlug.get(artist.slug)?.trim() || null,
    url: null,
    slug: artist.slug,
  }));

  const filled = await fillArtistHubPreviewImages(hubItems);

  return artists.map((artist, index) => ({
    name: artist.name,
    slug: artist.slug,
    count: artist.count,
    imageId: filled[index]?.image_id ?? null,
    url: filled[index]?.url ?? null,
  }));
}

export async function fetchMuseumTopArtists(
  museumName: string,
  limit = 8,
): Promise<MuseumTopArtist[]> {
  const { data } = await supabase
    .from("artworks")
    .select("artist_display")
    .eq("museum", museumName)
    .not("artist_display", "is", null)
    .neq("artist_display", "Unknown Artist")
    .neq("artist_display", "Unknown artist");

  if (!data) {
    return [];
  }

  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.artist_display) {
      counts[row.artist_display] = (counts[row.artist_display] || 0) + 1;
    }
  }

  const ranked = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({
      name,
      slug: slugify(name),
      count,
    }));

  return enrichTopArtistImages(ranked);
}

export async function fetchMuseumArtworks(
  museumName: string,
  from: number,
  to: number,
  locale: Locale = "en",
): Promise<{
  artworks: Artwork[];
  totalCount: number;
  error: { message: string } | null;
}> {
  const { data, count, error } = await supabase
    .from("artworks")
    .select(ARTWORK_COLUMNS, { count: "exact" })
    .eq("museum", museumName)
    .order("score", { ascending: false })
    .range(from, to);

  if (error) {
    return { artworks: [], totalCount: 0, error };
  }

  const rows = (data as ArtworkRow[] | null) ?? [];
  const artworks: Artwork[] = rows.map((item) => ({
    id: item.id,
    title: locale === "en" ? item.title : localizeRowTitle(item, locale),
    slug: item.slug,
    artistName: item.artist_display ?? "Unknown artist",
    artistDisplay: item.artist_display ?? undefined,
    imageUrl: artworkGridImageUrl({ url: item.url, image_id: item.image_id }),
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

  return {
    artworks,
    totalCount: count ?? 0,
    error: null,
  };
}
