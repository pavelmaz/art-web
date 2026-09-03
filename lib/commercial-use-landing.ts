/** Registry + shared types for the "public domain images for commercial use"
 *  landing page, localized per site locale. One page per language, each on its
 *  own researched-keyword URL, cross-linked via hreflang. */

import { absoluteUrl } from "./utils";
import type { SiteLocale } from "./locale-routes";

/** Public path (with locale prefix) for each locale's landing page.
 *  Latin-script locales use the native keyword in the slug; CJK/Cyrillic
 *  locales keep the site's ASCII URL scheme (the keyword lives in the H1/meta,
 *  which is what ranks). */
export const COMMERCIAL_USE_PATHS: Record<SiteLocale, string> = {
  en: "/public-domain-images-for-commercial-use",
  es: "/es/imagenes-de-dominio-publico-para-uso-comercial",
  pt: "/pt/imagens-de-dominio-publico-para-uso-comercial",
  fr: "/fr/images-libres-de-droits-usage-commercial",
  de: "/de/gemeinfreie-bilder-kommerzielle-nutzung",
  it: "/it/immagini-di-pubblico-dominio-per-uso-commerciale",
  ja: "/ja/public-domain-images-for-commercial-use",
  ko: "/ko/public-domain-images-for-commercial-use",
  ru: "/ru/public-domain-images-for-commercial-use",
  zh: "/zh/public-domain-images-for-commercial-use",
};

/** Localized footer link label for the landing page. */
export const COMMERCIAL_USE_FOOTER_LABEL: Record<SiteLocale, string> = {
  en: "Commercial Use",
  es: "Uso comercial",
  pt: "Uso comercial",
  fr: "Usage commercial",
  de: "Kommerzielle Nutzung",
  it: "Uso commerciale",
  ja: "商用利用",
  ko: "상업적 이용",
  ru: "Коммерческое использование",
  zh: "商用授权",
};

/** Localized artwork-title column per locale (for the featured strip). */
export const TITLE_COLUMN: Record<SiteLocale, string> = {
  en: "title",
  es: "title_sp",
  pt: "title_pt",
  fr: "title_fr",
  de: "title_ger",
  it: "title_it",
  ja: "title_jp",
  ko: "title_ko",
  ru: "title_ru",
  zh: "title_ch",
};

/** canonical + full hreflang alternates for a given locale's landing page. */
export function buildCommercialUseAlternates(locale: SiteLocale): {
  canonical: string;
  languages: Record<string, string>;
} {
  const languages: Record<string, string> = {};
  for (const loc of Object.keys(COMMERCIAL_USE_PATHS) as SiteLocale[]) {
    languages[loc] = absoluteUrl(COMMERCIAL_USE_PATHS[loc]);
  }
  languages["x-default"] = absoluteUrl(COMMERCIAL_USE_PATHS.en);
  return { canonical: absoluteUrl(COMMERCIAL_USE_PATHS[locale]), languages };
}

/** All translatable copy for one localized landing page. */
export type CommercialUseCopy = {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  subhead: string;
  /** exactly 4: Public Domain · Commercial Use · No Attribution · High Resolution */
  badges: [string, string, string, string];
  searchPlaceholder: string;
  searchAria: string;
  searchButtonAria: string;
  popularLabel: string;
  /** exactly 4 labels: van gogh · monet water lilies · botanical prints · japanese woodblock */
  popular: [string, string, string, string];
  useCasesH2: string;
  /** exactly 6 */
  useCases: { title: string; text: string }[];
  downloadH2: string;
  downloadP: string;
  featuredH2: string;
  browseAllCta: string;
  printH2: string;
  printP: string;
  whyH2: string;
  whyP1: string;
  whyP2: string;
  statK1: string;
  statK1Sub: string;
  statK2: string;
  statK2Sub: string;
  statK3: string;
  statK3Sub: string;
  categoriesH2: string;
  /** exactly 6: botanical · art-nouveau · ukiyo-e · landscape · still-life · portrait */
  categoryLabels: [string, string, string, string, string, string];
  closingP: string;
  faqH2: string;
  /** exactly 5 */
  faq: { q: string; a: string }[];
  ctaH: string;
  ctaSub: string;
  ctaBrowse: string;
  ctaPro: string;
  unknownArtist: string;
  /** connector for the image alt, e.g. " by " (en), " de " (es/pt), " di " (it) */
  altConnector: string;
  proHeroAlt: string;
};
