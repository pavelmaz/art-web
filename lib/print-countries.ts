/**
 * Countries framed prints can be delivered to: every destination Prodigi ships
 * all GLOBAL-CFP sizes to (Products API, 28 Sep 2026) that Stripe Checkout can
 * also collect an address for. Russia and Belarus are left out (EU sanctions).
 * Client-safe: the print page's "Deliver to" list and the server's validation
 * both read it.
 */
export const PRINT_COUNTRIES: readonly string[] = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AT", "AU", "AW", "AX", "BA", "BB", "BD",
  "BE", "BF", "BG", "BH", "BI", "BJ", "BM", "BO", "BR", "BS", "BW", "BZ", "CA", "CF", "CG", "CH",
  "CL", "CM", "CN", "CO", "CR", "CV", "CW", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC",
  "EE", "EG", "ER", "ES", "ET", "FI", "FK", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH",
  "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GT", "GU", "GW", "GY", "HK", "HR", "HT", "HU", "ID",
  "IE", "IL", "IM", "IN", "IQ", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KH", "KM", "KN", "KR",
  "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC",
  "MD", "ME", "MF", "MG", "MK", "ML", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NG", "NL", "NO", "NP", "NZ", "OM", "PA", "PE", "PF", "PH", "PK", "PL", "PR",
  "PS", "PT", "PY", "QA", "RO", "RS", "RW", "SA", "SC", "SD", "SE", "SG", "SH", "SI", "SK", "SL",
  "SN", "ST", "SX", "SZ", "TC", "TD", "TG", "TH", "TJ", "TL", "TN", "TR", "TT", "TW", "TZ", "UA",
  "UG", "US", "UY", "VA", "VC", "VE", "VG", "VN", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW",
];

const COUNTRY_SET = new Set(PRINT_COUNTRIES);

export function isPrintCountry(code: unknown): code is string {
  return typeof code === "string" && COUNTRY_SET.has(code);
}

/** English country name, e.g. "US" → "United States". */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Names that read with "the" in a sentence ("delivery to the United States"). */
const WITH_THE = new Set([
  "US", "GB", "NL", "AE", "BS", "CF", "CG", "DO", "FK", "FO", "GM", "IM", "KY", "MV", "PH", "SC", "TC", "VG",
]);

/** Country name for use inside a sentence, e.g. "the United States", "Canada". */
export function countryPhrase(code: string): string {
  return WITH_THE.has(code) ? `the ${countryName(code)}` : countryName(code);
}

/** Business days to print and frame before the parcel leaves the lab. */
export const PRODUCTION_DAYS = 3;

/** Delivery of one print size to one country, as shown on the page and charged at checkout. */
export type PrintShipping = {
  country: string;
  /** Extra shipping charged on top of the print price; 0 = free delivery. */
  surchargeUsd: number;
  /** Country of the Prodigi lab that makes and ships it (they route to the nearest). */
  lab: string;
  /** Business days in transit after production, per Prodigi's published estimates. */
  transitDays: [number, number];
  /** Shipped across a customs border: the recipient may be asked for duties or taxes. */
  dutiesMayApply: boolean;
};

/** Countries whose customs need a tax ID on the parcel (Prodigi support, 28 Sep 2026).
 *  Asked for at checkout and added to the address sent to Prodigi. */
export const CUSTOMS_ID: Record<string, { label: string; optional: boolean }> = {
  BR: { label: "CPF or CNPJ (Brazilian customs)", optional: false },
  MX: { label: "RFC and CURP (Mexican customs)", optional: false },
  ES: { label: "NIF/NIE (Canary Islands only)", optional: true },
};
