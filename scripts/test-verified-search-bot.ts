/**
 * Unit tests for search-crawler verification + rate-limit exemption path.
 * Run: npx tsx scripts/test-verified-search-bot.ts
 */

import {
  RATE_LIMIT_CONFIG,
  _forceRateLimitedForTests,
  _resetRateLimitStoreForTests,
  shouldRateLimit,
} from "../lib/rate-limit";
import {
  _resetVerificationCachesForTests,
  _setGooglePrefixesForTests,
  claimsSearchBot,
  ipInGooglebotRanges,
  ipv4InCidr,
  isVerifiedSearchCrawler,
} from "../lib/verified-search-bot";

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function run() {
  console.log("\n=== verified-search-bot unit tests ===\n");

  _resetVerificationCachesForTests();
  _setGooglePrefixesForTests({ ipv4: ["66.249.64.0/27"], ipv6: [] });

  assert("claimsSearchBot detects Googlebot", claimsSearchBot("Mozilla (compatible; Googlebot/2.1)") === "google");
  assert(
    "claimsSearchBot detects Googlebot-Image",
    claimsSearchBot("Googlebot-Image/1.0") === "google"
  );
  assert("claimsSearchBot detects Bingbot", claimsSearchBot("Mozilla (compatible; bingbot/2.0)") === "bing");
  assert("claimsSearchBot rejects spoof without bot token", claimsSearchBot("Mozilla/5.0 Chrome/120") === null);

  assert("ipv4InCidr matches Google range", ipv4InCidr("66.249.64.10", "66.249.64.0/27"));
  assert("ipv4InCidr rejects non-Google IP", !ipv4InCidr("203.0.113.50", "66.249.64.0/27"));
  assert(
    "ipInGooglebotRanges accepts known crawler IP",
    ipInGooglebotRanges("66.249.64.10", { ipv4: ["66.249.64.0/27"], ipv6: [] })
  );

  _resetVerificationCachesForTests();
  _setGooglePrefixesForTests({ ipv4: ["66.249.64.0/27"], ipv6: [] });

  const googleIp = "66.249.64.10";
  const fakeIp = "203.0.113.50";

  assert(
    "verified: Google IP exempt (no UA required)",
    await isVerifiedSearchCrawler(googleIp, "Mozilla/5.0")
  );
  assert(
    "not verified: Googlebot UA from non-Google IP",
    !(await isVerifiedSearchCrawler(fakeIp, "Mozilla (compatible; Googlebot/2.1)"))
  );

  _resetRateLimitStoreForTests();
  _resetVerificationCachesForTests();
  _setGooglePrefixesForTests({ ipv4: ["66.249.64.0/27"], ipv6: [] });
  _forceRateLimitedForTests(fakeIp);

  assert(
    "rate limit: spoofed Googlebot UA on non-Google IP gets 429",
    await shouldRateLimit(fakeIp, "Mozilla (compatible; Googlebot/2.1)")
  );
  assert(
    "rate limit: verified Google IP bypasses 429",
    !(await shouldRateLimit(googleIp, "Mozilla (compatible; Googlebot/2.1)"))
  );

  console.log(`\n=== thresholds ===`);
  console.log(`  previous: ${RATE_LIMIT_CONFIG.previousMax} req / ${RATE_LIMIT_CONFIG.windowMs / 1000}s per IP`);
  console.log(`  current:  ${RATE_LIMIT_CONFIG.max} req / ${RATE_LIMIT_CONFIG.windowMs / 1000}s per IP`);
  console.log(`  location: middleware.ts → lib/rate-limit.ts (in-memory Map, per IP)`);
  console.log(`  exemption: lib/verified-search-bot.ts (Google IP ranges + Bing rDNS)`);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
