import { unstable_cache } from "next/cache";

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
  /** null = painting; "print" / "book-illustration" otherwise. */
  object_type?: string | null;
  /** Title in the visitor's language (localized search pages only). */
  title_local?: string | null;
};

export type SiteSearchArtist = {
  name: string;
  slug: string;
  count: number;
  image_id: string | null;
  url: string | null;
};

// Same shape the search_artworks RPC returns, so every result row carries
// object_type and the page never needs a second lookup to sort out prints/books.
const ARTWORK_SELECT =
  "id, title, slug, artist_display, image_id, url, museum, alt_text, score, tags, object_type";

/** Artists tab cap (SearchResults TAB_CAPS.artists) — enrichment costs a query per artist. */
const MAX_ARTISTS = 20;

/** Site locale → artworks column holding the title in that language. English has no entry. */
export const LOCALE_TITLE_COLUMN: Record<string, string> = {
  es: "title_sp", pt: "title_pt", fr: "title_fr", de: "title_ger", it: "title_it",
  ja: "title_jp", ko: "title_ko", ru: "title_ru", zh: "title_ch",
};

/** Same columns, plus the localized title (aliased as title_local) on localized pages. */
function localizedSelect(locale: string): string {
  const col = LOCALE_TITLE_COLUMN[locale];
  return col ? `${ARTWORK_SELECT}, title_local:${col}` : ARTWORK_SELECT;
}

/** Extra `.or()` branch matching the localized title. Every title_* column has a trigram index. */
function localizedTitleClause(locale: string, safeTerm: string): string {
  const col = LOCALE_TITLE_COLUMN[locale];
  return col ? `,${col}.ilike.%${safeTerm}%` : "";
}

type ArtistRow = {
  name: string | null;
  slug: string | null;
  image_url?: string | null;
  artwork_count: number | null;
  /** Name in the visitor's language (localized search only). */
  name_local?: string | null;
};

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

/** English keeps the original function. Other languages also search the
 *  multilingual index (translated titles, artist/museum/genre/style names) and
 *  get titles back in their own language. */
async function fetchArtworksByRpc(term: string, locale: string) {
  return LOCALE_TITLE_COLUMN[locale]
    ? supabase.rpc("search_artworks_i18n", { search_term: term, locale })
    : supabase.rpc("search_artworks", { search_term: term });
}

async function fetchArtworksByFilter(term: string, locale: string) {
  const safe = escapeOrFilterValue(term);
  return supabase
    .from("artworks")
    .select(localizedSelect(locale))
    .or(`title.ilike.%${safe}%,artist_display.ilike.%${safe}%,museum.ilike.%${safe}%,genre_title.ilike.%${safe}%,style_title.ilike.%${safe}%,medium_display.ilike.%${safe}%,tags.cs.{${safe}}${localizedTitleClause(locale, safe)}`)
    .order("score", { ascending: false })
    .limit(50);
}

/** Broaden a search across correlated concept terms — title text OR the tags array. */
async function fetchArtworksByExpansions(terms: string[], limit: number, locale: string) {
  const clauses = terms.flatMap((t) => {
    const safe = escapeOrFilterValue(t);
    return [`title.ilike.%${safe}%`, `tags.cs.{${safe}}`];
  });
  return supabase
    .from("artworks")
    .select(localizedSelect(locale))
    .or(clauses.join(","))
    .order("score", { ascending: false })
    .limit(limit);
}

async function fetchArtistsByName(term: string, locale: string): Promise<{ data: ArtistRow[] | null; error: { message: string } | null }> {
  if (LOCALE_TITLE_COLUMN[locale]) {
    // Names and aliases in every language (Wikidata) — ゴッホ, 고흐, Ван Гог all find Van Gogh.
    const { data, error } = await supabase.rpc("search_artists_i18n", { search_term: term, locale });
    return { data: (data as ArtistRow[] | null) ?? null, error };
  }
  const { data, error } = await supabase
    .from("artists")
    .select("name, slug, image_url, artwork_count")
    .ilike("name", `%${term}%`)
    .limit(20);
  return { data: (data as ArtistRow[] | null) ?? null, error };
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
 * IMPORTANT: an `.or()` of ilike filters only uses indexes when EVERY branch
 * is indexed — one un-indexed column turns the whole thing into a full scan of
 * ~118k rows (11 s for "water lilies" on 26 Sep 2026, when `medium_display`
 * had no index). `title`, `artist_display`, `medium_display`, `museum`,
 * `genre_title` and `style_title` all have trigram GIN indexes now, and `tags`
 * a GIN index; before OR-ing any other column, index it first.
 */
async function fetchTypedArtworks(
  rawQuery: string,
  objectType: "print" | "book-illustration" | null,
  limit = 60,
  locale = "en",
): Promise<SiteSearchArtworkRow[]> {
  const term = sanitizeSearchTerm(rawQuery);
  if (!term) return [];
  const primary = escapeOrFilterValue(term);
  const expanded = expandSearchTerm(term);
  const localCol = LOCALE_TITLE_COLUMN[locale];

  if (objectType !== null) {
    const clauses = [`title.ilike.%${primary}%`, `artist_display.ilike.%${primary}%`, `medium_display.ilike.%${primary}%`];
    if (localCol) clauses.push(`${localCol}.ilike.%${primary}%`);
    for (const t of expanded) {
      const safe = escapeOrFilterValue(t);
      clauses.push(`title.ilike.%${safe}%`, `tags.cs.{${safe}}`);
    }
    const { data } = await supabase
      .from("artworks")
      .select(localizedSelect(locale))
      .eq("object_type", objectType)
      .or(clauses.join(","))
      .order("score", { ascending: false })
      .limit(limit);
    return (data as unknown as SiteSearchArtworkRow[] | null) ?? [];
  }

  const [byText, byGenre, byTags] = await Promise.all([
    supabase
      .from("artworks")
      .select(localizedSelect(locale))
      .is("object_type", null)
      .or(`title.ilike.%${primary}%,artist_display.ilike.%${primary}%,medium_display.ilike.%${primary}%${localizedTitleClause(locale, primary)}`)
      .order("score", { ascending: false })
      .limit(limit),
    supabase
      .from("artworks")
      .select(localizedSelect(locale))
      .is("object_type", null)
      .eq("genre_title", titleCase(term))
      .order("score", { ascending: false })
      .limit(limit),
    supabase
      .from("artworks")
      .select(localizedSelect(locale))
      .is("object_type", null)
      .overlaps("tags", expanded)
      .order("score", { ascending: false })
      .limit(limit),
  ]);
  return mergeUniqueArtworks(
    [
      (byText.data as unknown as SiteSearchArtworkRow[] | null) ?? [],
      (byGenre.data as unknown as SiteSearchArtworkRow[] | null) ?? [],
      (byTags.data as unknown as SiteSearchArtworkRow[] | null) ?? [],
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
 * minus any print/book that snuck in (every row carries object_type);
 * Prints and Books get their own typed queries so those tabs are never starved.
 */
async function segmentedSearchUncached(query: string, locale: string): Promise<SegmentedSearch> {
  // All four are independent — run them together. (26 Sep 2026: this used to
  // be a chain of ~8 dependent round trips and results took 5–8 s.)
  // Base = RPC (FTS + typo tolerance) ranked first; typed = genre/tag/correlated
  // matches that the FTS vector misses (e.g. the Botanical genre for "botanical").
  const [base, typedPaintings, prints, books] = await Promise.all([
    runSiteSearch(query, locale),
    fetchTypedArtworks(query, null, 100, locale),
    fetchTypedArtworks(query, "print", 60, locale),
    fetchTypedArtworks(query, "book-illustration", 60, locale),
  ]);
  const basePaintings = base.artworks.filter((a) => (a.object_type ?? null) === null);
  const paintings = mergeUniqueArtworks([basePaintings, typedPaintings], 100);

  return { paintings, prints, books, artists: base.artists, error: base.error };
}

// Results for a query are kept for an hour (cache key = normalized query), so
// repeat searches for the same words — most searches — skip the database.
const cachedSegmentedSearch = unstable_cache(
  async (query: string, locale: string) => {
    const result = await segmentedSearchUncached(query, locale);
    if (result.error) throw new Error(result.error); // never cache a failed search
    return result;
  },
  ["site-search", "v2"],
  { revalidate: 3600 },
);

/** `locale` = the search page's language: results come back with titles and
 *  artist names in that language and the query is matched against them too. */
export async function runSegmentedSearch(rawQuery: string, locale = "en"): Promise<SegmentedSearch> {
  // Same words, same case, same spacing → same cache entry. Every matcher below
  // is case-insensitive, so lowercasing loses nothing.
  const query = rawQuery.trim().replace(/\s+/g, " ").toLowerCase();
  try {
    return await cachedSegmentedSearch(query, locale);
  } catch {
    return segmentedSearchUncached(query, locale);
  }
}

export async function runSiteSearch(rawQuery: string, locale = "en"): Promise<{
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

  // Artwork and artist lookups don't depend on each other — run them together.
  const [rpc, { data: artistRows }] = await Promise.all([fetchArtworksByRpc(term, locale), fetchArtistsByName(term, locale)]);
  if (rpc.error) {
    const fallback = await fetchArtworksByFilter(term, locale);
    if (fallback.error) {
      return { artworks: [], artists: [], error: fallback.error.message };
    }
    artworks = (fallback.data as unknown as SiteSearchArtworkRow[] | null) ?? [];
    error = rpc.error.message;
  } else {
    artworks = (rpc.data as unknown as SiteSearchArtworkRow[] | null) ?? [];
    // RPC can succeed but return no rows (e.g. FTS vs ilike mismatch). Fall back so search stays reliable.
    if (artworks.length === 0) {
      const fallback = await fetchArtworksByFilter(term, locale);
      if (!fallback.error) {
        artworks = (fallback.data as unknown as SiteSearchArtworkRow[] | null) ?? [];
      }
    }
  }

  // Smart correlation: if the query maps to related concepts (e.g. botanical →
  // trees, mushrooms, ferns), append those matches after the exact ones so the
  // search never dead-ends and surfaces the semantic neighbourhood.
  const expanded = expandSearchTerm(term);
  if (expanded.length > 1 && artworks.length < 50) {
    const seenIds = new Set(artworks.map((a) => a.id));
    const exp = await fetchArtworksByExpansions(expanded, 80, locale);
    if (!exp.error) {
      for (const row of (exp.data as unknown as SiteSearchArtworkRow[] | null) ?? []) {
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
  // English name → name in the visitor's language, applied after enrichment
  // (the preview-image lookup needs the English name).
  const localName = new Map<string, string>();

  for (const row of artistRows ?? []) {
    const name = row.name?.trim();
    const slug = row.slug?.trim();
    if (!name || !slug) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (row.name_local?.trim()) localName.set(name, row.name_local.trim());
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

  // Only the artists the tab can show get the per-artist image lookup.
  const enrichedArtists = await enrichSearchArtists(artists.slice(0, MAX_ARTISTS));

  return {
    artworks,
    artists: enrichedArtists.map((a) => ({ ...a, name: localName.get(a.name) ?? a.name })),
    error,
  };
}
