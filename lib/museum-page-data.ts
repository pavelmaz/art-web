import { cache } from "react";

import { resolveMuseumBySlug } from "@/lib/resolve-museum-by-slug";
import { supabase } from "@/lib/supabase";
import type { Locale } from "@/lib/translations";
import { artworkGridImageUrl } from "@/lib/utils";
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
};

const ARTWORK_COLUMNS =
  "id, title, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text";

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

export async function fetchMuseumArtworks(
  museumName: string,
  from: number,
  to: number,
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
    title: item.title,
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
