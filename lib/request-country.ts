import { headers } from "next/headers";

/**
 * Visitor's country code from the hosting edge, or null when unknown.
 *
 * Cloudflare sets `cf-ipcountry` on every proxied request; Vercel sets
 * `x-vercel-ip-country`. Checking both keeps the pricing-page currency estimate
 * working on either host during the migration. (Cloudflare uses "XX"/"T1" for
 * unknown/Tor — `currencyForCountry` already returns null for unmapped codes.)
 */
export async function requestCountry(): Promise<string | null> {
  const h = await headers();
  return h.get("cf-ipcountry") ?? h.get("x-vercel-ip-country");
}
