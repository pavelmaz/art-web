/** Localization for the curated-set hubs (/prints, /book-illustrations) and
 *  their collection detail pages. Collection NAMES stay in their original
 *  language (they are museum series titles); only the chrome + artwork titles
 *  localize. */

import { absoluteUrl } from "./utils";
import type { SiteLocale } from "./locale-routes";
import type { CollectionHubKey } from "./print-collections";

export const HUB_LOCALES: SiteLocale[] = ["en", "es", "pt", "fr", "de", "it", "ja", "ko", "ru", "zh"];

/** URL path for a hub within a locale (English segment under the locale prefix). */
export function hubBasePath(hub: CollectionHubKey, locale: SiteLocale): string {
  const seg = hub === "print" ? "prints" : "book-illustrations";
  return locale === "en" ? `/${seg}` : `/${locale}/${seg}`;
}

/** Localized artwork-title column (shared with the commercial-use landing). */
const TITLE_COL: Record<SiteLocale, string> = {
  en: "title", es: "title_sp", pt: "title_pt", fr: "title_fr", de: "title_ger",
  it: "title_it", ja: "title_jp", ko: "title_ko", ru: "title_ru", zh: "title_ch",
};
export function hubTitleColumn(locale: SiteLocale): string {
  return TITLE_COL[locale];
}

type HubText = { heading: string; intro: string };
type HubCopy = {
  print: HubText;
  book: HubText;
  /** metaTitle suffix, e.g. "Free High-Resolution Downloads" */
  downloadsTitle: string;
  /** "free to download in high resolution" */
  freeHiRes: string;
  /** "{n} works" with correct grammar for the locale */
  worksCount: (n: number) => string;
  /** " {c} collections, {w} works." trailing sentence on the hub intro */
  collectionsLine: (collections: number, works: number) => string;
  noCollections: string;
};

const en_worksCount = (n: number) => `${n} ${n === 1 ? "work" : "works"}`;

export const HUB_COPY: Record<SiteLocale, HubCopy> = {
  en: {
    print: { heading: "Prints & wall charts", intro: "Published print series and the educational charts that once hung in classrooms — etchings, engravings, maps and school posters, scanned at full size and free to download." },
    book: { heading: "Book illustrations", intro: "Complete plate series from illustrated books and artist portfolios, scanned at full size and free to download." },
    downloadsTitle: "Free High-Resolution Downloads",
    freeHiRes: "free to download in high resolution",
    worksCount: en_worksCount,
    collectionsLine: (c, w) => ` ${c} collections, ${w} works.`,
    noCollections: "No collections yet.",
  },
  es: {
    print: { heading: "Grabados y láminas murales", intro: "Series de grabados publicadas y las láminas educativas que antes colgaban en las aulas — aguafuertes, grabados, mapas y pósters escolares, escaneados a tamaño completo y gratis para descargar." },
    book: { heading: "Ilustraciones de libros", intro: "Series completas de láminas de libros ilustrados y portafolios de artistas, escaneadas a tamaño completo y gratis para descargar." },
    downloadsTitle: "Descargas Gratis en Alta Resolución",
    freeHiRes: "gratis para descargar en alta resolución",
    worksCount: (n) => `${n} ${n === 1 ? "obra" : "obras"}`,
    collectionsLine: (c, w) => ` ${c} colecciones, ${w} obras.`,
    noCollections: "Aún no hay colecciones.",
  },
  pt: {
    print: { heading: "Gravuras e mapas de parede", intro: "Séries de gravuras publicadas e os mapas educativos que antes decoravam as salas de aula — água-fortes, gravuras, mapas e cartazes escolares, digitalizados em tamanho completo e grátis para baixar." },
    book: { heading: "Ilustrações de livros", intro: "Séries completas de pranchas de livros ilustrados e portfólios de artistas, digitalizadas em tamanho completo e grátis para baixar." },
    downloadsTitle: "Downloads Grátis em Alta Resolução",
    freeHiRes: "grátis para baixar em alta resolução",
    worksCount: (n) => `${n} ${n === 1 ? "obra" : "obras"}`,
    collectionsLine: (c, w) => ` ${c} coleções, ${w} obras.`,
    noCollections: "Ainda não há coleções.",
  },
  fr: {
    print: { heading: "Estampes et cartes murales", intro: "Séries d'estampes publiées et les planches éducatives qui ornaient jadis les salles de classe — eaux-fortes, gravures, cartes et affiches scolaires, numérisées en pleine taille et gratuites à télécharger." },
    book: { heading: "Illustrations de livres", intro: "Séries complètes de planches de livres illustrés et de portfolios d'artistes, numérisées en pleine taille et gratuites à télécharger." },
    downloadsTitle: "Téléchargements Gratuits en Haute Résolution",
    freeHiRes: "gratuit à télécharger en haute résolution",
    worksCount: (n) => `${n} ${n === 1 ? "œuvre" : "œuvres"}`,
    collectionsLine: (c, w) => ` ${c} collections, ${w} œuvres.`,
    noCollections: "Aucune collection pour l'instant.",
  },
  de: {
    print: { heading: "Drucke & Wandkarten", intro: "Veröffentlichte Druckserien und die Lehrtafeln, die einst in Klassenzimmern hingen — Radierungen, Stiche, Karten und Schulplakate, in voller Größe gescannt und kostenlos zum Download." },
    book: { heading: "Buchillustrationen", intro: "Vollständige Tafelserien aus illustrierten Büchern und Künstlermappen, in voller Größe gescannt und kostenlos zum Download." },
    downloadsTitle: "Kostenlose Downloads in Hoher Auflösung",
    freeHiRes: "kostenlos in hoher Auflösung herunterladbar",
    worksCount: (n) => `${n} ${n === 1 ? "Werk" : "Werke"}`,
    collectionsLine: (c, w) => ` ${c} Sammlungen, ${w} Werke.`,
    noCollections: "Noch keine Sammlungen.",
  },
  it: {
    print: { heading: "Stampe e carte murali", intro: "Serie di stampe pubblicate e le tavole didattiche che un tempo ornavano le aule — acqueforti, incisioni, mappe e manifesti scolastici, digitalizzati a grandezza piena e gratis da scaricare." },
    book: { heading: "Illustrazioni di libri", intro: "Serie complete di tavole da libri illustrati e portfolio d'artista, digitalizzate a grandezza piena e gratis da scaricare." },
    downloadsTitle: "Download Gratis in Alta Risoluzione",
    freeHiRes: "gratis da scaricare in alta risoluzione",
    worksCount: (n) => `${n} ${n === 1 ? "opera" : "opere"}`,
    collectionsLine: (c, w) => ` ${c} collezioni, ${w} opere.`,
    noCollections: "Ancora nessuna collezione.",
  },
  ja: {
    print: { heading: "版画・壁掛け図版", intro: "出版された版画シリーズと、かつて教室に掛けられていた教育用図版 — エッチング、エングレービング、地図、学校用ポスターを原寸でスキャンし、無料でダウンロードできます。" },
    book: { heading: "書籍の挿絵", intro: "挿絵本や画家のポートフォリオの完全な図版シリーズを、原寸でスキャンし、無料でダウンロードできます。" },
    downloadsTitle: "高解像度で無料ダウンロード",
    freeHiRes: "高解像度で無料ダウンロード可能",
    worksCount: (n) => `${n}点`,
    collectionsLine: (c, w) => ` ${c}コレクション、${w}点。`,
    noCollections: "まだコレクションはありません。",
  },
  ko: {
    print: { heading: "판화 & 벽걸이 도판", intro: "출판된 판화 시리즈와 한때 교실에 걸려 있던 교육용 도판 — 에칭, 판화, 지도, 학교 포스터를 원본 크기로 스캔하여 무료로 다운로드할 수 있습니다." },
    book: { heading: "책 삽화", intro: "삽화책과 화가 포트폴리오의 완전한 도판 시리즈를 원본 크기로 스캔하여 무료로 다운로드할 수 있습니다." },
    downloadsTitle: "고해상도 무료 다운로드",
    freeHiRes: "고해상도로 무료 다운로드 가능",
    worksCount: (n) => `${n}점`,
    collectionsLine: (c, w) => ` ${c}개 컬렉션, ${w}점.`,
    noCollections: "아직 컬렉션이 없습니다.",
  },
  ru: {
    print: { heading: "Гравюры и настенные карты", intro: "Опубликованные серии гравюр и учебные таблицы, что когда-то висели в классах — офорты, гравюры, карты и школьные плакаты, отсканированные в полном размере и бесплатные для скачивания." },
    book: { heading: "Книжные иллюстрации", intro: "Полные серии листов из иллюстрированных книг и художественных портфолио, отсканированные в полном размере и бесплатные для скачивания." },
    downloadsTitle: "Бесплатные Загрузки в Высоком Разрешении",
    freeHiRes: "бесплатно скачать в высоком разрешении",
    worksCount: (n) => `${n} ${ruPlural(n, "работа", "работы", "работ")}`,
    collectionsLine: (c, w) => ` ${c} ${ruPlural(c, "коллекция", "коллекции", "коллекций")}, ${w} ${ruPlural(w, "работа", "работы", "работ")}.`,
    noCollections: "Пока нет коллекций.",
  },
  zh: {
    print: { heading: "版画与挂图", intro: "已出版的版画系列，以及曾经挂在教室里的教学挂图——蚀刻、雕版、地图与学校海报，按原尺寸扫描，免费下载。" },
    book: { heading: "书籍插图", intro: "来自插图书籍与艺术家作品集的完整图版系列，按原尺寸扫描，免费下载。" },
    downloadsTitle: "高清免费下载",
    freeHiRes: "免费高清下载",
    worksCount: (n) => `${n} 件作品`,
    collectionsLine: (c, w) => ` ${c} 个合集，${w} 件作品。`,
    noCollections: "暂无合集。",
  },
};

/** Russian count pluralization (1 / 2-4 / 5+). */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/** hreflang alternates for a hub landing across all locales. */
export function hubAlternates(hub: CollectionHubKey, locale: SiteLocale) {
  const languages: Record<string, string> = {};
  for (const loc of HUB_LOCALES) languages[loc] = absoluteUrl(hubBasePath(hub, loc));
  languages["x-default"] = absoluteUrl(hubBasePath(hub, "en"));
  return { canonical: absoluteUrl(hubBasePath(hub, locale)), languages };
}

/** hreflang alternates for one collection page across all locales. */
export function collectionAlternates(hub: CollectionHubKey, slug: string, locale: SiteLocale) {
  const languages: Record<string, string> = {};
  for (const loc of HUB_LOCALES) languages[loc] = absoluteUrl(`${hubBasePath(hub, loc)}/${slug}`);
  languages["x-default"] = absoluteUrl(`${hubBasePath(hub, "en")}/${slug}`);
  return { canonical: absoluteUrl(`${hubBasePath(hub, locale)}/${slug}`), languages };
}
