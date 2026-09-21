import type { SiteLocale } from "@/lib/locale-routes";

const LOCALE_SEGMENTS = new Set<SiteLocale>(["es", "pt", "fr", "de", "it", "ja", "ko", "ru", "zh"]);

/** Site locale from a URL path's first segment ("/es/obras/x" → "es"; anything else → "en"). */
export function localeFromPathname(pathname: string | null | undefined): SiteLocale {
  const segment = (pathname ?? "").split("/")[1] as SiteLocale;
  return LOCALE_SEGMENTS.has(segment) ? segment : "en";
}
