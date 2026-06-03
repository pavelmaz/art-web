/** Localized URL segments and Supabase column names per site locale. */

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
      artworks: "œuvres",
      artists: "artistes",
      museums: "musées",
      genres: "genres",
      styles: "styles",
      search: "recherche",
    },
    descriptionColumn: "description_fr",
    translationLocale: "fr",
    hreflang: "fr",
    bcp47: "fr",
  },
  de: {
    prefix: "/de",
    segments: {
      artworks: "werke",
      artists: "künstler",
      museums: "museen",
      genres: "genres",
      styles: "stile",
      search: "suche",
    },
    descriptionColumn: "description_ger",
    translationLocale: "de",
    hreflang: "de",
    bcp47: "de",
  },
  it: {
    prefix: "/it",
    segments: {
      artworks: "opere",
      artists: "artisti",
      museums: "musei",
      genres: "generi",
      styles: "stili",
      search: "ricerca",
    },
    descriptionColumn: "description_it",
    translationLocale: "it",
    hreflang: "it",
    bcp47: "it",
  },
  ko: {
    prefix: "/ko",
    segments: {
      artworks: "작품",
      artists: "예술가",
      museums: "박물관",
      genres: "장르",
      styles: "스타일",
      search: "검색",
    },
    descriptionColumn: "description_ko",
    translationLocale: "ko",
    hreflang: "ko",
    bcp47: "ko",
  },
  ru: {
    prefix: "/ru",
    segments: {
      artworks: "произведения",
      artists: "художники",
      museums: "музеи",
      genres: "жанры",
      styles: "стили",
      search: "поиск",
    },
    descriptionColumn: "description_ru",
    translationLocale: "ru",
    hreflang: "ru",
    bcp47: "ru",
  },
  zh: {
    prefix: "/zh",
    segments: {
      artworks: "作品",
      artists: "艺术家",
      museums: "博物馆",
      genres: "流派",
      styles: "风格",
      search: "搜索",
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
  return out;
}

export function buildHomeLanguageAlternates(): Record<string, string> {
  const site = "https://fineartfree.com";
  const out: Record<string, string> = { en: site };
  for (const loc of HREFLANG_LOCALES) {
    if (loc === "en") continue;
    out[loc] = `${site}${LOCALE_ROUTE_CONFIG[loc].prefix}`;
  }
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
  return out;
}
