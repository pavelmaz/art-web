import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { LOCALE_ROUTE_CONFIG, type SiteLocale } from "@/lib/locale-routes";
import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";
import { artworkGridImageUrl } from "@/lib/utils";

/**
 * 10,000 URLs per sitemap file (Google's limit is 50,000 / 50MB). The old 500
 * fragmented the catalog into 2,419 files, so Googlebot spent 2,419 fetches
 * enumerating URLs before crawling a single page — on a site where crawl budget
 * is the scarce resource. Now ~11 files per locale, ~120 total. PostgREST caps
 * any single response at 1,000 rows, so one file is assembled from keyset
 * batches of 1,000 (see fetchSitemapRows).
 */
export const ARTWORK_SITEMAP_PAGE_SIZE = 10000;
const FETCH_BATCH_SIZE = 1000;
// Generous abuse cap only. The sitemap index lists the real page count dynamically,
// and out-of-range pages return an empty (valid) urlset via the keyset logic below.
export const ARTWORK_SITEMAP_MAX_PAGE_INDEX = 1000;
export const IMAGE_SITEMAP_MAX_PAGE_INDEX = 1000;

/** Used only if the live count can't be read. Deliberately an OVER-estimate of the
 *  real page count (~11 at ~109k artworks / 10k per file) with headroom for growth:
 *  pages past the real end return empty-but-valid sitemaps, so over-listing is
 *  harmless — whereas under-listing silently drops URLs across every locale. */
export const FALLBACK_SITEMAP_COUNT = 40;

/** Number of artwork sitemap pages = ceil(total artworks / page size), read live so
 *  no index ever drops newly added artworks. Shared by the master sitemap index and
 *  the per-locale indexes. */
export async function artworkSitemapPageCount(supabase: SupabaseClient): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("artworks")
      .select("id", { count: "exact", head: true });
    if (error || !count || count <= 0) {
      return FALLBACK_SITEMAP_COUNT;
    }
    return Math.ceil(count / ARTWORK_SITEMAP_PAGE_SIZE);
  } catch {
    return FALLBACK_SITEMAP_COUNT;
  }
}

export const ARTWORK_SITEMAP_XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
} as const;

function emptyUrlset(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`;
}

function emptyImageUrlset(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
</urlset>
`;
}

/**
 * No <lastmod> anywhere. The old values were constants (every URL stamped with
 * the enrichment date, every index entry with the last import wave), and Google
 * uses lastmod only when it is "consistently and verifiably accurate" — thousands
 * of URLs sharing one date is the textbook signal of the opposite, which teaches
 * the crawler to distrust the whole sitemap. An absent lastmod is neutral; a fake
 * one is a negative. changefreq/priority stay off these files for the same reason.
 */
function buildUrlset(locs: string[]): string {
  const inner = locs
    .map((loc) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${inner}
</urlset>
`;
}

type ImageSitemapEntry = {
  loc: string;
  imageUrl: string;
  title: string;
};

function buildImageUrlset(entries: ImageSitemapEntry[]): string {
  const inner = entries
    .map(
      (e) =>
        `  <url>\n` +
        `    <loc>${escapeXml(e.loc)}</loc>\n` +
        `    <image:image>\n` +
        `      <image:loc>${escapeXml(e.imageUrl)}</image:loc>\n` +
        `      <image:title>${escapeXml(e.title)}</image:title>\n` +
        `    </image:image>\n` +
        `  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${inner}
</urlset>
`;
}

/** Encode slug the same way as sitemap locs have always been built. */
function encodeArtworkSlug(slug: string): string {
  return encodeURIComponent(slug);
}

function artworkLoc(base: string, locale: SiteLocale, slug: string): string {
  const encoded = encodeArtworkSlug(slug);
  if (locale === "en") {
    return `${base}/artworks/${encoded}`;
  }
  const { prefix, segments } = LOCALE_ROUTE_CONFIG[locale];
  return `${base}${prefix}/${segments.artworks}/${encoded}`;
}

function makeSitemapClient(url: string, key: string) {
  return createClient(url, key);
}
type SitemapClient = ReturnType<typeof makeSitemapClient>;

/**
 * Cursor for offset-style pagination without a slow OFFSET: the id of the row
 * immediately before `offset` in id order, read via an index-only scan on the
 * primary key. Lets the page query use `id > cursor` (~30ms) instead of
 * `OFFSET 82000` (~15s, which hits the statement timeout). `pastEnd` is true when
 * the offset is beyond the table, so the caller can serve an empty (valid) sitemap.
 */
async function keysetCursor(
  supabase: SitemapClient,
  offset: number,
): Promise<{ cursor: string | null; pastEnd: boolean }> {
  if (offset <= 0) {
    return { cursor: null, pastEnd: false };
  }
  const { data, error } = await supabase
    .from("artworks")
    .select("id")
    .order("id", { ascending: true })
    .range(offset - 1, offset - 1);
  if (error) {
    throw error;
  }
  const rows = (data as { id: string }[] | null) ?? [];
  if (!rows.length) {
    return { cursor: null, pastEnd: true };
  }
  return { cursor: rows[0].id, pastEnd: false };
}

/**
 * Fetch one sitemap page's rows (up to ARTWORK_SITEMAP_PAGE_SIZE) in id-ordered
 * keyset batches of FETCH_BATCH_SIZE — PostgREST silently truncates any single
 * response to 1,000 rows, so `.limit(10000)` alone would return a tenth of the
 * page. Each batch is an indexed `id > cursor` scan (~30ms); a full file is ~10
 * round trips.
 */
async function fetchSitemapRows<T extends { id: string }>(
  supabase: SitemapClient,
  columns: string,
  startCursor: string | null,
): Promise<T[]> {
  const out: T[] = [];
  let cursor = startCursor;
  while (out.length < ARTWORK_SITEMAP_PAGE_SIZE) {
    const want = Math.min(FETCH_BATCH_SIZE, ARTWORK_SITEMAP_PAGE_SIZE - out.length);
    let q = supabase.from("artworks").select(columns);
    if (cursor !== null) {
      q = q.gt("id", cursor);
    }
    const { data, error } = await q.order("id", { ascending: true }).limit(want);
    if (error) {
      throw error;
    }
    const rows = (data as unknown as T[] | null) ?? [];
    out.push(...rows);
    if (rows.length < want) {
      break; // end of table
    }
    cursor = rows[rows.length - 1].id;
  }
  return out;
}

export async function buildArtworkSitemapPageResponse(
  locale: SiteLocale,
  rawPage: string
): Promise<Response> {
  const label = locale === "en" ? "artworks" : `${locale}/artworks`;

  try {
    const page = parseInt(rawPage, 10);
    if (
      !Number.isFinite(page) ||
      page < 0 ||
      page > ARTWORK_SITEMAP_MAX_PAGE_INDEX ||
      String(page) !== rawPage
    ) {
      return new Response(emptyUrlset(), { status: 200, headers: ARTWORK_SITEMAP_XML_HEADERS });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
      console.error(`[sitemap/${label}]`, page, "missing Supabase env");
      return new Response(emptyUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    const supabase = makeSitemapClient(supabaseUrl, supabaseKey);
    const offset = page * ARTWORK_SITEMAP_PAGE_SIZE;

    let cursor: string | null;
    try {
      const c = await keysetCursor(supabase, offset);
      if (c.pastEnd) {
        return new Response(emptyUrlset(), { status: 200, headers: ARTWORK_SITEMAP_XML_HEADERS });
      }
      cursor = c.cursor;
    } catch (cursorErr) {
      console.error(`[sitemap/${label}]`, page, cursorErr);
      return new Response(emptyUrlset(), { status: 503, headers: ARTWORK_SITEMAP_XML_HEADERS });
    }

    let rows: { id: string; slug: string | null }[];
    try {
      rows = await fetchSitemapRows(supabase, "id, slug", cursor);
    } catch (rowsErr) {
      console.error(`[sitemap/${label}]`, page, rowsErr);
      return new Response(emptyUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    const base = getPublicSiteUrl();
    const entries: string[] = rows
      .filter((r): r is { id: string; slug: string } => Boolean(r.slug?.trim()))
      .map((r) => artworkLoc(base, locale, r.slug.trim()));

    if (!entries.length && page === 0) {
      console.error(`[sitemap/${label}]`, page, "no URLs returned");
      return new Response(emptyUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    return new Response(buildUrlset(entries), {
      status: 200,
      headers: ARTWORK_SITEMAP_XML_HEADERS,
    });
  } catch (err) {
    console.error(`[sitemap/${label}] fatal`, err);
    return new Response(emptyUrlset(), {
      status: 503,
      headers: ARTWORK_SITEMAP_XML_HEADERS,
    });
  }
}

export async function buildArtworkImageSitemapPageResponse(
  locale: SiteLocale,
  rawPage: string
): Promise<Response> {
  const label = locale === "en" ? "images" : `${locale}/images`;

  try {
    const page = parseInt(rawPage, 10);
    if (
      !Number.isFinite(page) ||
      page < 0 ||
      page > IMAGE_SITEMAP_MAX_PAGE_INDEX ||
      String(page) !== rawPage
    ) {
      return new Response(emptyImageUrlset(), { status: 200, headers: ARTWORK_SITEMAP_XML_HEADERS });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
      console.error(`[sitemap/${label}]`, page, "missing Supabase env");
      return new Response(emptyImageUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    const supabase = makeSitemapClient(supabaseUrl, supabaseKey);
    const offset = page * ARTWORK_SITEMAP_PAGE_SIZE;

    let cursor: string | null;
    try {
      const c = await keysetCursor(supabase, offset);
      if (c.pastEnd) {
        return new Response(emptyImageUrlset(), { status: 200, headers: ARTWORK_SITEMAP_XML_HEADERS });
      }
      cursor = c.cursor;
    } catch (cursorErr) {
      console.error(`[sitemap/${label}]`, page, cursorErr);
      return new Response(emptyImageUrlset(), { status: 503, headers: ARTWORK_SITEMAP_XML_HEADERS });
    }

    let rows: Array<{
      id: string;
      slug: string | null;
      title: string | null;
      artist_display: string | null;
      image_id: string | null;
    }>;
    try {
      rows = await fetchSitemapRows(supabase, "id, slug, title, artist_display, image_id", cursor);
    } catch (rowsErr) {
      console.error(`[sitemap/${label}]`, page, rowsErr);
      return new Response(emptyImageUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    const base = getPublicSiteUrl();

    const entries: ImageSitemapEntry[] = [];
    for (const row of rows) {
      const slug = row.slug?.trim();
      const imageId = row.image_id?.trim();
      if (!slug || !imageId) {
        continue;
      }

      const imageUrl = artworkGridImageUrl({ image_id: imageId, url: null });
      if (!imageUrl) {
        continue;
      }

      const title = row.title?.trim() ?? "";
      const artist = row.artist_display?.trim() ?? "";
      const imageTitle = artist ? `${title} by ${artist}` : title;

      entries.push({
        loc: artworkLoc(base, locale, slug),
        imageUrl,
        title: imageTitle,
      });
    }

    if (!entries.length && page === 0) {
      console.error(`[sitemap/${label}]`, page, "no URLs returned");
      return new Response(emptyImageUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    return new Response(buildImageUrlset(entries), {
      status: 200,
      headers: ARTWORK_SITEMAP_XML_HEADERS,
    });
  } catch (err) {
    console.error(`[sitemap/${label}] fatal`, err);
    return new Response(emptyImageUrlset(), {
      status: 503,
      headers: ARTWORK_SITEMAP_XML_HEADERS,
    });
  }
}
