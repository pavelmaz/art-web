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
    dataLayer?: unknown[];
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
 * Cloudflare, 21 Sep 2026).
 *
 * Pushes straight to `window.dataLayer` instead of calling `window.gtag(...)`
 * directly. `gtag()` itself is nothing but `dataLayer.push(arguments)` — the
 * real gtag.js library (loaded async via next/script) drains that array
 * whenever it finishes loading, in order, no matter when the entries were
 * pushed. Calling through `window.gtag` required that shim to already be
 * defined; since GoogleAnalytics mounts it via a separate `afterInteractive`
 * script, a component whose effect fires very early on page mount (e.g.
 * ProPurchaseTracking on /fineart-pro/success, right after a redirect) could
 * race ahead of it and silently drop the event — no error, no retry, and
 * ProPurchaseTracking's own sessionStorage de-dupe flag then blocked any
 * later attempt. Pushing to dataLayer directly needs nothing to be loaded
 * yet, so the race is gone. Found 24 Sep 2026: two real Fine Art Pro
 * purchases never appeared as GA4 `purchase` events.
 */
export function track(name: string, props?: TrackProps): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(["event", gaEventName(name), props ?? {}]);
}
