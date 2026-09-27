import Script from "next/script";

/**
 * Cloudflare Web Analytics beacon (site "fineartfree.com" in the Cloudflare
 * dashboard → Analytics → Web analytics). Installed by hand instead of
 * Cloudflare's "automatic setup" on purpose: automatic injection also put the
 * beacon on Cloudflare's own WAF block / challenge pages, so blocked scrapers
 * (6,980 "visits" from China in one day, a country the WAF blocks outright)
 * were counted as visitors and buried the real traffic. With the snippet only
 * in our HTML, only pages we actually served get counted.
 *
 * Cookieless, no consent needed; the token is public by design.
 */
const CF_BEACON_TOKEN = "b29c5cf3531e41f681ae146e3c0741c9";

export function CloudflareInsights() {
  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })}
      strategy="afterInteractive"
    />
  );
}
