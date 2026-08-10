import { supabase } from "@/lib/supabase";

export type PrintCollection = {
  name: string;
  count: number;
  /** Dominant artist for real published sets; null for the catch-all bucket,
   *  where naming the most frequent hand would be a lie. */
  artist: string | null;
  cover: { image_id: string | null; url: string | null };
};

export const INDIVIDUAL_PRINTS = "Individual prints";

/**
 * All print/wall-chart collections, grouped in memory from one query — shared by
 * the /prints hub and the homepage strip so the two can never disagree. Rows
 * arrive score-desc, so the first row seen per collection is its best cover.
 */
export async function getPrintCollections(): Promise<PrintCollection[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select("collection, image_id, url, artist_display")
    .eq("object_type", "print")
    .order("score", { ascending: false });

  if (error) {
    console.error("[getPrintCollections]", error);
    return [];
  }

  type Row = { collection: string | null; image_id: string | null; url: string | null; artist_display: string | null };
  const groups = new Map<string, { count: number; cover: Row; artists: Map<string, number> }>();
  for (const row of (data as Row[] | null) ?? []) {
    const key = row.collection?.trim() || INDIVIDUAL_PRINTS;
    let g = groups.get(key);
    if (!g) {
      g = { count: 0, cover: row, artists: new Map() };
      groups.set(key, g);
    }
    g.count += 1;
    const a = row.artist_display?.trim();
    if (a) g.artists.set(a, (g.artists.get(a) ?? 0) + 1);
  }

  return [...groups.entries()]
    .map(([name, g]) => ({
      name,
      count: g.count,
      cover: { image_id: g.cover.image_id, url: g.cover.url },
      artist:
        name === INDIVIDUAL_PRINTS
          ? null
          : [...g.artists.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }))
    // Real sets first, biggest first; the catch-all bucket always last.
    .sort((a, b) =>
      a.name === INDIVIDUAL_PRINTS ? 1 : b.name === INDIVIDUAL_PRINTS ? -1 : b.count - a.count
    );
}
