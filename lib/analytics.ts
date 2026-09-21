import { track as vercelTrack } from "@vercel/analytics";

type TrackProps = NonNullable<Parameters<typeof vercelTrack>[1]>;

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
 * Custom-event fan-out: Vercel Analytics (still mounted while the site is on
 * Vercel) and GA4 (its replacement after the Cloudflare move). Remove the
 * Vercel call once the site is off Vercel.
 */
export function track(name: string, props?: TrackProps): void {
  vercelTrack(name, props);
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", gaEventName(name), props ?? {});
  }
}
