import type { PostHogInterface } from "posthog-js";

/**
 * PostHog (EU cloud, project "Default project" in the "fineart" organization).
 *
 * - Cookieless ("always"): nothing is stored in the browser, so no consent is
 *   needed and every visitor is counted. Requires "Cookieless server hash mode"
 *   in the PostHog project settings (enabled 27 Sep 2026) — with it off,
 *   PostHog silently discards every event.
 * - No reverse proxy: events go straight from the browser to PostHog. A proxy
 *   through Next rewrites (what the PostHog wizard sets up) would turn every
 *   event into a billed Cloudflare Worker request.
 * - Loaded lazily, after the page is idle, so the SDK (~60 KB gzipped) never
 *   competes with rendering.
 * - Autocapture is off: page views, page leaves and our own `track()` events
 *   only. It keeps the free quota (1M events/month) for what we read.
 *
 * The project token is public by design (it can only send events).
 */
const POSTHOG_TOKEN = "phc_km4JCPUwndt9sykgrKor9Hiz6Zm38gVFP4sS8Q75mTQs";
const POSTHOG_HOST = "https://eu.i.posthog.com";

type Props = Record<string, unknown>;

let client: PostHogInterface | null = null;
let state: "idle" | "loading" | "off" = "idle";
/** Events fired before the SDK finished loading (a click in the first second). */
const queue: Array<[string, Props | undefined]> = [];

export function initPostHog(): void {
  if (state !== "idle" || typeof window === "undefined") return;
  // Automation (headless scrapers, test runners) announces itself here; keep it
  // out of the numbers and out of the quota.
  if (navigator.webdriver) {
    state = "off";
    return;
  }
  state = "loading";

  const start = () => {
    import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(POSTHOG_TOKEN, {
          api_host: POSTHOG_HOST,
          defaults: "2026-08-30",
          cookieless_mode: "always",
          autocapture: false,
          loaded: (ph) => {
            client = ph;
            for (const [name, props] of queue.splice(0)) ph.capture(name, props);
          },
        });
      })
      .catch(() => {
        state = "off"; // blocked by an ad blocker or offline — analytics must never break the page
      });
  };

  if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 1500);
}

export function capturePostHog(name: string, props?: Props): void {
  if (typeof window === "undefined") return;
  if (client) client.capture(name, props);
  else if (state === "loading" && queue.length < 50) queue.push([name, props]);
}
