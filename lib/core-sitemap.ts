import { createClient } from "@supabase/supabase-js";

import { artworkLoc } from "@/lib/artwork-sitemap-response";
import { COMMERCIAL_USE_PATHS } from "@/lib/commercial-use-landing";
import { CONTACT_PATHS } from "@/lib/contact-translations";
import { fineArtProPath } from "@/lib/fineart-pro-path";
import { GOOGLE_ALLOWLIST } from "@/lib/google-allowlist.generated";
import { LOCALE_ROUTE_CONFIG, type SiteLocale } from "@/lib/locale-routes";
import { escapeXml, getPublicSiteUrl } from "@/lib/sitemap-xml";
import type { Locale } from "@/lib/translations";
import { artworkGridImageUrl, slugify } from "@/lib/utils";

/**
 * CORE SITEMAP (2026-09-22). Search Console showed Google willing to keep only
 * ~3k of the 1.05M URLs the full sitemaps advertise (987k "discovered, not
 * indexed"; ~30 HTML crawls a day). Standard remedy for very large catalogues:
 * advertise only the pages worth indexing so the crawl budget lands there.
 *
 *   /sitemap-core.xml  → hubs + top artists + top artworks (EN score ≥ 0.6,
 *                        other locales score ≥ 0.8) + matching image sitemap.
 *   /sitemap.xml       → the full catalogue, still served for Bing / IndexNow.
 *
 * robots.txt lists only the core index; the full one is submitted by hand in
 * Bing Webmaster Tools. Lists come from ranked SQL functions that return one
 * json value (PostgREST caps row responses at 1,000).
 */
export const CORE_SITEMAP_PAGE_SIZE = 10000;

/**
 * GOOGLE ALLOW-LIST (Oct 2026). Once lib/google-allowlist.generated.ts holds the
 * approved pages, the core sitemap advertises exactly those (and middleware tells
 * Googlebot "noindex" everywhere else). Empty list = the score-based core below.
 */
export const ALLOWLIST_ACTIVE = GOOGLE_ALLOWLIST.size > 0;
const ARTWORK_PREFIX = "/artworks/";
const ARTIST_PREFIX = "/artists/";
function allowlistedSlugs(prefix: string): string[] {
  return [...GOOGLE_ALLOWLIST].filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length));
}
/** Locales advertised to Google. "zh" is deliberately offline (403). */
export const CORE_LOCALES: SiteLocale[] = ["en", "es", "pt", "fr", "de", "it", "ja", "ko", "ru"];
export const CORE_ARTIST_MIN_WORKS = 5;
export const CORE_ARTIST_MIN_BIO_CHARS = 300;

/** English is the main index target; other locales only advertise their best works. */
export function coreMinScore(locale: SiteLocale): number {
  return locale === "en" ? 0.6 : 0.8;
}

export function isCoreLocale(value: string): value is SiteLocale {
  return (CORE_LOCALES as string[]).includes(value);
}

export const CORE_XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
} as const;

export function coreSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error("[sitemap/core] missing Supabase env");
  }
  return createClient(url, key);
}

export function buildCoreUrlset(locs: string[]): string {
  const inner = locs.map((loc) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${inner}\n</urlset>\n`;
}

export function buildCoreSitemapIndex(locs: string[]): string {
  const inner = locs.map((loc) => `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n  </sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${inner}\n</sitemapindex>\n`;
}

/** Number of 10k files needed for a locale's core artworks. */
export async function coreArtworkPageCount(locale: SiteLocale): Promise<number> {
  if (ALLOWLIST_ACTIVE) return locale === "en" ? 1 : 0;
  const { data, error } = await coreSupabase().rpc("core_sitemap_artwork_count", {
    min_score: coreMinScore(locale),
  });
  if (error) throw error;
  const count = typeof data === "number" ? data : 0;
  return Math.max(1, Math.ceil(count / CORE_SITEMAP_PAGE_SIZE));
}

export async function coreArtworkSlugs(locale: SiteLocale, page: number): Promise<string[]> {
  if (ALLOWLIST_ACTIVE) return locale === "en" && page === 0 ? allowlistedSlugs(ARTWORK_PREFIX) : [];
  const { data, error } = await coreSupabase().rpc("core_sitemap_artwork_slugs", {
    min_score: coreMinScore(locale),
    lim: CORE_SITEMAP_PAGE_SIZE,
    off: page * CORE_SITEMAP_PAGE_SIZE,
  });
  if (error) throw error;
  return ((data as string[] | null) ?? []).filter((s) => typeof s === "string" && s.trim());
}

export type CoreArtworkRow = { slug: string; image_id: string | null; title: string | null; artist: string | null };

export async function coreArtworkRows(locale: SiteLocale, page: number): Promise<CoreArtworkRow[]> {
  if (ALLOWLIST_ACTIVE) {
    if (locale !== "en" || page !== 0) return [];
    const slugs = allowlistedSlugs(ARTWORK_PREFIX);
    const rows: CoreArtworkRow[] = [];
    for (let i = 0; i < slugs.length; i += 200) {
      const { data, error } = await coreSupabase()
        .from("artworks")
        .select("slug, image_id, title, artist_display")
        .in("slug", slugs.slice(i, i + 200));
      if (error) throw error;
      for (const r of data ?? []) rows.push({ slug: r.slug, image_id: r.image_id, title: r.title, artist: r.artist_display });
    }
    return rows;
  }
  const { data, error } = await coreSupabase().rpc("core_sitemap_artwork_rows", {
    min_score: coreMinScore(locale),
    lim: CORE_SITEMAP_PAGE_SIZE,
    off: page * CORE_SITEMAP_PAGE_SIZE,
  });
  if (error) throw error;
  return ((data as CoreArtworkRow[] | null) ?? []).filter((r) => r && typeof r.slug === "string" && r.slug.trim());
}

/** Catch-all "artists" that are not a person: never worth a crawl slot. */
const GENERIC_ARTIST_SLUGS = new Set(["unknown-artist", "unknown", "anonymous", "anonymous-artist", "unidentified-artist"]);

export async function coreArtistSlugs(): Promise<string[]> {
  if (ALLOWLIST_ACTIVE) return allowlistedSlugs(ARTIST_PREFIX);
  const { data, error } = await coreSupabase().rpc("core_sitemap_artist_slugs", {
    min_works: CORE_ARTIST_MIN_WORKS,
    min_bio: CORE_ARTIST_MIN_BIO_CHARS,
  });
  if (error) throw error;
  return ((data as string[] | null) ?? []).filter(
    (s) => typeof s === "string" && s.trim() && !GENERIC_ARTIST_SLUGS.has(s.trim())
  );
}

export function coreArtworkLoc(base: string, locale: SiteLocale, slug: string): string {
  return artworkLoc(base, locale, slug);
}

/** Page (0-based) from a route param: null when not a plain non-negative integer. */
export function parseCorePage(raw: string): number | null {
  const page = parseInt(raw, 10);
  if (!Number.isFinite(page) || page < 0 || page > 100 || String(page) !== raw) return null;
  return page;
}

const GENRE_SLUGS = [
  "landscape", "marine", "architecture", "genre-scene", "religious", "portrait", "figurative",
  "decorative-art", "historical", "interior", "botanical", "abstract", "animal", "still-life",
  "mythology", "allegory", "drawing", "illustration",
];

/**
 * Hub pages: home + the five catalogue sections + Pro + contact + commercial-use
 * landing in every core locale, then the English genre / style / museum pages.
 */
export async function coreHubLocs(): Promise<string[]> {
  const base = getPublicSiteUrl();
  if (ALLOWLIST_ACTIVE) {
    return [...GOOGLE_ALLOWLIST]
      .filter((p) => !p.startsWith(ARTWORK_PREFIX) && !p.startsWith(ARTIST_PREFIX))
      .map((p) => (p === "/" ? base : `${base}${p}`));
  }
  const locs: string[] = [];
  for (const locale of CORE_LOCALES) {
    const cfg = locale === "en" ? null : LOCALE_ROUTE_CONFIG[locale];
    const prefix = cfg ? cfg.prefix : "";
    locs.push(prefix ? `${base}${prefix}` : base);
    locs.push(`${base}${prefix}/${cfg ? cfg.segments.artworks : "artworks"}`);
    locs.push(`${base}${prefix}/${cfg ? cfg.segments.artists : "artists"}`);
    locs.push(`${base}${prefix}/${cfg ? cfg.segments.museums : "museums"}`);
    locs.push(`${base}${prefix}/${cfg ? cfg.segments.genres : "genres"}`);
    locs.push(`${base}${prefix}/${cfg ? cfg.segments.styles : "styles"}`);
    locs.push(`${base}${fineArtProPath(locale as Locale)}`);
    locs.push(`${base}${CONTACT_PATHS[locale as Locale]}`);
    const commercial = COMMERCIAL_USE_PATHS[locale];
    if (commercial) locs.push(`${base}${commercial}`);
  }
  locs.push(`${base}/about`, `${base}/blog`, `${base}/topics`, `${base}/countries`);

  // Narrower than app/sitemap/static's sitemap_facets() RPC — this route never
  // used the `artists` field, which was the single most expensive part of that
  // function (11k+ distinct artist_display values vs. dozens for genres/styles/
  // museums combined). See the sitemap_facets_core migration for details.
  const { data, error } = await coreSupabase().rpc("sitemap_facets_core");
  if (error) throw error;
  const f = (data ?? {}) as { genres?: string[]; styles?: string[]; museums?: string[] };
  const seen = new Set<string>();
  const add = (loc: string) => {
    if (!seen.has(loc)) {
      seen.add(loc);
      locs.push(loc);
    }
  };
  for (const g of GENRE_SLUGS) add(`${base}/genres/${g}`);
  for (const t of f.genres ?? []) {
    const seg = slugify(t.trim());
    if (seg) add(`${base}/genres/${seg}`);
  }
  for (const t of f.styles ?? []) {
    const seg = slugify(t.trim());
    if (seg) add(`${base}/styles/${seg}`);
  }
  for (const m of f.museums ?? []) {
    const name = m.trim();
    if (!name || name.toLowerCase() === "private collection") continue;
    const seg = slugify(name);
    if (seg) add(`${base}/museums/${seg}`);
  }
  return locs;
}

export type CoreImageEntry = { loc: string; imageUrl: string; title: string };

export function buildCoreImageUrlset(entries: CoreImageEntry[]): string {
  const inner = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escapeXml(e.loc)}</loc>\n    <image:image>\n      <image:loc>${escapeXml(e.imageUrl)}</image:loc>\n      <image:title>${escapeXml(e.title)}</image:title>\n    </image:image>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${inner}\n</urlset>\n`;
}

export function coreImageEntry(base: string, row: CoreArtworkRow): CoreImageEntry | null {
  const imageId = row.image_id?.trim();
  if (!imageId) return null;
  const imageUrl = artworkGridImageUrl({ image_id: imageId, url: null });
  if (!imageUrl) return null;
  const title = row.title?.trim() ?? "";
  const artist = row.artist?.trim() ?? "";
  return { loc: coreArtworkLoc(base, "en", row.slug.trim()), imageUrl, title: artist ? `${title} by ${artist}` : title };
}
