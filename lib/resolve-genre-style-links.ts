import type { HubRow } from "@/lib/artwork-page-data";
import { getLocaleConfig, getSegments, type SiteLocale } from "@/lib/locale-routes";

type HubLocale = Exclude<SiteLocale, "en">;

/** Genre hub link for an artwork page, from the `genres` row in its page extras. */
export function genreHubLinkFromRow(row: HubRow | null, locale: HubLocale): { href: string; label: string } | null {
  return hubLink(row, locale, "genres");
}

/** Style hub link for an artwork page, from the `styles` row in its page extras. */
export function styleHubLinkFromRow(row: HubRow | null, locale: HubLocale): { href: string; label: string } | null {
  return hubLink(row, locale, "styles");
}

function hubLink(
  row: HubRow | null,
  locale: HubLocale,
  kind: "genres" | "styles"
): { href: string; label: string } | null {
  if (!row) return null;

  const config = getLocaleConfig(locale);
  const prefix = config?.prefix ?? `/${locale}`;
  const slug =
    locale === "es"
      ? row.slug_es?.trim() || row.slug
      : locale === "pt"
        ? row.slug_pt?.trim() || row.slug
        : row.slug;
  const label =
    locale === "es"
      ? row.name_es?.trim() || row.name
      : locale === "pt"
        ? row.name_pt?.trim() || row.name
        : row.name;

  const segment = getSegments(locale)[kind];
  return { href: `${prefix}/${segment}/${slug}`, label };
}
