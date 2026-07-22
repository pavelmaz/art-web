import type { Metadata } from "next";

import {
  isPaginatedListPage,
  listPageCanonical,
  paginatedAlternates,
} from "@/lib/list-page-metadata";

const SITE = "https://fineartfree.com";

export type TopicsCountriesKind = "topics" | "countries";

/** Locales where topics/countries routes exist and return 200. */
export const TOPICS_COUNTRIES_LOCALES = ["en", "es", "pt", "ja"] as const;

export type TopicsCountriesRoute =
  | { kind: TopicsCountriesKind; slug?: string }
  | null;

function topicsPath(locale: (typeof TOPICS_COUNTRIES_LOCALES)[number], slug?: string): string {
  const encoded = slug ? `/${encodeURIComponent(decodeURIComponent(slug))}` : "";
  switch (locale) {
    case "en":
      return slug ? `/topics${encoded}` : "/topics";
    case "es":
      return slug ? `/es/temas${encoded}` : "/es/temas";
    case "pt":
      return slug ? `/pt/temas${encoded}` : "/pt/temas";
    case "ja":
      return slug ? `/ja/topics${encoded}` : "/ja/topics";
    default:
      return "";
  }
}

function countriesPath(locale: (typeof TOPICS_COUNTRIES_LOCALES)[number], slug?: string): string {
  const encoded = slug ? `/${encodeURIComponent(decodeURIComponent(slug))}` : "";
  switch (locale) {
    case "en":
      return slug ? `/countries${encoded}` : "/countries";
    case "es":
      return slug ? `/es/paises${encoded}` : "/es/paises";
    case "pt":
      return slug ? `/pt/paises${encoded}` : "/pt/paises";
    case "ja":
      return slug ? `/ja/countries${encoded}` : "/ja/countries";
    default:
      return "";
  }
}

export function buildTopicsCountriesLanguageAlternates(
  kind: TopicsCountriesKind,
  slug?: string
): Record<string, string> {
  const pathFn = kind === "topics" ? topicsPath : countriesPath;
  const out: Record<string, string> = {};
  for (const loc of TOPICS_COUNTRIES_LOCALES) {
    out[loc] = `${SITE}${pathFn(loc, slug)}`;
  }
  out["x-default"] = out.en;
  return out;
}

export function parseTopicsCountriesPathname(pathname: string): TopicsCountriesRoute {
  const decodeSlug = (raw: string) => decodeURIComponent(raw);

  if (pathname === "/topics") return { kind: "topics" };
  if (pathname.startsWith("/topics/")) {
    return { kind: "topics", slug: decodeSlug(pathname.slice("/topics/".length)) };
  }
  if (pathname === "/countries") return { kind: "countries" };
  if (pathname.startsWith("/countries/")) {
    return { kind: "countries", slug: decodeSlug(pathname.slice("/countries/".length)) };
  }
  if (pathname === "/es/temas") return { kind: "topics" };
  if (pathname.startsWith("/es/temas/")) {
    return { kind: "topics", slug: decodeSlug(pathname.slice("/es/temas/".length)) };
  }
  if (pathname === "/pt/temas") return { kind: "topics" };
  if (pathname.startsWith("/pt/temas/")) {
    return { kind: "topics", slug: decodeSlug(pathname.slice("/pt/temas/".length)) };
  }
  if (pathname === "/ja/topics") return { kind: "topics" };
  if (pathname.startsWith("/ja/topics/")) {
    return { kind: "topics", slug: decodeSlug(pathname.slice("/ja/topics/".length)) };
  }
  if (pathname === "/es/paises") return { kind: "countries" };
  if (pathname.startsWith("/es/paises/")) {
    return { kind: "countries", slug: decodeSlug(pathname.slice("/es/paises/".length)) };
  }
  if (pathname === "/pt/paises") return { kind: "countries" };
  if (pathname.startsWith("/pt/paises/")) {
    return { kind: "countries", slug: decodeSlug(pathname.slice("/pt/paises/".length)) };
  }
  if (pathname === "/ja/countries") return { kind: "countries" };
  if (pathname.startsWith("/ja/countries/")) {
    return { kind: "countries", slug: decodeSlug(pathname.slice("/ja/countries/".length)) };
  }

  return null;
}

export function topicsCountriesPageMetadata(input: {
  canonicalPath: string;
  kind: TopicsCountriesKind;
  slug?: string;
  title: Metadata["title"];
  description: string;
  page?: string;
  openGraph?: Metadata["openGraph"];
}): Metadata {
  return {
    title: { absolute: input.title as string },
    description: input.description,
    alternates: paginatedAlternates(
      input.canonicalPath,
      input.page,
      isPaginatedListPage(input.page)
        ? undefined
        : buildTopicsCountriesLanguageAlternates(input.kind, input.slug)
    ),
    openGraph: input.openGraph,
  };
}

/** Canonical path for current locale (for detail/hub pages). */
export function topicsCountriesCanonicalPath(
  kind: TopicsCountriesKind,
  locale: "en" | "es" | "pt" | "ja",
  slug?: string
): string {
  const fn = kind === "topics" ? topicsPath : countriesPath;
  return fn(locale, slug);
}

export function topicsCountriesCanonicalUrl(
  kind: TopicsCountriesKind,
  locale: "en" | "es" | "pt" | "ja",
  slug?: string,
  page?: string
): string {
  return listPageCanonical(topicsCountriesCanonicalPath(kind, locale, slug), page);
}
