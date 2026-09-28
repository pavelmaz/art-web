import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

/**
 * ~500k artwork/artist pages are on-demand ISR (revalidate = 86400) with no
 * build-time prerender, so the incremental cache is the hot path:
 * - R2 holds the cache; the regional wrapper re-uses ISR responses for up to
 *   30 min at the edge before re-checking R2.
 * - doQueue performs time-based revalidations; the D1 tag cache backs
 *   revalidatePath (app/api/revalidate) and the browse-page cache tags.
 * - enableCacheInterception serves cached ISR pages without invoking Next at
 *   all (no PPR in this app, so it's safe).
 */
export default defineCloudflareConfig({
  // shouldLazilyUpdateOnCacheHit defaults to TRUE on Next 16, i.e. every regional
  // hit still re-reads the entry from R2 in the background: 2-2.5 R2 reads per
  // page view (26 Sep 2026). Off, a regional copy is reused for 3 h; forced
  // refreshes (revalidatePath) still bypass it through the tag check.
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    mode: "long-lived",
    shouldLazilyUpdateOnCacheHit: false,
    defaultLongLivedTtlSec: 3 * 3600,
  }),
  queue: doQueue,
  // D1 (28 Sep 2026): one small query per uncached page view, inside the Workers
  // Paid D1 allowance. The sharded Durable Object it replaces made 1.5–3.3M
  // billed calls a day (~$10/month) because bots mostly open pages nobody opened
  // before, so its 60 s regional cache rarely helped. Table: `revalidations`,
  // created by the deploy command (populate-cache).
  tagCache: d1NextTagCache,
  enableCacheInterception: true,
});
