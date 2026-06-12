/** Localized URL segments and Supabase column names per site locale. */

import { absoluteUrl } from "./utils";

export type SiteLocale = "en" | "es" | "pt" | "ja" | "fr" | "de" | "it" | "ko" | "ru" | "zh";

export const HREFLANG_LOCALES: SiteLocale[] = [
  "en",
  "es",
  "pt",
  "ja",
  "fr",
  "de",
  "it",
  "ko",
  "ru",
  "zh",
];

export type LocaleSegments = {
  artworks: string;
  artists: string;
  museums: string;
  genres: string;
  styles: string;
  search: string;
};

export type LocaleRouteConfig = {
  prefix: string;
  segments: LocaleSegments;
  descriptionColumn: string;
  translationLocale: string;
  hreflang: string;
  bcp47: string;
};

export const LOCALE_ROUTE_CONFIG: Record<Exclude<SiteLocale, "en">, LocaleRouteConfig> = {
  es: {
    prefix: "/es",
    segments: {
      artworks: "obras",
      artists: "artistas",
      museums: "museos",
      genres: "generos",
      styles: "estilos",
      search: "buscar",
    },
    descriptionColumn: "description_sp",
    translationLocale: "es",
    hreflang: "es",
    bcp47: "es",
  },
  pt: {
    prefix: "/pt",
    segments: {
      artworks: "obras",
      artists: "artistas",
      museums: "museus",
      genres: "generos",
      styles: "estilos",
      search: "buscar",
    },
    descriptionColumn: "description_pt",
    translationLocale: "pt",
    hreflang: "pt",
    bcp47: "pt",
  },
  ja: {
    prefix: "/ja",
    segments: {
      artworks: "artworks",
      artists: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      search: "search",
    },
    descriptionColumn: "description_ja",
    translationLocale: "ja",
    hreflang: "ja",
    bcp47: "ja",
  },
  fr: {
    prefix: "/fr",
    segments: {
      artworks: "artworks",
      artists: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      search: "search",
    },
    descriptionColumn: "description_fr",
    translationLocale: "fr",
    hreflang: "fr",
    bcp47: "fr",
  },
  de: {
    prefix: "/de",
    segments: {
      artworks: "artworks",
      artists: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      search: "search",
    },
    descriptionColumn: "description_ger",
    translationLocale: "de",
    hreflang: "de",
    bcp47: "de",
  },
  it: {
    prefix: "/it",
    segments: {
      artworks: "artworks",
      artists: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      search: "search",
    },
    descriptionColumn: "description_it",
    translationLocale: "it",
    hreflang: "it",
    bcp47: "it",
  },
  ko: {
    prefix: "/ko",
    segments: {
      artworks: "artworks",
      artists: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      search: "search",
    },
    descriptionColumn: "description_ko",
    translationLocale: "ko",
    hreflang: "ko",
    bcp47: "ko",
  },
  ru: {
    prefix: "/ru",
    segments: {
      artworks: "artworks",
      artists: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      search: "search",
    },
    descriptionColumn: "description_ru",
    translationLocale: "ru",
    hreflang: "ru",
    bcp47: "ru",
  },
  zh: {
    prefix: "/zh",
    segments: {
      artworks: "artworks",
      artists: "artists",
      museums: "museums",
      genres: "genres",
      styles: "styles",
      search: "search",
    },
    descriptionColumn: "description_ch",
    translationLocale: "zh",
    hreflang: "zh",
    bcp47: "zh",
  },
};

const EN_SEGMENTS: LocaleSegments = {
  artworks: "artworks",
  artists: "artists",
  museums: "museums",
  genres: "genres",
  styles: "styles",
  search: "search",
};

export type LocaleSegmentRewrite = {
  source: string;
  destination: string;
};

/** Legacy Unicode/localized URL segments → English paths (301). New locales use English segments only. */
export const LEGACY_LOCALE_SEGMENT_REDIRECTS: Array<{
  locale: Exclude<SiteLocale, "en" | "es" | "pt" | "ja">;
  from: string;
  to: string;
}> = [
  { locale: "fr", from: "œuvres", to: "artworks" },
  { locale: "fr", from: "artistes", to: "artists" },
  { locale: "fr", from: "musées", to: "museums" },
  { locale: "fr", from: "recherche", to: "search" },
  { locale: "de", from: "werke", to: "artworks" },
  { locale: "de", from: "künstler", to: "artists" },
  { locale: "de", from: "kunstler", to: "artists" },
  { locale: "de", from: "museen", to: "museums" },
  { locale: "de", from: "stile", to: "styles" },
  { locale: "de", from: "suche", to: "search" },
  { locale: "it", from: "opere", to: "artworks" },
  { locale: "it", from: "artisti", to: "artists" },
  { locale: "it", from: "musei", to: "museums" },
  { locale: "it", from: "generi", to: "genres" },
  { locale: "it", from: "stili", to: "styles" },
  { locale: "it", from: "ricerca", to: "search" },
  { locale: "ko", from: "작품", to: "artworks" },
  { locale: "ko", from: "예술가", to: "artists" },
  { locale: "ko", from: "박물관", to: "museums" },
  { locale: "ko", from: "장르", to: "genres" },
  { locale: "ko", from: "스타일", to: "styles" },
  { locale: "ko", from: "검색", to: "search" },
  { locale: "ru", from: "произведения", to: "artworks" },
  { locale: "ru", from: "художники", to: "artists" },
  { locale: "ru", from: "музеи", to: "museums" },
  { locale: "ru", from: "жанры", to: "genres" },
  { locale: "ru", from: "стили", to: "styles" },
  { locale: "ru", from: "поиск", to: "search" },
  { locale: "zh", from: "作品", to: "artworks" },
  { locale: "zh", from: "艺术家", to: "artists" },
  { locale: "zh", from: "博物馆", to: "museums" },
  { locale: "zh", from: "流派", to: "genres" },
  { locale: "zh", from: "风格", to: "styles" },
  { locale: "zh", from: "搜索", to: "search" },
];

export function buildLegacyLocalePathRedirects(): Array<{
  source: string;
  destination: string;
  permanent: boolean;
}> {
  const redirects: Array<{ source: string; destination: string; permanent: boolean }> = [];

  for (const { locale, from, to } of LEGACY_LOCALE_SEGMENT_REDIRECTS) {
    const prefix = LOCALE_ROUTE_CONFIG[locale].prefix;
    redirects.push(
      { source: `${prefix}/${from}`, destination: `${prefix}/${to}`, permanent: true },
      { source: `${prefix}/${from}/:path*`, destination: `${prefix}/${to}/:path*`, permanent: true }
    );
  }

  return redirects;
}

/** No Unicode rewrites needed — app route folders match public URL segments for all locales. */
export function buildLocaleSegmentRewrites(): LocaleSegmentRewrite[] {
  return [];
}

export function canonicalHubUrl(
  locale: SiteLocale,
  hub: keyof LocaleSegments
): string {
  if (locale === "en") {
    return `https://fineartfree.com${localePath("en", hub)}`;
  }
  return `https://fineartfree.com${localePath(locale, hub)}`;
}

export function getLocaleConfig(locale: SiteLocale): LocaleRouteConfig | null {
  if (locale === "en") return null;
  return LOCALE_ROUTE_CONFIG[locale];
}

export function getSegments(locale: SiteLocale): LocaleSegments {
  if (locale === "en") return EN_SEGMENTS;
  return LOCALE_ROUTE_CONFIG[locale].segments;
}

export function localePath(locale: SiteLocale, segment: keyof LocaleSegments, suffix = ""): string {
  const seg = getSegments(locale)[segment];
  if (locale === "en") {
    return `/${seg}${suffix}`;
  }
  return `${LOCALE_ROUTE_CONFIG[locale].prefix}/${seg}${suffix}`;
}

export function artworkDetailPath(locale: SiteLocale, slug: string): string {
  const encoded = encodeURIComponent(slug);
  return `${localePath(locale, "artworks")}/${encoded}`;
}

export function absoluteArtworkUrl(locale: SiteLocale, slug: string): string {
  return `https://fineartfree.com${artworkDetailPath(locale, slug)}`;
}

export function buildArtworkLanguageAlternates(slug: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const loc of HREFLANG_LOCALES) {
    out[loc] = absoluteArtworkUrl(loc, slug);
  }
  out["x-default"] = absoluteArtworkUrl("en", slug);
  return out;
}

export function buildHubLanguageAlternates(
  hub: keyof LocaleSegments
): Record<string, string> {
  const site = "https://fineartfree.com";
  const out: Record<string, string> = {};
  for (const loc of HREFLANG_LOCALES) {
    const path = localePath(loc, hub);
    out[loc] = `${site}${path === "/" ? "" : path}`;
  }
  out["x-default"] = `${site}${localePath("en", hub)}`;
  return out;
}

export function buildHomeLanguageAlternates(): Record<string, string> {
  const site = "https://fineartfree.com";
  const out: Record<string, string> = { en: site };
  for (const loc of HREFLANG_LOCALES) {
    if (loc === "en") continue;
    out[loc] = `${site}${LOCALE_ROUTE_CONFIG[loc].prefix}`;
  }
  out["x-default"] = site;
  return out;
}

export function artistDetailPath(locale: SiteLocale, slug: string): string {
  return `${localePath(locale, "artists")}/${encodeURIComponent(slug)}`;
}

export function buildArtistLanguageAlternates(slug: string): Record<string, string> {
  const site = "https://fineartfree.com";
  const out: Record<string, string> = {};
  for (const loc of HREFLANG_LOCALES) {
    out[loc] = `${site}${artistDetailPath(loc, slug)}`;
  }
  out["x-default"] = absoluteUrl(`/artists/${slug}`);
  return out;
}

function taxonomyDetailPath(
  locale: SiteLocale,
  hub: "genres" | "styles" | "museums",
  slug: string
): string {
  return `${localePath(locale, hub)}/${encodeURIComponent(slug)}`;
}

export function buildGenreLanguageAlternates(slug: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const loc of HREFLANG_LOCALES) {
    languages[loc] = absoluteUrl(taxonomyDetailPath(loc, "genres", slug));
  }
  languages["x-default"] = absoluteUrl(taxonomyDetailPath("en", "genres", slug));
  return languages;
}

export function buildStyleLanguageAlternates(slug: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const loc of HREFLANG_LOCALES) {
    languages[loc] = absoluteUrl(taxonomyDetailPath(loc, "styles", slug));
  }
  languages["x-default"] = absoluteUrl(taxonomyDetailPath("en", "styles", slug));
  return languages;
}

export function buildMuseumLanguageAlternates(slug: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const loc of HREFLANG_LOCALES) {
    languages[loc] = absoluteUrl(taxonomyDetailPath(loc, "museums", slug));
  }
  languages["x-default"] = absoluteUrl(taxonomyDetailPath("en", "museums", slug));
  return languages;
}
