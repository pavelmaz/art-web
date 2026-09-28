import { supabase } from "@/lib/supabase";

export type ArtistCard = {
  artworkCount: number;
  portrait: string | null;
};

/**
 * Portrait + work count for the artist card on artwork pages.
 *
 * The count comes from `artists.artwork_count` (kept exact by the nightly
 * `recount-artist-artworks` cron) instead of counting artworks on every render:
 * that per-page count was ~37% of the database's disk reads during the
 * 28 Sep 2026 scraper surge. A live count is still used when the artist row is
 * missing or stored under a different spelling than `artist_display`.
 */
export async function getArtistCard(artistDisplay: string, artistSlug: string): Promise<ArtistCard> {
  const { data } = await supabase
    .from("artists")
    .select("name, image_url, artwork_count")
    .eq("slug", artistSlug)
    .maybeSingle();
  const row = data as { name: string | null; image_url: string | null; artwork_count: number | null } | null;

  let artworkCount = row?.name === artistDisplay ? (row.artwork_count ?? 0) : 0;
  if (artworkCount <= 0) {
    const { count } = await supabase
      .from("artworks")
      .select("id", { count: "exact", head: true })
      .eq("artist_display", artistDisplay);
    artworkCount = count ?? 0;
  }

  return { artworkCount, portrait: row?.image_url ?? null };
}
