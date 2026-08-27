import { fillArtistHubPreviewImages } from "@/lib/cached-hub-data";
import { expandSearchTerm } from "@/lib/search-expansions";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

export type SiteSearchArtworkRow = {
  id: string;
  title: string;
  slug: string | null;
  artist_display: string | null;
  image_id: string | null;
  url: string | null;
  museum: string | null;
  alt_text?: string | null;
  score?: number | null;
  tags?: string[] | null;
};

export type SiteSearchArtist = {
  name: string;
  slug: string;
  count: number;
  image_id: string | null;
  url: string | null;
};

const ARTWORK_SELECT =
  "id, title, slug, artist_display, image_id, url, museum, alt_text, score, tags";

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
    .or(`title.ilike.%${safe}%,artist_display.ilike.%${safe}%,museum.ilike.%${safe}%,genre_title.ilike.%${safe}%,style_title.ilike.%${safe}%,medium_display.ilike.%${safe}%,tags.cs.{${safe}}`)
    .order("score", { ascending: false })
    .limit(50);
}

/** Broaden a search across correlated concept terms — title text OR the tags array. */
async function fetchArtworksByExpansions(terms: string[], limit: number) {
  const clauses = terms.flatMap((t) => {
    const safe = escapeOrFilterValue(t);
    return [`title.ilike.%${safe}%`, `tags.cs.{${safe}}`];
  });
  return supabase
    .from("artworks")
    .select(ARTWORK_SELECT)
    .or(clauses.join(","))
    .order("score", { ascending: false })
    .limit(limit);
}

async function fetchArtistsByName(term: string) {
  return supabase
    .from("artists")
    .select("name, slug, image_url, artwork_count")
    .ilike("name", `%${term}%`)
    .limit(20);
}

/** Match artists hub: use `artists.image_url` first, artwork preview only as fallback. */
async function enrichSearchArtists(
  artists: Omit<SiteSearchArtist, "image_id" | "url">[],
): Promise<SiteSearchArtist[]> {
  const slugs = artists.map((artist) => artist.slug).filter(Boolean);
  const dbBySlug = new Map<string, { image_url: string | null; artwork_count: number | null }>();

  if (slugs.length) {
    const { data, error } = await supabase
      .from("artists")
      .select("slug, image_url, artwork_count")
      .in("slug", slugs);

    if (error) {
      console.error("enrichSearchArtists: failed to load artist images", error.message);
    }

    for (const row of data ?? []) {
      const slug = row.slug?.trim();
      if (!slug) continue;
      dbBySlug.set(slug, {
        image_url: row.image_url ?? null,
        artwork_count: row.artwork_count ?? null,
      });
    }
  }

  const withDbImage = artists.map((artist) => {
    const db = dbBySlug.get(artist.slug);
    return {
      ...artist,
      count: db?.artwork_count ?? artist.count,
      image_id: db?.image_url?.trim() || null,
      url: null as string | null,
    };
  });

  const filled = await fillArtistHubPreviewImages(
    withDbImage.map((artist) => ({
      display: artist.name,
      count: artist.count,
      image_id: artist.image_id,
      url: artist.url,
      slug: artist.slug,
    })),
  );

  return withDbImage.map((artist, index) => ({
    ...artist,
    image_id: filled[index]?.image_id ?? artist.image_id,
    url: filled[index]?.url ?? artist.url,
  }));
}

export function getMatchingTagsFromArtworks(
  rows: SiteSearchArtworkRow[],
  rawQuery: string,
  limit = 10,
): string[] {
  const needle = rawQuery.trim().toLowerCase();
  if (!needle) {
    return [];
  }

  const seen = new Set<string>();
  const matches: string[] = [];

  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      const trimmed = tag?.trim();
      if (!trimmed || !trimmed.toLowerCase().includes(needle)) {
        continue;
      }
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      matches.push(trimmed);
    }
  }

  return matches.sort((a, b) => a.localeCompare(b)).slice(0, limit);
}

/** "still life" -> "Still Life" so we can hit the genre_title btree with `.eq`. */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Search within one object_type bucket. `objectType: null` = paintings.
 *
 * IMPORTANT: only `title`, `artist_display` (trigram GIN) and `tags` (GIN) are
 * indexed for substring/array matching — `genre_title`/`style_title`/`museum`
 * are NOT, so OR-ing an ilike on them forces a full seq-scan of 110k paintings
 * (times out on prod). So for paintings we split into index-backed queries run
 * in parallel: title/artist trigram, genre exact-match btree, tags overlap.
 * Prints/books first filter object_type (a tiny set), so a plain OR is cheap.
 */
async function fetchTypedArtworks(
  rawQuery: string,
  objectType: "print" | "book-illustration" | null,
  limit = 60,
): Promise<SiteSearchArtworkRow[]> {
  const term = sanitizeSearchTerm(rawQuery);
  if (!term) return [];
  const primary = escapeOrFilterValue(term);
  const expanded = expandSearchTerm(term);

  if (objectType !== null) {
    const clauses = [`title.ilike.%${primary}%`, `artist_display.ilike.%${primary}%`, `medium_display.ilike.%${primary}%`];
    for (const t of expanded) {
      const safe = escapeOrFilterValue(t);
      clauses.push(`title.ilike.%${safe}%`, `tags.cs.{${safe}}`);
    }
    const { data } = await supabase
      .from("artworks")
      .select(ARTWORK_SELECT)
      .eq("object_type", objectType)
      .or(clauses.join(","))
      .order("score", { ascending: false })
      .limit(limit);
    return (data as SiteSearchArtworkRow[] | null) ?? [];
  }

  const [byText, byGenre, byTags] = await Promise.all([
    supabase
      .from("artworks")
      .select(ARTWORK_SELECT)
      .is("object_type", null)
      .or(`title.ilike.%${primary}%,artist_display.ilike.%${primary}%,medium_display.ilike.%${primary}%`)
      .order("score", { ascending: false })
      .limit(limit),
    supabase
      .from("artworks")
      .select(ARTWORK_SELECT)
      .is("object_type", null)
      .eq("genre_title", titleCase(term))
      .order("score", { ascending: false })
      .limit(limit),
    supabase
      .from("artworks")
      .select(ARTWORK_SELECT)
      .is("object_type", null)
      .overlaps("tags", expanded)
      .order("score", { ascending: false })
      .limit(limit),
  ]);
  return mergeUniqueArtworks(
    [
      (byText.data as SiteSearchArtworkRow[] | null) ?? [],
      (byGenre.data as SiteSearchArtworkRow[] | null) ?? [],
      (byTags.data as SiteSearchArtworkRow[] | null) ?? [],
    ],
    limit,
  );
}

/** Merge result lists, preserving order and dropping duplicate ids, up to `limit`. */
function mergeUniqueArtworks(lists: SiteSearchArtworkRow[][], limit: number): SiteSearchArtworkRow[] {
  const seen = new Set<string>();
  const out: SiteSearchArtworkRow[] = [];
  for (const list of lists) {
    for (const row of list) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export type SegmentedSearch = {
  paintings: SiteSearchArtworkRow[];
  prints: SiteSearchArtworkRow[];
  books: SiteSearchArtworkRow[];
  artists: SiteSearchArtist[];
  error: string | null;
};

/**
 * Search split into the tabs the results page renders: Artworks (paintings),
 * Prints, Books, Artists. Paintings reuse runSiteSearch (FTS + typo tolerance)
 * then are enriched with object_type to drop any print/book that snuck in;
 * Prints and Books get their own typed queries so those tabs are never starved.
 */
export async function runSegmentedSearch(rawQuery: string): Promise<SegmentedSearch> {
  const base = await runSiteSearch(rawQuery);

  const ids = base.artworks.map((a) => a.id);
  const typeById = new Map<string, string | null>();
  if (ids.length) {
    const { data } = await supabase.from("artworks").select("id, object_type").in("id", ids);
    for (const r of data ?? []) typeById.set(r.id as string, (r.object_type as string | null) ?? null);
  }
  const basePaintings = base.artworks.filter((a) => (typeById.get(a.id) ?? null) === null);

  // Base = RPC (FTS + typo tolerance) ranked first; typed = genre/tag/correlated
  // matches that the FTS vector misses (e.g. the Botanical genre for "botanical").
  const [typedPaintings, prints, books] = await Promise.all([
    fetchTypedArtworks(rawQuery, null, 100),
    fetchTypedArtworks(rawQuery, "print"),
    fetchTypedArtworks(rawQuery, "book-illustration"),
  ]);
  const paintings = mergeUniqueArtworks([basePaintings, typedPaintings], 100);

  return { paintings, prints, books, artists: base.artists, error: base.error };
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

  // Smart correlation: if the query maps to related concepts (e.g. botanical →
  // trees, mushrooms, ferns), append those matches after the exact ones so the
  // search never dead-ends and surfaces the semantic neighbourhood.
  const expanded = expandSearchTerm(term);
  if (expanded.length > 1 && artworks.length < 50) {
    const seenIds = new Set(artworks.map((a) => a.id));
    const exp = await fetchArtworksByExpansions(expanded, 80);
    if (!exp.error) {
      for (const row of (exp.data as SiteSearchArtworkRow[] | null) ?? []) {
        if (seenIds.has(row.id)) continue;
        seenIds.add(row.id);
        artworks.push(row);
        if (artworks.length >= 50) break;
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

  const artists: Omit<SiteSearchArtist, "image_id" | "url">[] = [];
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
      count: row.artwork_count ?? countFromArtworks.get(key)?.count ?? 0,
    });
  }

  for (const { name, count } of countFromArtworks.values()) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    artists.push({ name, slug: slugify(name), count });
  }

  artists.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const enrichedArtists = await enrichSearchArtists(artists);

  return { artworks, artists: enrichedArtists, error };
}
