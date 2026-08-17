import { unstable_cache } from "next/cache";

import { supabase } from "@/lib/supabase";
import { escapeOrFilterValue, sanitizeSearchTerm } from "@/lib/site-search";

const REVALIDATE_SECONDS = 21600;

/** Raw row shape used by the artworks listing page mapping (select * or fallback select). */
export type ArtworksBrowseRow = {
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
  [key: string]: unknown;
};

export type ArtworksSearchRow = {
  id: string;
  title: string;
  slug: string;
  artist_display: string | null;
  image_id: string | null;
  museum: string | null;
  alt_text: string | null;
  [key: string]: unknown;
};

/**
 * Paginated /artworks browse (no `q`). Cache is per (from, to) range — matches one page window.
 */
export const getCachedArtworksBrowseSlice = unstable_cache(
  async (from: number, to: number): Promise<{ rows: ArtworksBrowseRow[]; totalCount: number }> => {
    const orderedQuery = await supabase
      .from("artworks")
      .select("*", { count: "exact" })
      .order("score", { ascending: false })
      .range(from, to);

    let rows = (orderedQuery.data as ArtworksBrowseRow[] | null) ?? [];
    let totalCount = orderedQuery.count ?? 0;

    if (orderedQuery.error?.code === "57014") {
      const fallbackQuery = await supabase
        .from("artworks")
        .select("id, title, title_sp, title_pt, title_fr, title_ger, title_it, title_jp, title_ko, title_ru, title_ch, slug, artist_display, image_id, url, museum, style_title, genre_title, score, alt_text")
        .order("score", { ascending: false })
        .limit(300);

      if (fallbackQuery.error) {
        throw fallbackQuery.error;
      }

      rows = ((fallbackQuery.data as ArtworksBrowseRow[] | null) ?? [])
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(from, to + 1);
      totalCount = fallbackQuery.data?.length ?? totalCount;
    } else if (orderedQuery.error) {
      throw orderedQuery.error;
    }

    return { rows, totalCount };
  },
  ["artworks-browse-v2"],
  { revalidate: REVALIDATE_SECONDS, tags: ["artworks-browse", "artworks-browse-v2"] }
);

/**
 * /artworks?q=… inline search (limit 48).
 * Not wrapped in unstable_cache: search must vary by `q`; a single static cache key would return wrong results.
 */
export async function getCachedArtworksSearchResults(q: string): Promise<ArtworksSearchRow[]> {
  const term = sanitizeSearchTerm(q);
  if (!term) {
    return [];
  }
  const safe = escapeOrFilterValue(term);
  const { data, error } = await supabase
    .from("artworks")
    .select("id, title, title_sp, title_pt, title_fr, title_ger, title_it, title_jp, title_ko, title_ru, title_ch, slug, artist_display, image_id, museum, alt_text")
    .or(`title.ilike.%${safe}%,artist_display.ilike.%${safe}%`)
    .order("score", { ascending: false })
    .limit(48);

  if (error) {
    throw error;
  }

  return (data as ArtworksSearchRow[] | null) ?? [];
}
