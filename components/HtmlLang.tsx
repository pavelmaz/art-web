"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { localeFromPathname } from "@/lib/pathname-locale";

/**
 * Sets <html lang> from the current path on the client. The root layout can't
 * know the path without `headers()`, and a `headers()` read there made every
 * route on the site dynamic (uncacheable). hreflang tags carry the language
 * signal for search engines; this keeps the attribute right for browsers and
 * assistive tech.
 */
export function HtmlLang() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.lang = localeFromPathname(pathname);
  }, [pathname]);
  return null;
}
