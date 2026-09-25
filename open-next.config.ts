import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

/**
 * ~500k artwork/artist pages are on-demand ISR (revalidate = 86400) with no
 * build-time prerender, so the incremental cache is the hot path:
 * - R2 holds the cache; the regional wrapper re-uses ISR responses for up to
 *   30 min at the edge before re-checking R2.
 * - doQueue performs time-based revalidations; the sharded tag cache backs
 *   revalidatePath (app/api/revalidate) and the browse-page cache tags.
 * - enableCacheInterception serves cached ISR pages without invoking Next at
 *   all (no PPR in this app, so it's safe).
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: doQueue,
  // regionalCache: each region remembers a tag lookup for 60 s instead of asking
  // the Durable Object on every page view (~4 calls per view before, 25 Sep 2026).
  // Cost: revalidatePath/revalidateTag can take up to 60 s to show at the edge.
  tagCache: doShardedTagCache({ baseShardSize: 12, regionalCache: true, regionalCacheTtlSec: 60 }),
  enableCacheInterception: true,
});
