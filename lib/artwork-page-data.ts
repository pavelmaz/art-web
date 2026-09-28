import { cache } from "react";

import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

type HubLocaleKey = "es" | "pt" | "ja" | "fr" | "de" | "it" | "ko" | "ru" | "zh";

/** A `genres` / `styles` row with every locale's name and slug. */
export type HubRow = { name: string; slug: string } & {
  [K in `name_${HubLocaleKey}` | `slug_${HubLocaleKey}`]: string | null;
};

export type ArtworkPageExtras = {
  translation: { alt_text: string | null; seo_description: string | null } | null;
  artistCard: { artworkCount: number; portrait: string | null } | null;
  /** Top 20 of the artist's works by score, same columns the pages used to select. */
  relatedByArtist: Record<string, unknown>[];
  /** 6 highest-scored other works in the genre. */
  relatedByGenre: Record<string, unknown>[];
  genre: HubRow | null;
  style: HubRow | null;
};

const fetchArtworkPageExtras = cache(
  async (
    artworkId: string,
    artist: string | null,
    artistSlug: string | null,
    genre: string | null,
    genreHub: string | null,
    styleHub: string | null,
    locale: string
  ): Promise<ArtworkPageExtras> => {
    const { data, error } = await supabase.rpc("artwork_page_extras", {
      p_artwork_id: artworkId,
      p_artist: artist,
      p_artist_slug: artistSlug,
      p_genre: genre,
      p_genre_hub: genreHub,
      p_style_hub: styleHub,
      p_locale: locale,
    });
    if (error) {
      throw error;
    }
    return data as ArtworkPageExtras;
  }
);

/**
 * Everything an artwork page shows besides the artwork row, in one database
 * round trip (the `artwork_page_extras` function): translation, artist card,
 * works by the artist, works in the genre, genre and style hub rows.
 *
 * Replaces up to 7 separate requests per render (28 Sep 2026, after a scraper
 * surge overloaded the database). Wrapped in React `cache()` so
 * generateMetadata and the page share one call; the arguments are primitives
 * so both callers hit the same cache entry.
 */
export function getArtworkPageExtras(
  artwork: { id: string; artist_display: string | null; genre_title: string | null; style_title: string | null },
  locale: string
): Promise<ArtworkPageExtras> {
  const artist = artwork.artist_display?.trim() ? artwork.artist_display : null;
  const artistSlug = artist ? slugify(artist) || null : null;
  return fetchArtworkPageExtras(
    artwork.id,
    artist,
    artistSlug,
    artwork.genre_title || null,
    artwork.genre_title?.trim() || null,
    artwork.style_title?.trim() || null,
    locale
  );
}
