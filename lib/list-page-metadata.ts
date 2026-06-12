import type { Metadata } from "next";

import { buildHubLanguageAlternates, type LocaleSegments } from "@/lib/locale-routes";

const SITE = "https://fineartfree.com";

export type HubKey = keyof LocaleSegments;

export function parseListPageNumber(page?: string): number {
  const n = parseInt(page ?? "1", 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

export function isPaginatedListPage(page?: string): boolean {
  return parseListPageNumber(page) > 1;
}

/** Canonical for hub/list pages; includes ?page=N when N > 1. */
export function listPageCanonical(pathname: string, page?: string, extraQuery?: Record<string, string>): string {
  const base = pathname.startsWith("http") ? pathname : `${SITE}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  const url = new URL(base);
  const pageNum = parseListPageNumber(page);
  if (pageNum > 1) {
    url.searchParams.set("page", String(pageNum));
  }
  if (extraQuery) {
    for (const [key, value] of Object.entries(extraQuery)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  const out = url.toString();
  if (url.pathname !== "/" && out.endsWith("/")) {
    return out.slice(0, -1);
  }
  return out;
}

/** Page-1 hreflang only; paginated pages get canonical alone (no alternates). */
export function paginatedAlternates(
  pathname: string,
  page: string | undefined,
  languages?: Record<string, string>,
  extraQuery?: Record<string, string>
): NonNullable<Metadata["alternates"]> {
  const canonical = listPageCanonical(pathname, page, extraQuery);
  if (isPaginatedListPage(page)) {
    return { canonical };
  }
  return languages ? { canonical, languages } : { canonical };
}

export function hubListPageMetadata(input: {
  canonicalPath: string;
  hub: HubKey;
  title: Metadata["title"];
  description: string;
  page?: string;
  q?: string;
  openGraph?: Metadata["openGraph"];
}): Metadata {
  const extraQuery = input.q?.trim() ? { q: input.q.trim() } : undefined;
  return {
    title: input.title,
    description: input.description,
    alternates: paginatedAlternates(
      input.canonicalPath,
      input.page,
      buildHubLanguageAlternates(input.hub),
      extraQuery
    ),
    openGraph: input.openGraph,
  };
}
