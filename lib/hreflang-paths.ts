import {
  HREFLANG_LOCALES,
  LOCALE_ROUTE_CONFIG,
  getSegments,
  type LocaleSegments,
  type SiteLocale,
} from "@/lib/locale-routes";

const EN_SEGMENTS: LocaleSegments = {
  artworks: "artworks",
  artists: "artists",
  museums: "museums",
  genres: "genres",
  styles: "styles",
  search: "search",
};

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

export function buildHreflangLinkHeader(pathname: string): string {
  const site = "https://fineartfree.com";
  const current = detectLocaleFromPathname(pathname);
  const enPath = localizedPathToEn(pathname, current);

  const parts = HREFLANG_LOCALES.map((loc) => {
    const localized = enPathToLocalized(enPath, loc);
    const url = `${site}${localized === "/" ? "" : localized}`;
    return `<${url}>; rel="alternate"; hreflang="${loc}"`;
  });

  const enUrl = `${site}${enPath === "/" ? "" : enPath}`;
  parts.push(`<${enUrl}>; rel="alternate"; hreflang="x-default"`);

  return parts.join(", ");
}
