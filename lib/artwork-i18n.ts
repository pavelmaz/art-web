// Localized display helpers for artwork metadata that isn't per-row translated.
// - MEDIUM_I18N: the ~20 mediums that cover ~98% of the catalogue (rest falls back
//   to English). Titles are per-row (title_<locale> columns); these are shared vocab.
// - localizeAltText: builds the image alt in-language (title is already localized on
//   the row; here we localize the connective, medium, and "public domain").

export type ArtworkLocale = "es" | "pt" | "fr" | "de" | "it" | "ja" | "ko" | "ru" | "zh";

type Nine = Record<ArtworkLocale, string>;

// locale -> per-locale title column on `artworks`. Add `TITLE_COL[locale]` to a
// grid query's select, then map the card title through localizeRowTitle().
export const TITLE_COL: Nine = {
  es: "title_sp", pt: "title_pt", fr: "title_fr", de: "title_ger", it: "title_it",
  ja: "title_jp", ko: "title_ko", ru: "title_ru", zh: "title_ch",
};

/** Localized card title for a raw artworks row: title_<locale> if present, else the English title. */
export function localizeRowTitle(row: Record<string, unknown>, locale: ArtworkLocale): string {
  const loc = row[TITLE_COL[locale]];
  return typeof loc === "string" && loc.trim() ? loc : ((row.title as string) ?? "");
}

// "by <artist>" connective. Empty string = list the artist with no prefix (CJK/RU read
// more naturally that way in a comma list).
const BY: Nine = { es: "de", pt: "de", fr: "par", de: "von", it: "di", ja: "", ko: "", ru: "", zh: "" };

const PUBLIC_DOMAIN: Nine = {
  es: "dominio público", pt: "domínio público", fr: "domaine public", de: "gemeinfrei",
  it: "dominio pubblico", ja: "パブリックドメイン", ko: "퍼블릭 도메인", ru: "общественное достояние", zh: "公有领域",
};

// Keyed by the lowercased English medium_display value.
const MEDIUM_I18N: Record<string, Nine> = {
  "oil on canvas": { es: "óleo sobre lienzo", pt: "óleo sobre tela", fr: "huile sur toile", de: "Öl auf Leinwand", it: "olio su tela", ja: "キャンバスに油彩", ko: "캔버스에 유채", ru: "холст, масло", zh: "布面油画" },
  "oil on panel": { es: "óleo sobre tabla", pt: "óleo sobre painel", fr: "huile sur panneau", de: "Öl auf Holz", it: "olio su tavola", ja: "板に油彩", ko: "패널에 유채", ru: "дерево, масло", zh: "木板油画" },
  "oil on paper": { es: "óleo sobre papel", pt: "óleo sobre papel", fr: "huile sur papier", de: "Öl auf Papier", it: "olio su carta", ja: "紙に油彩", ko: "종이에 유채", ru: "бумага, масло", zh: "纸本油画" },
  "etching": { es: "aguafuerte", pt: "água-forte", fr: "eau-forte", de: "Radierung", it: "acquaforte", ja: "エッチング", ko: "에칭", ru: "офорт", zh: "蚀刻版画" },
  "engraving": { es: "grabado", pt: "gravura", fr: "gravure", de: "Kupferstich", it: "incisione", ja: "彫版画", ko: "판화", ru: "гравюра", zh: "雕版画" },
  "drypoint": { es: "punta seca", pt: "ponta-seca", fr: "pointe sèche", de: "Kaltnadel", it: "puntasecca", ja: "ドライポイント", ko: "드라이포인트", ru: "сухая игла", zh: "干刻法" },
  "watercolor on paper": { es: "acuarela sobre papel", pt: "aquarela sobre papel", fr: "aquarelle sur papier", de: "Aquarell auf Papier", it: "acquerello su carta", ja: "紙に水彩", ko: "종이에 수채", ru: "бумага, акварель", zh: "纸本水彩" },
  "ink on paper": { es: "tinta sobre papel", pt: "tinta sobre papel", fr: "encre sur papier", de: "Tinte auf Papier", it: "inchiostro su carta", ja: "紙に墨", ko: "종이에 먹", ru: "бумага, тушь", zh: "纸本水墨" },
  "ink on silk": { es: "tinta sobre seda", pt: "tinta sobre seda", fr: "encre sur soie", de: "Tinte auf Seide", it: "inchiostro su seta", ja: "絹に墨", ko: "비단에 먹", ru: "шёлк, тушь", zh: "绢本水墨" },
  "pencil on paper": { es: "lápiz sobre papel", pt: "lápis sobre papel", fr: "crayon sur papier", de: "Bleistift auf Papier", it: "matita su carta", ja: "紙に鉛筆", ko: "종이에 연필", ru: "бумага, карандаш", zh: "纸本铅笔画" },
  "tempera on panel": { es: "temple sobre tabla", pt: "têmpera sobre painel", fr: "détrempe sur panneau", de: "Tempera auf Holz", it: "tempera su tavola", ja: "板にテンペラ", ko: "패널에 템페라", ru: "дерево, темпера", zh: "木板蛋彩画" },
  "woodblock print": { es: "grabado en madera", pt: "xilogravura", fr: "estampe sur bois", de: "Holzschnitt", it: "silografia", ja: "木版画", ko: "목판화", ru: "ксилография", zh: "木版画" },
  "lithograph": { es: "litografía", pt: "litografia", fr: "lithographie", de: "Lithografie", it: "litografia", ja: "リトグラフ", ko: "석판화", ru: "литография", zh: "石版画" },
  "albumen print": { es: "copia a la albúmina", pt: "impressão em albumina", fr: "tirage albuminé", de: "Albumin-Abzug", it: "stampa all'albumina", ja: "鶏卵紙", ko: "알부민 인화", ru: "альбуминовый отпечаток", zh: "蛋白印相" },
  "fresco": { es: "fresco", pt: "afresco", fr: "fresque", de: "Fresko", it: "affresco", ja: "フレスコ", ko: "프레스코", ru: "фреска", zh: "湿壁画" },
  "paper": { es: "papel", pt: "papel", fr: "papier", de: "Papier", it: "carta", ja: "紙", ko: "종이", ru: "бумага", zh: "纸" },
  "wood": { es: "madera", pt: "madeira", fr: "bois", de: "Holz", it: "legno", ja: "木", ko: "나무", ru: "дерево", zh: "木" },
  "gold": { es: "oro", pt: "ouro", fr: "or", de: "Gold", it: "oro", ja: "金", ko: "금", ru: "золото", zh: "金" },
  "metal": { es: "metal", pt: "metal", fr: "métal", de: "Metall", it: "metallo", ja: "金属", ko: "금속", ru: "металл", zh: "金属" },
  "silk": { es: "seda", pt: "seda", fr: "soie", de: "Seide", it: "seta", ja: "絹", ko: "비단", ru: "шёлк", zh: "丝绸" },
  "ceramic": { es: "cerámica", pt: "cerâmica", fr: "céramique", de: "Keramik", it: "ceramica", ja: "陶磁器", ko: "도자기", ru: "керамика", zh: "陶瓷" },
  "porcelain": { es: "porcelana", pt: "porcelana", fr: "porcelaine", de: "Porzellan", it: "porcellana", ja: "磁器", ko: "자기", ru: "фарфор", zh: "瓷器" },
  "ivory": { es: "marfil", pt: "marfim", fr: "ivoire", de: "Elfenbein", it: "avorio", ja: "象牙", ko: "상아", ru: "слоновая кость", zh: "象牙" },
  "bronze": { es: "bronce", pt: "bronze", fr: "bronze", de: "Bronze", it: "bronzo", ja: "ブロンズ", ko: "청동", ru: "бронза", zh: "青铜" },
  "linen": { es: "lino", pt: "linho", fr: "lin", de: "Leinen", it: "lino", ja: "亜麻布", ko: "리넨", ru: "лён", zh: "亚麻" },
  "lace": { es: "encaje", pt: "renda", fr: "dentelle", de: "Spitze", it: "pizzo", ja: "レース", ko: "레이스", ru: "кружево", zh: "蕾丝" },
  "textile": { es: "textil", pt: "têxtil", fr: "textile", de: "Textil", it: "tessuto", ja: "織物", ko: "직물", ru: "текстиль", zh: "纺织品" },
  "unknown": { es: "desconocido", pt: "desconhecido", fr: "inconnu", de: "unbekannt", it: "sconosciuto", ja: "不明", ko: "알 수 없음", ru: "неизвестно", zh: "未知" },
};

/** Localize a medium_display value, or return the original if we have no mapping. */
export function localizeMedium(medium: string | null | undefined, locale: ArtworkLocale): string | null {
  if (!medium) return null;
  const row = MEDIUM_I18N[medium.trim().toLowerCase()];
  return row?.[locale] ?? medium;
}

/** In-language image alt text. `artwork.title` is expected to already be localized. */
export function localizeAltText(
  artwork: { title: string | null; date_display: string | null; artist_display: string | null; medium_display: string | null },
  locale: ArtworkLocale
): string {
  const by = BY[locale];
  const parts = [
    artwork.title,
    artwork.date_display,
    artwork.artist_display ? (by ? `${by} ${artwork.artist_display}` : artwork.artist_display) : null,
    localizeMedium(artwork.medium_display, locale),
    PUBLIC_DOMAIN[locale],
  ].filter(Boolean);
  return parts.join(", ");
}
