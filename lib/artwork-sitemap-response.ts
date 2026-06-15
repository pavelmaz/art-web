import { createClient } from "@supabase/supabase-js";

import { LOCALE_ROUTE_CONFIG, type SiteLocale } from "@/lib/locale-routes";
import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";
import { artworkGridImageUrl } from "@/lib/utils";

export const ARTWORK_SITEMAP_PAGE_SIZE = 500;
export const ARTWORK_SITEMAP_MAX_PAGE_INDEX = 164;
export const IMAGE_SITEMAP_MAX_PAGE_INDEX = 164;

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

/** Convert a Postgres timestamp string to a W3C/ISO-8601 <lastmod> value. */
function toLastmod(value: string | null | undefined): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return undefined;
  }
  return d.toISOString();
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
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
      console.error(`[sitemap/${label}]`, page, "missing Supabase env");
      return new Response(emptyUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const from = page * ARTWORK_SITEMAP_PAGE_SIZE;
    const to = page * ARTWORK_SITEMAP_PAGE_SIZE + (ARTWORK_SITEMAP_PAGE_SIZE - 1);

    const { data, error } = await supabase
      .from("artworks")
      .select("slug, created_at")
      .not("slug", "is", null)
      .order("score", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);

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
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
      console.error(`[sitemap/${label}]`, page, "missing Supabase env");
      return new Response(emptyImageUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const from = page * ARTWORK_SITEMAP_PAGE_SIZE;
    const to = page * ARTWORK_SITEMAP_PAGE_SIZE + (ARTWORK_SITEMAP_PAGE_SIZE - 1);

    const { data, error } = await supabase
      .from("artworks")
      .select("slug, title, artist_display, image_id")
      .not("slug", "is", null)
      .order("score", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);

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
