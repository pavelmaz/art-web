import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * `next/link` with automatic prefetching off. Use this everywhere instead of
 * importing `next/link` directly.
 *
 * On Cloudflare (OpenNext), a page that was re-rendered at runtime (ISR refresh
 * or revalidatePath) is cached without its segment prefetch data, so the cache
 * answers a segment prefetch with the whole page, the client rejects it and
 * prefetches again, ~10 requests a second per open tab for as long as the link
 * is on screen. Each of those runs the Worker, ~4 Durable Object calls and an
 * R2 read (25 Sep 2026: `/` alone took ~200k requests a day this way). Pages
 * still navigate client-side; their data just loads on click.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
