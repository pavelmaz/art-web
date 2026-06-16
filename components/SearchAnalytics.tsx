"use client";

import { track } from "@vercel/analytics";
import { useEffect } from "react";

type SearchAnalyticsProps = {
  query: string;
  locale: string;
  results: number;
};

/**
 * Records each site search as a Vercel custom event. Pageviews drop the ?q=
 * param (so every search collapses to /search), so we capture the query here.
 * It shows up under Vercel Analytics → Events as a "search" event with the
 * query, locale and result count as properties.
 */
export function SearchAnalytics({ query, locale, results }: SearchAnalyticsProps) {
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      return;
    }
    track("search", { query: q, locale, results });
  }, [query, locale, results]);

  return null;
}
