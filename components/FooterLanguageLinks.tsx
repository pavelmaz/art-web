"use client";

import { usePathname } from "next/navigation";

import { localeFromPathname } from "@/lib/pathname-locale";
import { LOCALE_NATIVE_NAMES, SWITCHABLE_LOCALES, localeTwinPath } from "@/lib/locale-twins";

/**
 * Links to the same page in every other language. Plain <a> on purpose: each
 * locale has its own root layout, so the switch is a full page load anyway, and
 * <Link> would prefetch nine pages per view for a link almost nobody clicks.
 * Also gives crawlers real in-page links between the translations (hreflang
 * already lists them in <head>).
 *
 * `?lang=xx` makes the middleware record the choice (faf_lang cookie, 1 year)
 * and land on the same page in that language, so the English-URL auto-redirect
 * follows the visitor's pick instead of their browser language from then on.
 */
export function FooterLanguageLinks() {
  const pathname = usePathname();
  const here = localeFromPathname(pathname);
  const links = SWITCHABLE_LOCALES.filter((loc) => loc !== here)
    .map((loc) => {
      const twin = localeTwinPath(pathname, loc);
      return { loc, href: twin ? `${twin}?lang=${loc}` : twin };
    })
    .filter((l): l is { loc: (typeof SWITCHABLE_LOCALES)[number]; href: string } => !!l.href);

  if (links.length === 0) return null;

  return (
    <nav aria-label="Languages" className="mt-4 flex flex-wrap gap-x-1 gap-y-1 text-xs tracking-wide">
      {links.map(({ loc, href }, i) => (
        <span key={loc} className="flex items-center">
          {i > 0 && (
            <span className="mx-1.5 text-[#404040]" aria-hidden>
              ·
            </span>
          )}
          <a href={href} hrefLang={loc} lang={loc} className="text-[#a3a3a3] transition-colors hover:text-white">
            {LOCALE_NATIVE_NAMES[loc]}
          </a>
        </span>
      ))}
    </nav>
  );
}
