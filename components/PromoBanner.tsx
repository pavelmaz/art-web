"use client";

import Link from "@/components/Link";
import { useState } from "react";

type PromoBannerProps = {
  href: string;
};

/**
 * 21 Sep 2026 — one-off test banner for the "pnHLwbxS" 50%-off-once coupon,
 * mounted only on /blog via app/blog/layout.tsx. Not wired into any locale or
 * translation system on purpose: it's a throwaway test, not a permanent UI
 * element, so it isn't worth the upkeep of localized copy.
 */
export function PromoBanner({ href }: PromoBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    // Sticks directly under the site's own sticky header (73px, measured from
    // .glass-nav) rather than at top-0 — two independent `sticky top-0`
    // siblings can't stack, they overlap once scrolled past the first one's
    // height, which is exactly what happened when this used top-0/z-40.
    <div className="sticky top-[73px] z-20 flex items-center justify-center gap-3 bg-gradient-to-r from-[#F5C278] to-[#E4A23C] px-3 py-2.5 text-center text-[13px] font-semibold text-[#1a1a1a] sm:text-sm">
      <Link href={href} className="underline-offset-2 hover:underline">
        Just today: 50% off Fine Art Pro yearly — claim it now
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 text-[#1a1a1a]/70 transition hover:bg-black/10 hover:text-[#1a1a1a]"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
