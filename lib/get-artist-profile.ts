import {
  ARTIST_PROFILE_COLUMNS_ALL,
  artistProfileSelectColumns,
  isNewLocaleSlug,
} from "@/lib/locale-query-columns";
import { supabase } from "@/lib/supabase";
import type { Locale } from "@/lib/translations";

export type ArtistProfileRow = {
  id?: string;
  name: string;
  slug: string;
  image_url: string | null;
  nationality: string | null;
  birth_year: number | null;
  death_year: number | null;
  artwork_count: number | null;
  bio: string | null;
  bio_es: string | null;
  bio_pt: string | null;
  bio_ja: string | null;
  bio_fr: string | null;
  bio_de: string | null;
  bio_it: string | null;
  bio_ko: string | null;
  bio_ru: string | null;
  bio_zh: string | null;
};

export async function getArtistProfileBySlug(
  slug: string,
  locale?: Locale
): Promise<ArtistProfileRow | null> {
  const columns =
    locale && isNewLocaleSlug(locale)
      ? artistProfileSelectColumns(locale)
      : ARTIST_PROFILE_COLUMNS_ALL;

  const { data, error } = await supabase
    .from("artists")
    .select(columns)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[getArtistProfileBySlug]", slug, error.message);
    return null;
  }

  return (data as ArtistProfileRow | null) ?? null;
}

export function getArtistBioForLocale(artist: ArtistProfileRow, locale: Locale): string | null {
  const localized =
    locale === "es"
      ? artist.bio_es
      : locale === "pt"
        ? artist.bio_pt
        : locale === "ja"
          ? artist.bio_ja
          : locale === "fr"
            ? artist.bio_fr
            : locale === "de"
              ? artist.bio_de
              : locale === "it"
                ? artist.bio_it
                : locale === "ko"
                  ? artist.bio_ko
                  : locale === "ru"
                    ? artist.bio_ru
                    : locale === "zh"
                      ? artist.bio_zh
                      : null;

  return localized?.trim() || artist.bio?.trim() || null;
}
