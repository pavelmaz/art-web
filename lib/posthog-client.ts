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

/**
 * The visitor's country, for the Countries panel. PostHog cannot work it out
 * itself here: the project discards IP addresses and cookieless mode strips
 * them before its GeoIP step, so events arrived with no location at all.
 * Cloudflare already knows the country and serves it from its own edge at
 * /cdn-cgi/trace — not a Worker request, and no IP ever reaches PostHog.
 * The property names are the ones PostHog's own reports read.
 */
async function visitorCountry(): Promise<Props | null> {
  try {
    const res = await fetch("/cdn-cgi/trace", { signal: AbortSignal.timeout(2000) });
    const code = /^loc=([A-Z]{2})$/m.exec(await res.text())?.[1];
    if (!code || code === "XX" || code === "T1") return null; // unknown / Tor
    let name = code;
    try {
      name = new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
    } catch {
      // very old browser — the code alone is enough
    }
    return { $geoip_country_code: code, $geoip_country_name: name };
  } catch {
    return null;
  }
}

/**
 * Signed-in visitors: every later event carries their email and whether they are
 * Pro, so the dashboard can show who clicked what (Pavel, 28 Sep 2026). Anonymous
 * visitors stay anonymous — cookieless mode has nothing to identify them by.
 * Loaded on demand so the Supabase client never delays the page.
 */
function tagAccount(ph: PostHogInterface): void {
  import("@/lib/use-is-pro")
    .then(({ getAccount }) => getAccount())
    .then((account) =>
      ph.register(
        account
          ? { signed_in: true, pro: account.isPro, user_email: account.email ?? "" }
          : { signed_in: false, pro: false }
      )
    )
    .catch(() => {
      // no account info — events stay anonymous
    });
}

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
    Promise.all([import("posthog-js"), visitorCountry()])
      .then(([{ default: posthog }, country]) => {
        posthog.init(POSTHOG_TOKEN, {
          api_host: POSTHOG_HOST,
          defaults: "2026-08-30",
          cookieless_mode: "always",
          autocapture: false,
          loaded: (ph) => {
            // Registered before the first page view is sent, so every event carries it.
            if (country) ph.register(country);
            client = ph;
            for (const [name, props] of queue.splice(0)) ph.capture(name, props);
            tagAccount(ph);
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
