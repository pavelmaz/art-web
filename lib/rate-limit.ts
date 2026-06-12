import { isVerifiedSearchCrawler } from "@/lib/verified-search-bot";

/** Fixed-window counter per client IP (in-memory, per edge instance). */
const RATE_LIMIT_MAX = 200;
export const RATE_LIMIT_WINDOW_MS = 60_000;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

/** Returns true when the request should receive HTTP 429. */
export async function shouldRateLimit(ip: string, userAgent: string): Promise<boolean> {
  if (ip === "unknown") return false;
  if (await isVerifiedSearchCrawler(ip, userAgent)) return false;
  return isRateLimited(ip);
}

export function retryAfterSeconds(): string {
  return String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
}

/** @internal Test helper — reset in-memory counters. */
export function _resetRateLimitStoreForTests(): void {
  rateLimitStore.clear();
}

/** @internal Test helper — force-limit an IP without burning the full burst budget. */
export function _forceRateLimitedForTests(ip: string): void {
  rateLimitStore.set(ip, { count: RATE_LIMIT_MAX + 1, resetAt: Date.now() + RATE_LIMIT_WINDOW_MS });
}

export const RATE_LIMIT_CONFIG = {
  max: RATE_LIMIT_MAX,
  windowMs: RATE_LIMIT_WINDOW_MS,
  previousMax: 45,
} as const;
