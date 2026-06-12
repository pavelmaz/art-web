import { isPaginatedListPage } from "@/lib/list-page-metadata";
import {
  buildTopicsCountriesLanguageAlternates,
  parseTopicsCountriesPathname,
} from "@/lib/topics-countries-seo";
import {
  HREFLANG_LOCALES,
  LOCALE_ROUTE_CONFIG,
  buildHomeLanguageAlternates,
  buildHubLanguageAlternates,
  getSegments,
  type LocaleSegments,
  type SiteLocale,
} from "@/lib/locale-routes";

const SITE = "https://fineartfree.com";

const EN_SEGMENTS: LocaleSegments = {
  artworks: "artworks",
  artists: "artists",
  museums: "museums",
  genres: "genres",
  styles: "styles",
  search: "search",
};

const HUB_KEYS: (keyof LocaleSegments)[] = [
  "artworks",
  "artists",
  "museums",
  "genres",
  "styles",
];

/** Paths that exist only in English — no localized equivalents. */
const EN_ONLY_EXACT = new Set([
  "/about",
  "/terms",
  "/blog",
  "/fineart-pro",
  "/fineart-pro/join",
  "/fineart-pro/success",
]);

const EN_ONLY_PREFIXES = ["/blog/", "/guides/", "/fineart-pro/"] as const;

export function isEnOnlyPathname(pathname: string): boolean {
  if (EN_ONLY_EXACT.has(pathname)) {
    return true;
  }
  return EN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function buildEnOnlyLanguageAlternates(pathname: string): Record<string, string> {
  const url = `${SITE}${pathname}`;
  return { en: url, "x-default": url };
}

function mapSegmentPath(
  rest: string,
  from: LocaleSegments,
  to: LocaleSegments,
  extra?: { fromTopics?: string; toTopics?: string; fromCountries?: string; toCountries?: string }
): string {
  let path = rest;
  const pairs: Array<[keyof LocaleSegments, string]> = [
    ["artworks", from.artworks],
    ["artists", from.artists],
    ["museums", from.museums],
    ["genres", from.genres],
    ["styles", from.styles],
    ["search", from.search],
  ];
  for (const [key, fromSeg] of pairs) {
    const prefix = `/${fromSeg}`;
    if (path.startsWith(prefix)) {
      const toSeg = to[key];
      return `/${toSeg}${path.slice(prefix.length)}`;
    }
  }
  if (extra?.fromTopics && extra?.toTopics && path.startsWith(`/${extra.fromTopics}`)) {
    return `/${extra.toTopics}${path.slice(extra.fromTopics.length + 1)}`;
  }
  if (extra?.fromCountries && extra?.toCountries && path.startsWith(`/${extra.fromCountries}`)) {
    return `/${extra.toCountries}${path.slice(extra.fromCountries.length + 1)}`;
  }
  return path;
}

export function detectHubFromPathname(pathname: string): keyof LocaleSegments | null {
  for (const hub of HUB_KEYS) {
    const enSeg = EN_SEGMENTS[hub];
    if (pathname === `/${enSeg}`) {
      return hub;
    }
  }
  for (const loc of HREFLANG_LOCALES) {
    if (loc === "en") continue;
    const config = LOCALE_ROUTE_CONFIG[loc];
    for (const hub of HUB_KEYS) {
      const seg = config.segments[hub];
      if (pathname === `${config.prefix}/${seg}`) {
        return hub;
      }
    }
  }
  return null;
}

function languageAlternatesToLinkHeader(languages: Record<string, string>): string {
  const parts: string[] = [];
  for (const loc of HREFLANG_LOCALES) {
    const url = languages[loc];
    if (url) {
      parts.push(`<${url}>; rel="alternate"; hreflang="${loc}"`);
    }
  }
  const xDefault = languages["x-default"];
  if (xDefault) {
    parts.push(`<${xDefault}>; rel="alternate"; hreflang="x-default"`);
  }
  return parts.join(", ");
}

export function enPathToLocalized(pathname: string, locale: SiteLocale): string {
  if (locale === "en") {
    return pathname === "/" ? "/" : pathname;
  }
  const p = pathname === "/" ? "" : pathname;
  const to = getSegments(locale);
  const prefix = LOCALE_ROUTE_CONFIG[locale].prefix;
  const mapped = mapSegmentPath(p, EN_SEGMENTS, to);
  if (mapped !== p) {
    return `${prefix}${mapped}`;
  }
  return p ? `${prefix}${p}` : prefix;
}

export function localizedPathToEn(pathname: string, locale: SiteLocale): string {
  if (locale === "en") {
    return pathname === "/" ? "/" : pathname;
  }
  const config = LOCALE_ROUTE_CONFIG[locale];
  const prefix = config.prefix;
  if (pathname === prefix || pathname === `${prefix}/`) {
    return "/";
  }
  if (!pathname.startsWith(prefix)) {
    return pathname;
  }
  const rest = pathname.slice(prefix.length) || "/";
  const from = getSegments(locale);
  const mapped = mapSegmentPath(rest, from, EN_SEGMENTS);
  return mapped || "/";
}

/** @deprecated Use enPathToLocalized(path, "ja") */
export function enPathToJa(pathname: string): string {
  return enPathToLocalized(pathname, "ja");
}

/** @deprecated Use enPathToLocalized(path, "es") */
export function enPathToEs(pathname: string): string {
  return enPathToLocalized(pathname, "es");
}

/** @deprecated Use enPathToLocalized(path, "pt") */
export function enPathToPt(pathname: string): string {
  return enPathToLocalized(pathname, "pt");
}

/** @deprecated Use localizedPathToEn(path, "es") */
export function esPathToEn(pathname: string): string {
  return localizedPathToEn(pathname, "es");
}

/** @deprecated Use localizedPathToEn(path, "pt") */
export function ptPathToEn(pathname: string): string {
  return localizedPathToEn(pathname, "pt");
}

/** @deprecated Use localizedPathToEn(path, "ja") */
export function jaPathToEn(pathname: string): string {
  return localizedPathToEn(pathname, "ja");
}

export function detectLocaleFromPathname(pathname: string): SiteLocale {
  for (const loc of HREFLANG_LOCALES) {
    if (loc === "en") continue;
    const prefix = LOCALE_ROUTE_CONFIG[loc].prefix;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return loc;
    }
  }
  return "en";
}

function isHomePathname(pathname: string): boolean {
  if (pathname === "/") return true;
  return /^\/(es|pt|ja|fr|de|it|ko|ru|zh)$/.test(pathname);
}

function topicsCountriesLinkHeader(pathname: string): string | null {
  const route = parseTopicsCountriesPathname(pathname);
  if (!route) return null;
  return languageAlternatesToLinkHeader(
    buildTopicsCountriesLanguageAlternates(route.kind, route.slug)
  );
}

export function buildHreflangLinkHeader(pathname: string, page?: string): string {
  if (isPaginatedListPage(page)) {
    return "";
  }

  if (isEnOnlyPathname(pathname)) {
    return languageAlternatesToLinkHeader(buildEnOnlyLanguageAlternates(pathname));
  }

  if (isHomePathname(pathname)) {
    return languageAlternatesToLinkHeader(buildHomeLanguageAlternates());
  }

  const topicsCountries = topicsCountriesLinkHeader(pathname);
  if (topicsCountries) {
    return topicsCountries;
  }

  const hub = detectHubFromPathname(pathname);
  if (hub) {
    return languageAlternatesToLinkHeader(buildHubLanguageAlternates(hub));
  }

  const current = detectLocaleFromPathname(pathname);
  const enPath = localizedPathToEn(pathname, current);

  const parts = HREFLANG_LOCALES.map((loc) => {
    const localized = enPathToLocalized(enPath, loc);
    const url = `${SITE}${localized === "/" ? "" : localized}`;
    return `<${url}>; rel="alternate"; hreflang="${loc}"`;
  });

  const enUrl = `${SITE}${enPath === "/" ? "" : enPath}`;
  parts.push(`<${enUrl}>; rel="alternate"; hreflang="x-default"`);

  return parts.join(", ");
}
