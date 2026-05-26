import { unstable_cache } from "next/cache";

import { supabase } from "@/lib/supabase";

/** Columns from `genres` — single source of truth for URLs and labels. */
export type BrowseGenreRow = {
  name: string;
  name_es: string | null;
  name_pt: string | null;
  name_ja: string | null;
  slug: string;
  slug_es: string | null;
  slug_pt: string | null;
  slug_ja: string | null;
};

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
    const { data, error } = await supabase
      .from("genres")
      .select("name, name_es, name_pt, name_ja, slug, slug_es, slug_pt, slug_ja");

    if (error) throw error;

    const rows = (data as BrowseGenreRow[]) ?? [];
    const byName = new Map(rows.map((r) => [r.name, r]));

    return BROWSE_GENRE_ORDER.map((n) => byName.get(n)).filter(Boolean) as BrowseGenreRow[];
  },
  ["genres-browse-strip", "v2-name-ja"],
  { revalidate: 86400 }
);

/** Home horizontal strip: every row in `genres`, ordered by name — URLs and labels come only from Supabase. */
export const getCachedGenresForHomeStrip = unstable_cache(
  async (): Promise<BrowseGenreRow[]> => {
    const { data, error } = await supabase
      .from("genres")
      .select("name, name_es, name_pt, name_ja, slug, slug_es, slug_pt, slug_ja")
      .order("name", { ascending: true });

    if (error) throw error;

    return (data as BrowseGenreRow[]) ?? [];
  },
  ["genres-home-strip", "v2-name-ja"],
  { revalidate: 86400 }
);
