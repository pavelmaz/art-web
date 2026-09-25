import { Urbanist } from "next/font/google";
import Link from "@/components/Link";
import type { ReactNode } from "react";

import Header from "@/components/Header";
import { FooterCommercialLink, FooterContactLink } from "@/components/FooterLocaleLinks";
import { FooterLanguageLinks } from "@/components/FooterLanguageLinks";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { LocaleSuggestBanner } from "@/components/LocaleSuggestBanner";
import { MicrosoftUet } from "@/components/MicrosoftUet";
import { getCachedGenresForBrowse } from "@/lib/browse-genres";
import type { SiteLocale } from "@/lib/locale-routes";

import "../app/globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-urbanist",
  display: "swap",
});

/**
 * The <html>/<body> shell every root layout renders. There is one root layout
 * per locale (app/(en)/layout.tsx, app/es/layout.tsx, …) purely so the server
 * can emit the right `<html lang>`: a single root layout cannot know the path
 * without `headers()`, and that read made every route dynamic (uncacheable).
 * No request-time reads happen here for the same reason.
 */
export async function SiteShell({ lang, children }: { lang: SiteLocale; children: ReactNode }) {
  let browseGenres = [] as Awaited<ReturnType<typeof getCachedGenresForBrowse>>;
  try {
    browseGenres = await getCachedGenresForBrowse();
  } catch {
    browseGenres = [];
  }

  return (
    <html lang={lang} className={`${urbanist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LocaleSuggestBanner />
        <Header browseGenres={browseGenres} />
        {children}
        <footer className="mt-auto bg-black text-[#a3a3a3]">
          <div className="mx-auto max-w-7xl px-5 py-10 md:px-6">
            <nav
              aria-label="Footer"
              className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm tracking-wide"
            >
              <Link href="/about" prefetch={false} className="text-[#a3a3a3] transition-colors hover:text-white">
                About
              </Link>
              <span className="mx-2 text-[#404040]" aria-hidden>
                |
              </span>
              <FooterCommercialLink />
              <span className="mx-2 text-[#404040]" aria-hidden>
                |
              </span>
              <Link href="/fineart-pro" prefetch={false} className="text-[#a3a3a3] transition-colors hover:text-white">
                Fine Art Pro
              </Link>
              <span className="mx-2 text-[#404040]" aria-hidden>
                |
              </span>
              <Link href="/blog" prefetch={false} className="text-[#a3a3a3] transition-colors hover:text-white">
                Blog
              </Link>
              <span className="mx-2 text-[#404040]" aria-hidden>
                |
              </span>
              <Link href="/terms" prefetch={false} className="text-[#a3a3a3] transition-colors hover:text-white">
                Terms
              </Link>
              <span className="mx-2 text-[#404040]" aria-hidden>
                |
              </span>
              <FooterContactLink />
            </nav>
            <FooterLanguageLinks />
            <hr className="mt-6 border-0 border-t border-[#262626]" />
            <p className="mt-5 text-xs leading-relaxed text-[#737373]">
              Fine Art Free © 2026 All Rights Reserved
            </p>
          </div>
        </footer>
        <GoogleAnalytics />
        <MicrosoftUet />
      </body>
    </html>
  );
}
