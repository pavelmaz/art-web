import { createClient } from "@supabase/supabase-js";

import { LOCALE_ROUTE_CONFIG, type SiteLocale } from "@/lib/locale-routes";
import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";

export const ARTWORK_SITEMAP_PAGE_SIZE = 500;
export const ARTWORK_SITEMAP_MAX_PAGE_INDEX = 144;

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
      .select("slug")
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
    const rows = (data as { slug: string | null }[] | null) ?? [];
    const locs = rows
      .map((r) => r.slug?.trim())
      .filter((s): s is string => Boolean(s))
      .map((slug) => artworkLoc(base, locale, slug));

    if (!locs.length && page === 0) {
      console.error(`[sitemap/${label}]`, page, "no URLs returned");
      return new Response(emptyUrlset(), {
        status: 503,
        headers: ARTWORK_SITEMAP_XML_HEADERS,
      });
    }

    return new Response(buildUrlset(locs), {
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
