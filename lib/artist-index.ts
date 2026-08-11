import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

/** A–Z plus an "other" bucket for non-Latin / numeric artist names. */
export const ARTIST_INDEX_LETTERS = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "other",
] as const;

export type ArtistIndexLetter = (typeof ARTIST_INDEX_LETTERS)[number];

export function isArtistIndexLetter(value: string): value is ArtistIndexLetter {
  return (ARTIST_INDEX_LETTERS as readonly string[]).includes(value);
}

/** Display label for a bucket: "A".."Z" or "#" for the catch-all. */
export function artistLetterLabel(letter: ArtistIndexLetter): string {
  return letter === "other" ? "#" : letter.toUpperCase();
}

/** The bucket a display name belongs to: its first a–z letter (accents folded), else "other". */
export function artistLetterBucket(display: string): ArtistIndexLetter {
  const first = slugify(display).charAt(0);
  return first >= "a" && first <= "z" ? (first as ArtistIndexLetter) : "other";
}

export type ArtistIndexEntry = {
  display: string;
  slug: string;
  count: number;
  imageId: string | null;
};

/**
 * Every artist with at least one artwork, fetched in 1000-row batches to bypass
 * PostgREST's default row cap — so the A–Z index covers the full ~11k set
 * (getCachedArtistsHubList is intentionally capped at 1000 for the paginated hub).
 */
export async function getAllArtistsForIndex(): Promise<ArtistIndexEntry[]> {
  const out: ArtistIndexEntry[] = [];
  const BATCH = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("artists")
      .select("name, slug, artwork_count, image_url")
      .gt("artwork_count", 0)
      .not("name", "ilike", "http%") // skip junk records whose "name" is a source URI
      // Placeholder "artists" are not artists; keep them out of the A–Z index too.
      .not("name", "in", '("Unknown Artist","Unidentified artist")')
      .order("name", { ascending: true })
      .range(from, from + BATCH - 1);

    if (error || !data || data.length === 0) {
      break;
    }

    for (const a of data as Array<{
      name: string | null;
      slug: string | null;
      artwork_count: number;
      image_url: string | null;
    }>) {
      if (a.name?.trim() && a.slug?.trim()) {
        out.push({ display: a.name, slug: a.slug, count: a.artwork_count, imageId: a.image_url });
      }
    }

    if (data.length < BATCH) {
      break;
    }
    from += BATCH;
  }
  return out;
}
