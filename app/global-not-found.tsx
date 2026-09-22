import type { Metadata } from "next";
import Link from "next/link";

import { SiteShell } from "@/components/SiteShell";
import { ROOT_METADATA } from "@/lib/root-metadata";

export const metadata: Metadata = {
  ...ROOT_METADATA,
  title: { absolute: "Page not found | Fine Art Free" },
  robots: { index: false, follow: false },
};

/**
 * 404 for URLs that match no route. With a root layout per locale there is no
 * single layout to compose it from, so this renders the full document itself
 * (same shell as every page, English).
 */
export default function GlobalNotFound() {
  return (
    <SiteShell lang="en">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-[#9e9e9e]">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-[#1a1a1a]">This page could not be found</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#6b6b6b]">
          The artwork, artist or page you are looking for does not exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black"
        >
          Back to Fine Art Free
        </Link>
      </main>
    </SiteShell>
  );
}
