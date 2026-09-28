import { unstable_cache } from "next/cache";

import { usWholesaleUsd } from "@/lib/print-catalog";
import { isPrintCountry, type PrintShipping } from "@/lib/print-countries";

/**
 * Worldwide delivery for framed prints. Prodigi makes each order in the lab
 * nearest the customer (US, UK, Netherlands, Australia) and ships to ~200
 * countries. The retail price was built on the US cost (item + US shipping), so:
 *
 * - wherever Prodigi's cost is within ABSORB_USD of the US cost (the UK, the EU,
 *   Australia…), delivery stays free;
 * - elsewhere the difference is charged as shipping, at cost, rounded up to $5 —
 *   the print earns the same as a US sale, and nothing is sold at a loss.
 *
 * Costs come from Prodigi's Quotes API (no order is placed), cached for a week
 * per size and country so a page view rarely reaches Prodigi.
 */

const ABSORB_USD = 15;
const ROUND_TO_USD = 5;
const QUOTE_CACHE_SECONDS = 7 * 24 * 3600;

const EU = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

/** Prodigi's published Standard delivery estimates (support article, 28 Sep 2026). */
function transitDays(lab: string, dest: string): [number, number] {
  if (lab === dest && dest === "US") return [4, 6];
  if (lab === dest && dest === "GB") return [2, 3];
  if (lab === dest && dest === "AU") return [2, 5];
  if (EU.has(lab) && EU.has(dest)) return [5, 7];
  if (lab === "AU" && dest === "NZ") return [7, 10];
  return [10, 15];
}

type Quote = { totalUsd: number; lab: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchQuote(code: string, country: string): Promise<Quote | null> {
  const apiKey = process.env.PRODIGI_API_KEY;
  const apiBase = process.env.PRODIGI_API_BASE;
  if (!apiKey || !apiBase) throw new Error("PRODIGI_API_KEY and PRODIGI_API_BASE are required");

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${apiBase}/quotes`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        shippingMethod: "Standard",
        destinationCountryCode: country,
        currencyCode: "USD",
        // Every frame colour costs the same.
        items: [{ sku: `GLOBAL-CFP-${code}`, copies: 1, attributes: { color: "black" }, assets: [{ printArea: "default" }] }],
      }),
    });
    const text = await res.text();
    // Prodigi allows 30 calls per 30 seconds and answers in plain text when over it.
    if (text.startsWith("API calls quota exceeded")) {
      await sleep(1500 * attempt);
      continue;
    }
    const data = JSON.parse(text);
    const quote = data.quotes?.[0];
    const total = Number(quote?.costSummary?.totalCost?.amount);
    if (!quote || !Number.isFinite(total)) return null; // not deliverable there
    return { totalUsd: total, lab: quote.shipments?.[0]?.fulfillmentLocation?.countryCode ?? "" };
  }
  throw new Error("Prodigi quote rate limit");
}

const cachedQuote = unstable_cache(fetchQuote, ["prodigi-print-quote", "v1"], { revalidate: QUOTE_CACHE_SECONDS });

/** Delivery of a size to a country, or null when it can't be delivered there. */
export async function printShipping(code: string, country: string): Promise<PrintShipping | null> {
  const usCost = usWholesaleUsd(code);
  if (!usCost || !isPrintCountry(country)) return null;

  if (country === "US") {
    return { country, surchargeUsd: 0, lab: "US", transitDays: transitDays("US", "US"), dutiesMayApply: false };
  }

  const quote = await cachedQuote(code, country);
  if (!quote) return null;
  const extra = quote.totalUsd - usCost - ABSORB_USD;
  const surchargeUsd = extra > 0 ? Math.ceil(extra / ROUND_TO_USD) * ROUND_TO_USD : 0;
  const lab = quote.lab || country;
  return {
    country,
    surchargeUsd,
    lab,
    transitDays: transitDays(lab, country),
    dutiesMayApply: !(lab === country || (EU.has(lab) && EU.has(country))),
  };
}
