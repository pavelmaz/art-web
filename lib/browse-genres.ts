import { unstable_cache } from "next/cache";

import { supabase } from "@/lib/supabase";
import type { Locale } from "@/lib/translations";

/** Columns from `genres` — single source of truth for URLs and labels. */
export type BrowseGenreRow = {
  name: string;
  name_es: string | null;
  name_pt: string | null;
  name_ja: string | null;
  name_fr: string | null;
  name_de: string | null;
  name_it: string | null;
  name_ko: string | null;
  name_ru: string | null;
  name_zh: string | null;
  slug: string;
  slug_es: string | null;
  slug_pt: string | null;
  slug_ja: string | null;
  slug_fr: string | null;
  slug_de: string | null;
  slug_it: string | null;
  slug_ko: string | null;
  slug_ru: string | null;
  slug_zh: string | null;
};

const GENRE_SELECT =
  "name, name_es, name_pt, name_ja, name_fr, name_de, name_it, name_ko, name_ru, name_zh, slug, slug_es, slug_pt, slug_ja, slug_fr, slug_de, slug_it, slug_ko, slug_ru, slug_zh";

/**
 * Same display order as the header browse menu (matches English `genres.name` values).
 * Rows missing from the DB are omitted — nothing is invented client-side.
 */
const BROWSE_GENRE_ORDER = [
  "Landscape",
  "Abstract",
  "Portrait",
  "Architecture",
  "Religious",
  "Animal",
  "Historical",
  "Mythology",
  "Still Life",
  "Figurative",
  "Marine",
  "Illustration",
] as const;

export function getGenreLabelForLocale(g: BrowseGenreRow, locale: Locale): string {
  switch (locale) {
    case "es":
      return g.name_es?.trim() || g.name;
    case "pt":
      return g.name_pt?.trim() || g.name;
    case "ja":
      return g.name_ja?.trim() || g.name;
    case "fr":
      return g.name_fr?.trim() || g.name;
    case "de":
      return g.name_de?.trim() || g.name;
    case "it":
      return g.name_it?.trim() || g.name;
    case "ko":
      return g.name_ko?.trim() || g.name;
    case "ru":
      return g.name_ru?.trim() || g.name;
    case "zh":
      return g.name_zh?.trim() || g.name;
    default:
      return g.name;
  }
}

export function getGenreSlugForLocale(g: BrowseGenreRow, locale: Locale): string {
  switch (locale) {
    case "es":
      return g.slug_es?.trim() || g.slug;
    case "pt":
      return g.slug_pt?.trim() || g.slug;
    case "ja":
      return g.slug_ja?.trim() || g.slug;
    case "fr":
      return g.slug_fr?.trim() || g.slug;
    case "de":
      return g.slug_de?.trim() || g.slug;
    case "it":
      return g.slug_it?.trim() || g.slug;
    case "ko":
      return g.slug_ko?.trim() || g.slug;
    case "ru":
      return g.slug_ru?.trim() || g.slug;
    case "zh":
      return g.slug_zh?.trim() || g.slug;
    default:
      return g.slug;
  }
}

export const getCachedGenresForBrowse = unstable_cache(
  async (): Promise<BrowseGenreRow[]> => {
    const { data, error } = await supabase.from("genres").select(GENRE_SELECT);

    if (error) throw error;

    const rows = (data as BrowseGenreRow[]) ?? [];
    const byName = new Map(rows.map((r) => [r.name, r]));

    return BROWSE_GENRE_ORDER.map((n) => byName.get(n)).filter(Boolean) as BrowseGenreRow[];
  },
  ["genres-browse-strip", "v3-locale-genre-translations"],
  { revalidate: 86400 }
);

/** Home horizontal strip: every row in `genres`, ordered by name — URLs and labels come only from Supabase. */
export const getCachedGenresForHomeStrip = unstable_cache(
  async (): Promise<BrowseGenreRow[]> => {
    const { data, error } = await supabase.from("genres").select(GENRE_SELECT).order("name", { ascending: true });

    if (error) throw error;

    return (data as BrowseGenreRow[]) ?? [];
  },
  ["genres-home-strip", "v3-locale-genre-translations"],
  { revalidate: 86400 }
);
