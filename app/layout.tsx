import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";

import Header from "@/components/Header";
import { FooterCommercialLink, FooterContactLink } from "@/components/FooterLocaleLinks";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { HtmlLang } from "@/components/HtmlLang";
import { MicrosoftUet } from "@/components/MicrosoftUet";
import { getCachedGenresForBrowse } from "@/lib/browse-genres";

import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata: Metadata = {
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

// No request-time reads (headers/cookies) in this layout: one such read here
// makes EVERY route dynamic and uncacheable. Locale-dependent bits (html lang,
// footer links) are derived from the path in small client components instead.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let browseGenres = [] as Awaited<ReturnType<typeof getCachedGenresForBrowse>>;
  try {
    browseGenres = await getCachedGenresForBrowse();
  } catch {
    browseGenres = [];
  }

  return (
    <html lang="en" className={`${urbanist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <HtmlLang />
        <Header browseGenres={browseGenres} />
        {children}
        <footer className="mt-auto bg-black text-[#a3a3a3]">
          <div className="mx-auto max-w-7xl px-5 py-10 md:px-6">
            <nav
              aria-label="Footer"
              className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm tracking-wide"
            >
              <Link href="/about" className="text-[#a3a3a3] transition-colors hover:text-white">
                About
              </Link>
              <span className="mx-2 text-[#404040]" aria-hidden>
                |
              </span>
              <FooterCommercialLink />
              <span className="mx-2 text-[#404040]" aria-hidden>
                |
              </span>
              <Link href="/fineart-pro" className="text-[#a3a3a3] transition-colors hover:text-white">
                Fine Art Pro
              </Link>
              <span className="mx-2 text-[#404040]" aria-hidden>
                |
              </span>
              <Link href="/blog" className="text-[#a3a3a3] transition-colors hover:text-white">
                Blog
              </Link>
              <span className="mx-2 text-[#404040]" aria-hidden>
                |
              </span>
              <Link href="/terms" className="text-[#a3a3a3] transition-colors hover:text-white">
                Terms
              </Link>
              <span className="mx-2 text-[#404040]" aria-hidden>
                |
              </span>
              <FooterContactLink />
            </nav>
            <hr className="mt-6 border-0 border-t border-[#262626]" />
            <p className="mt-5 text-xs leading-relaxed text-[#737373]">
              Fine Art Free © 2026 All Rights Reserved
            </p>
          </div>
        </footer>
        <Analytics />
        <GoogleAnalytics />
        <MicrosoftUet />
      </body>
    </html>
  );
}
