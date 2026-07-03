import { createClient } from "@supabase/supabase-js";

import { LOCALE_ROUTE_CONFIG, type SiteLocale } from "@/lib/locale-routes";
import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";
import { artworkGridImageUrl } from "@/lib/utils";

export const ARTWORK_SITEMAP_PAGE_SIZE = 500;
// Generous abuse cap only. The sitemap index lists the real page count dynamically,
// and out-of-range pages return an empty (valid) urlset via the keyset logic below.
export const ARTWORK_SITEMAP_MAX_PAGE_INDEX = 1000;
export const IMAGE_SITEMAP_MAX_PAGE_INDEX = 1000;

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

type ArtworkUrlEntry = { loc: string; lastmod?: string };

/**
 * Date of the last site-wide content refresh of artwork pages. The AI enrichment
 * backfill (unique descriptions, 10-locale SEO text and alt text on every artwork)
 * completed 2026-06-28, materially changing every page — but rows only carry
 * `created_at`, so a raw created_at <lastmod> would tell crawlers nothing changed
 * and suppress re-crawling of the now-enriched pages. Bump this when the next
 * site-wide content refresh lands.
 */
const CONTENT_REFRESH_LASTMOD = Date.parse("2026-06-28T00:00:00.000Z");

/** Convert a Postgres timestamp string to a W3C/ISO-8601 <lastmod> value, floored
 *  at the last site-wide content refresh (newer rows keep their created_at). */
function toLastmod(value: string | null | undefined): string | undefined {
  const created = typeof value === "string" && value.trim() ? Date.parse(value) : NaN;
  const lastmod = Number.isNaN(created) ? CONTENT_REFRESH_LASTMOD : Math.max(created, CONTENT_REFRESH_LASTMOD);
  return new Date(lastmod).toISOString();
}

function buildUrlset(entries: ArtworkUrlEntry[]): string {
  const inner = entries
    .map((e) => {
      let xml = `  <url>\n    <loc>${escapeXml(e.loc)}</loc>`;
      if (e.lastmod) {
        xml += `\n    <lastmod>${e.lastmod}</lastmod>`;
      }
      xml += `\n  </url>`;
      return xml;
    })
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

    let pageQuery = supabase.from("artworks").select("slug, created_at");
    if (cursor !== null) {
      pageQuery = pageQuery.gt("id", cursor);
    }
    const { data, error } = await pageQuery
      .order("id", { ascending: true })
      .limit(ARTWORK_SITEMAP_PAGE_SIZE);

    if (error) {
      console.error(`[sitemap/${label}]`, page, error);
      return new Response(emptyUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    const base = getPublicSiteUrl();
    const rows =
      (data as { slug: string | null; created_at: string | null }[] | null) ?? [];
    const entries: ArtworkUrlEntry[] = rows
      .filter((r): r is { slug: string; created_at: string | null } =>
        Boolean(r.slug?.trim())
      )
      .map((r) => ({
        loc: artworkLoc(base, locale, r.slug.trim()),
        lastmod: toLastmod(r.created_at),
      }));

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

    let pageQuery = supabase.from("artworks").select("slug, title, artist_display, image_id");
    if (cursor !== null) {
      pageQuery = pageQuery.gt("id", cursor);
    }
    const { data, error } = await pageQuery
      .order("id", { ascending: true })
      .limit(ARTWORK_SITEMAP_PAGE_SIZE);

    if (error) {
      console.error(`[sitemap/${label}]`, page, error);
      return new Response(emptyImageUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    const base = getPublicSiteUrl();
    const rows =
      (data as Array<{
        slug: string | null;
        title: string | null;
        artist_display: string | null;
        image_id: string | null;
      }> | null) ?? [];

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
