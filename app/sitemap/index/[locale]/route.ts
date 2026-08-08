import { artworkSitemapPageCount } from "@/lib/artwork-sitemap-response";
import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Per-locale sitemap index — /sitemap/index/es, /sitemap/index/en, etc.
 *
 * The master /sitemap.xml mixes all ten locales, so Search Console can only
 * report indexation for the whole pile. Submitting these ten indexes separately
 * gives a per-locale Sitemaps row (submitted vs indexed per language) — the
 * data that decides whether the translated locales are earning their crawl
 * budget or should be pulled from the master index. Same child files, just
 * grouped; a child sitemap may be referenced by any number of indexes.
 *
 * en additionally carries /sitemap/static (hubs + artists + blog, EN-only
 * today) and the image sitemaps; non-EN locales carry their small hub file.
 */
const LOCALES = ["en", "es", "pt", "ja", "fr", "de", "it", "ko", "ru", "zh"] as const;
type IndexLocale = (typeof LOCALES)[number];

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, must-revalidate",
} as const;

function buildIndex(locs: string[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    locs.map((loc) => `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n  </sitemap>`).join("\n") +
    "\n</sitemapindex>\n"
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ locale: string }> }
) {
  const { locale } = await context.params;
  if (!LOCALES.includes(locale as IndexLocale)) {
    return new Response("Not found", { status: 404 });
  }

  const base = getPublicSiteUrl();
  const pageCount = await artworkSitemapPageCount(supabase);
  const locs: string[] = [];

  if (locale === "en") {
    locs.push(`${base}/sitemap/static`);
    for (let i = 0; i < pageCount; i++) locs.push(`${base}/sitemap/artworks/${i}`);
    for (let i = 0; i < pageCount; i++) locs.push(`${base}/sitemap/images/${i}`);
  } else {
    locs.push(`${base}/sitemap/${locale}`);
    for (let i = 0; i < pageCount; i++) locs.push(`${base}/sitemap/${locale}/artworks/${i}`);
  }

  return new Response(buildIndex(locs), { status: 200, headers: XML_HEADERS });
}
