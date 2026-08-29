/**
 * Display-only local pricing for the Fine Art Pro page.
 *
 * Stripe **Adaptive Pricing** does the authoritative currency conversion +
 * rounding at CHECKOUT; this only shows a matching estimate on the landing page
 * based on the visitor's country (Vercel `x-vercel-ip-country`). Rates are
 * approximate and drift — refresh occasionally. Last set: 2026-08. Unknown or
 * US countries fall back to the original USD copy untouched.
 */

import type { FineArtProCopy } from "./fineart-pro-translations";

// USD → currency. Approximate; the checkout is the source of truth.
const RATES: Record<string, number> = {
  EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.51, NZD: 1.65, CHF: 0.88,
  SEK: 10.5, NOK: 10.7, DKK: 6.9, PLN: 3.9, CZK: 23, HUF: 355, RON: 4.6,
  JPY: 150, KRW: 1350, CNY: 7.1, INR: 84, BRL: 5.1, MXN: 18.5, ZAR: 18,
  SGD: 1.34, HKD: 7.8, AED: 3.67, TRY: 34,
};
const SYMBOL: Record<string, string> = {
  EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", NZD: "NZ$", CHF: "CHF ",
  SEK: "kr ", NOK: "kr ", DKK: "kr ", PLN: "zł ", CZK: "Kč ",
  HUF: "Ft ", RON: "lei ", JPY: "¥", KRW: "₩", CNY: "¥", INR: "₹",
  BRL: "R$", MXN: "MX$", ZAR: "R ", SGD: "S$", HKD: "HK$", AED: "AED ", TRY: "₺",
};
const ZERO_DECIMALS = new Set(["JPY", "KRW", "HUF"]);
const COMMA_LOCALES = new Set(["es", "pt", "fr", "de", "it", "ru"]);

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // Eurozone
  AT: "EUR", BE: "EUR", HR: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR",
  DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR",
  MT: "EUR", NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR",
  // rest
  GB: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD", CH: "CHF", SE: "SEK", NO: "NOK",
  DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", JP: "JPY", KR: "KRW",
  CN: "CNY", IN: "INR", BR: "BRL", MX: "MXN", ZA: "ZAR", SG: "SGD", HK: "HKD",
  AE: "AED", TR: "TRY",
};

/** Currency for a Vercel country code, or null → keep USD copy as-is. */
export function currencyForCountry(country?: string | null): string | null {
  if (!country) return null;
  const cur = COUNTRY_TO_CURRENCY[country.toUpperCase()];
  return cur && RATES[cur] ? cur : null;
}

function fmt(usd: number, cur: string, comma: boolean): string {
  const raw = usd * RATES[cur];
  const dec = ZERO_DECIMALS.has(cur) ? 0 : 2;
  let n = raw.toFixed(dec);
  if (comma && dec > 0) n = n.replace(".", ",");
  return `${SYMBOL[cur] ?? ""}${n}`;
}

/**
 * Swap the USD amounts ($3.75/mo, $9.99/mo, $45/yr) in the localized price
 * strings for the visitor's currency, preserving every locale's period suffix
 * ("/mo", "cada 12 meses", "12か月ごとに", …). Single-pass replace so a converted
 * amount is never re-scanned (e.g. the "45" inside a converted "€3,45"). Also
 * runs over the FAQ answers, where the same amounts appear in the fine print.
 */
export function localizedProCopy(c: FineArtProCopy, cur: string, locale: string): FineArtProCopy {
  const comma = COMMA_LOCALES.has(locale);
  const m375 = fmt(3.75, cur, comma);
  const m999 = fmt(9.99, cur, comma);
  const m45 = fmt(45, cur, comma);
  const swap = (s: string) =>
    s.replace(/\$?\s?(3[.,]75|9[.,]99|45)(\s?USD)?/g, (_m, num: string) =>
      num[0] === "3" ? m375 : num[0] === "9" ? m999 : m45,
    );
  return {
    ...c,
    yearlyPrice: swap(c.yearlyPrice),
    monthlyPrice: swap(c.monthlyPrice),
    yearlyBilling: swap(c.yearlyBilling),
    monthlyBilling: swap(c.monthlyBilling),
    faq: c.faq.map((f) => ({ ...f, answer: swap(f.answer) })),
  };
}
