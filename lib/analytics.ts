/** One GA4 e-commerce item (used by `purchase`). */
export type TrackItem = { item_id: string; item_name: string; price: number; quantity: number };

/**
 * Event parameters: flat key → primitive, plus the standard `items` array GA4's
 * e-commerce reports read from `purchase`. Nothing else may be nested.
 */
type TrackProps = Record<string, string | number | boolean | null | TrackItem[]>;

/** localStorage key shared by the cookie banner (MicrosoftUet) and GA4 consent. */
export const AD_CONSENT_KEY = "faf-ad-consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** GA4 event names: letters/digits/underscores, max 40 chars, must start with a letter. */
function gaEventName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return /^[A-Za-z]/.test(cleaned) ? cleaned : `e_${cleaned}`.slice(0, 40);
}

/**
 * Custom-event sink: GA4 only (Vercel Analytics was removed with the move to
 * Cloudflare, 21 Sep 2026). A no-op until GoogleAnalytics has mounted gtag.
 */
export function track(name: string, props?: TrackProps): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", gaEventName(name), props ?? {});
  }
}
