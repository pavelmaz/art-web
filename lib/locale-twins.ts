import { COMMERCIAL_USE_PATHS } from "@/lib/commercial-use-landing";
import {
  detectLocaleFromPathname,
  enPathToLocalized,
  localizedPathToEn,
} from "@/lib/hreflang-paths";
import type { SiteLocale } from "@/lib/locale-routes";

/** Locales a visitor can be pointed to. "zh" is deliberately offline (403), so never it. */
export const SWITCHABLE_LOCALES: SiteLocale[] = ["en", "es", "pt", "fr", "de", "it", "ja", "ko", "ru"];

export const LOCALE_NATIVE_NAMES: Record<SiteLocale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  ru: "Русский",
  zh: "中文",
};

/** English sections that exist, with the same slugs, in every locale. */
const TWIN_SECTIONS = new Set(["artworks", "artists", "museums", "genres", "styles", "search"]);

/**
 * The same page in another locale, or null when that locale has no twin
 * (English-only pages such as /blog, /account, /login, /prints…). Conservative
 * on purpose: only the homepage, the catalogue sections and the commercial-use
 * landing, so a language link never leads to a 404.
 */
export function localeTwinPath(pathname: string, locale: SiteLocale): string | null {
  if (!SWITCHABLE_LOCALES.includes(locale)) return null;
  const here = detectLocaleFromPathname(pathname);
  if (here === locale) return pathname;

  const commercial = (Object.entries(COMMERCIAL_USE_PATHS) as [SiteLocale, string][]).find(
    ([, path]) => path === pathname
  );
  if (commercial) {
    return COMMERCIAL_USE_PATHS[locale] ?? null;
  }

  const enPath = localizedPathToEn(pathname, here);
  if (enPath === "/") return enPathToLocalized("/", locale);
  const section = enPath.split("/")[1] ?? "";
  if (!TWIN_SECTIONS.has(section)) return null;
  return enPathToLocalized(enPath, locale);
}

/** First supported locale in the browser's language list, or null. */
export function pickBrowserLocale(languages: readonly string[]): SiteLocale | null {
  for (const tag of languages) {
    const primary = tag.toLowerCase().split("-")[0] as SiteLocale;
    if (SWITCHABLE_LOCALES.includes(primary)) return primary;
  }
  return null;
}
