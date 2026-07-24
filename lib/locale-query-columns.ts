import type { SiteLocale } from "@/lib/locale-routes";

/** Locales that use narrow Supabase selects (not EN/ES/PT/JA). */
export const NEW_LOCALE_SLUGS = ["fr", "de", "it", "ko", "ru", "zh"] as const;
export type NewLocaleSlug = (typeof NEW_LOCALE_SLUGS)[number];

export function isNewLocaleSlug(locale: SiteLocale): locale is NewLocaleSlug {
  return (NEW_LOCALE_SLUGS as readonly string[]).includes(locale);
}

const ARTIST_BASE_COLUMNS =
  "id, name, slug, nationality, birth_year, death_year, artwork_count, image_url, bio" as const;

export const ARTIST_PROFILE_SELECT = {
  fr: `${ARTIST_BASE_COLUMNS}, bio_fr`,
  de: `${ARTIST_BASE_COLUMNS}, bio_de`,
  it: `${ARTIST_BASE_COLUMNS}, bio_it`,
  ko: `${ARTIST_BASE_COLUMNS}, bio_ko`,
  ru: `${ARTIST_BASE_COLUMNS}, bio_ru`,
  zh: `${ARTIST_BASE_COLUMNS}, bio_zh`,
} as const;

/** Full artist profile select (ES/PT/JA/EN and legacy callers). */
export const ARTIST_PROFILE_COLUMNS_ALL =
  `${ARTIST_BASE_COLUMNS}, bio_es, bio_pt, bio_ja, bio_fr, bio_de, bio_it, bio_ko, bio_ru, bio_zh` as const;

export function artistProfileSelectColumns<L extends NewLocaleSlug>(
  locale: L
): (typeof ARTIST_PROFILE_SELECT)[L] {
  return ARTIST_PROFILE_SELECT[locale];
}

const ARTWORK_DETAIL_BASE =
  "id, slug, title, artist_display, url, image_id, museum, genre_title, style_title, score, medium_display, date_display, dimensions, alt_text, description, death_year, img_width, img_height, orig_bytes, std_bytes" as const;

export const ARTWORK_DETAIL_SELECT = {
  fr: `${ARTWORK_DETAIL_BASE}, description_fr`,
  de: `${ARTWORK_DETAIL_BASE}, description_ger`,
  it: `${ARTWORK_DETAIL_BASE}, description_it`,
  ko: `${ARTWORK_DETAIL_BASE}, description_ko`,
  ru: `${ARTWORK_DETAIL_BASE}, description_ru`,
  zh: `${ARTWORK_DETAIL_BASE}, description_ch`,
} as const;

export function artworkDetailSelectColumns<L extends NewLocaleSlug>(
  locale: L
): (typeof ARTWORK_DETAIL_SELECT)[L] {
  return ARTWORK_DETAIL_SELECT[locale];
}
