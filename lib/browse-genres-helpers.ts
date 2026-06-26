import type { Locale } from "@/lib/translations";

/**
 * Pure, dependency-free genre helpers shared between server data code and Client
 * Components (e.g. the header nav). Keeping these out of `browse-genres.ts` means a
 * Client Component can use them without pulling the (server-only) Supabase client into
 * the browser bundle.
 */

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
