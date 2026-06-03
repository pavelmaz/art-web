import { LOCALE_ROUTE_CONFIG } from "@/lib/locale-routes";
import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";

export const ENGLISH_PATH_LOCALE_SITEMAPS = ["fr", "de", "it", "ko", "ru", "zh"] as const;
export type EnglishPathLocaleSitemap = (typeof ENGLISH_PATH_LOCALE_SITEMAPS)[number];

export type SitemapEntry = {
  loc: string;
  changefreq?: string;
  priority?: number;
};

export const LOCALE_HUB_SITEMAP_XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
} as const;

export function buildUrlset(entries: SitemapEntry[]): string {
  const inner = entries
    .map((e) => {
      let xml = `  <url>\n    <loc>${escapeXml(e.loc)}</loc>`;
      if (e.changefreq) xml += `\n    <changefreq>${e.changefreq}</changefreq>`;
      if (e.priority != null) xml += `\n    <priority>${e.priority}</priority>`;
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

/** Hub listing URLs for locales that use English path segments (no /topics or /countries). */
export function localeHubSitemapEntries(locale: EnglishPathLocaleSitemap): SitemapEntry[] {
  const base = getPublicSiteUrl();
  const { prefix, segments } = LOCALE_ROUTE_CONFIG[locale];

  return [
    { loc: `${base}${prefix}`, changefreq: "daily", priority: 1.0 },
    { loc: `${base}${prefix}/${segments.artworks}`, changefreq: "daily", priority: 0.9 },
    { loc: `${base}${prefix}/${segments.artists}`, changefreq: "weekly", priority: 0.8 },
    { loc: `${base}${prefix}/${segments.styles}`, changefreq: "weekly", priority: 0.8 },
    { loc: `${base}${prefix}/${segments.genres}`, changefreq: "weekly", priority: 0.8 },
    { loc: `${base}${prefix}/${segments.museums}`, changefreq: "weekly", priority: 0.8 },
  ];
}
