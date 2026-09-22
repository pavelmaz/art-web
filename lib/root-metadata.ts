import type { Metadata } from "next";

/**
 * Site-wide metadata shared by every root layout (one per locale, see
 * components/SiteShell). Pages merge their own title/description/alternates on top.
 */
export const ROOT_METADATA: Metadata = {
  title: {
    default: 'Fine Art Free — Download 500,000+ Public Domain Paintings & Art',
    template: '%s | Fine Art Free',
  },
  description: 'Browse and download 500,000+ classic paintings, prints and illustrations free. Public domain art from the world\'s top museums. Free for personal and commercial use.',
  openGraph: {
    title: 'Fine Art Free — Download 500,000+ Public Domain Paintings & Art',
    description: 'Browse and download 500,000+ classic paintings free. Public domain art from top museums. Free for any use.',
    url: 'https://fineartfree.com',
    siteName: 'Fine Art Free',
    type: 'website',
  },
  alternates: {
    types: {
      'application/rss+xml': 'https://fineartfree.com/feed',
    },
  },
  other: {
    'p:domain_verify': '70b1748da69f5a53b4c7c07dc21b12ef',
  },
};
