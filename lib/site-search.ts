import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

export type SiteSearchArtworkRow = {
  id: string;
  title: string;
  slug: string | null;
  artist_display: string | null;
  image_id: string | null;
  museum: string | null;
  alt_text?: string | null;
  score?: number | null;
};

export type SiteSearchArtist = {
  name: string;
  slug: string;
  count: number;
};

const ARTWORK_SELECT =
  "id, title, slug, artist_display, image_id, museum, alt_text, score";

export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[%_]/g, "").trim();
}

/** Escape characters that break PostgREST `.or()` filter lists. */
export function escapeOrFilterValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\./g, "\\.");
}

async function fetchArtworksByRpc(term: string) {
  return supabase.rpc("search_artworks", { search_term: term });
}

async function fetchArtworksByFilter(term: string) {
  const safe = escapeOrFilterValue(term);
  return supabase
    .from("artworks")
    .select(ARTWORK_SELECT)
    .or(`title.ilike.%${safe}%,artist_display.ilike.%${safe}%`)
    .order("score", { ascending: false })
    .limit(50);
}

async function fetchArtistsByName(term: string) {
  return supabase.from("artists").select("name, slug").ilike("name", `%${term}%`).limit(20);
}

export async function runSiteSearch(rawQuery: string): Promise<{
  artworks: SiteSearchArtworkRow[];
  artists: SiteSearchArtist[];
  error: string | null;
}> {
  const term = sanitizeSearchTerm(rawQuery);
  if (!term) {
    return { artworks: [], artists: [], error: null };
  }

  let artworks: SiteSearchArtworkRow[] = [];
  let error: string | null = null;

  const rpc = await fetchArtworksByRpc(term);
  if (rpc.error) {
    const fallback = await fetchArtworksByFilter(term);
    if (fallback.error) {
      return { artworks: [], artists: [], error: fallback.error.message };
    }
    artworks = (fallback.data as SiteSearchArtworkRow[] | null) ?? [];
    error = rpc.error.message;
  } else {
    artworks = (rpc.data as SiteSearchArtworkRow[] | null) ?? [];
    // RPC can succeed but return no rows (e.g. FTS vs ilike mismatch). Fall back so search stays reliable.
    if (artworks.length === 0) {
      const fallback = await fetchArtworksByFilter(term);
      if (!fallback.error) {
        artworks = (fallback.data as SiteSearchArtworkRow[] | null) ?? [];
      }
    }
  }

  const countFromArtworks = new Map<string, { name: string; count: number }>();
  for (const row of artworks) {
    const name = row.artist_display?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = countFromArtworks.get(key);
    if (!existing) {
      countFromArtworks.set(key, { name, count: 1 });
    } else {
      existing.count += 1;
    }
  }

  const artists: SiteSearchArtist[] = [];
  const seen = new Set<string>();

  const { data: artistRows } = await fetchArtistsByName(term);
  for (const row of artistRows ?? []) {
    const name = row.name?.trim();
    const slug = row.slug?.trim();
    if (!name || !slug) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    artists.push({
      name,
      slug,
      count: countFromArtworks.get(key)?.count ?? 0,
    });
  }

  for (const { name, count } of countFromArtworks.values()) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    artists.push({ name, slug: slugify(name), count });
  }

  artists.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { artworks, artists, error };
}
