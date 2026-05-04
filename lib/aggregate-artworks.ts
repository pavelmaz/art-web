import { supabase } from "@/lib/supabase";

const BATCH = 1000;

export type AggregatedHubEntry = {
  display: string;
  count: number;
  image_id: string | null;
  url: string | null;
};

/** Full table scan in batches — distinct values with counts and a representative image (first row per key). */
export async function aggregateArtworksByField(
  field: "museum" | "genre_title" | "style_title",
  options: { excludeValue?: (display: string) => boolean } = {}
): Promise<AggregatedHubEntry[]> {
  const map = new Map<
    string,
    { display: string; count: number; image_id: string | null; url: string | null }
  >();

  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("artworks")
      .select(`${field}, image_id, url`)
      .not(field, "is", null)
      .neq(field, "")
      .order("id", { ascending: true })
      .range(offset, offset + BATCH - 1);

    if (error) {
      console.error("[aggregateArtworksByField]", field, offset, error);
      throw error;
    }

    const rows =
      (data as Array<Record<string, string | null>> | null) ?? [];

    if (!rows.length) {
      break;
    }

    for (const row of rows) {
      const raw = row[field] as string | null | undefined;
      const display = raw?.trim();
      if (!display) continue;
      if (options.excludeValue?.(display)) continue;

      const key = display.toLowerCase();
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          display,
          count: 1,
          image_id: row.image_id ?? null,
          url: row.url ?? null,
        });
      } else {
        cur.count += 1;
      }
    }

    offset += BATCH;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.display.localeCompare(b.display);
  });
}
