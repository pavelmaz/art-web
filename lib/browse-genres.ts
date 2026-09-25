import { unstable_cache } from "next/cache";

// Weekly, not daily: the Header renders these on EVERY page, and Next gives a
// page the shortest revalidate of anything it renders, so a one-day cache here
// pinned all 500k artwork pages to one day (found 25 Sep 2026). Genres are a
// fixed taxonomy; only the per-genre counts drift, by at most a week.

import { supabase } from "@/lib/supabase";
import type { BrowseGenreRow } from "@/lib/browse-genres-helpers";

// Re-export the pure helpers so existing server-side importers keep working unchanged.
// Client Components must import these from "@/lib/browse-genres-helpers" directly so
// they don't pull the server-only Supabase client into the browser bundle.
export type { BrowseGenreRow } from "@/lib/browse-genres-helpers";
export { getGenreLabelForLocale, getGenreSlugForLocale } from "@/lib/browse-genres-helpers";

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

export const getCachedGenresForBrowse = unstable_cache(
  async (): Promise<BrowseGenreRow[]> => {
    const { data, error } = await supabase.from("genres").select(GENRE_SELECT);

    if (error) throw error;

    const rows = (data as BrowseGenreRow[]) ?? [];
    const byName = new Map(rows.map((r) => [r.name, r]));

    return BROWSE_GENRE_ORDER.map((n) => byName.get(n)).filter(Boolean) as BrowseGenreRow[];
  },
  ["genres-browse-strip", "v3-locale-genre-translations"],
  { revalidate: 604800 }
);

/** Home horizontal strip: every row in `genres`, ordered by name — URLs and labels come only from Supabase. */
export const getCachedGenresForHomeStrip = unstable_cache(
  async (): Promise<BrowseGenreRow[]> => {
    const { data, error } = await supabase.from("genres").select(GENRE_SELECT).order("name", { ascending: true });

    if (error) throw error;

    return (data as BrowseGenreRow[]) ?? [];
  },
  ["genres-home-strip", "v3-locale-genre-translations"],
  { revalidate: 604800 }
);
