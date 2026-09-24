"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { COMMERCIAL_USE_FOOTER_LABEL, COMMERCIAL_USE_PATHS } from "@/lib/commercial-use-landing";
import { localeFromPathname } from "@/lib/pathname-locale";

const LINK_CLASS = "text-[#a3a3a3] transition-colors hover:text-white";

/** Footer links whose target depends on the current locale (read from the path client-side). */
export function FooterCommercialLink() {
  const locale = localeFromPathname(usePathname());
  return (
    <Link href={COMMERCIAL_USE_PATHS[locale]} prefetch={false} className={LINK_CLASS}>
      {COMMERCIAL_USE_FOOTER_LABEL[locale]}
    </Link>
  );
}

export function FooterContactLink() {
  const locale = localeFromPathname(usePathname());
  return (
    <Link href={locale === "en" ? "/contact" : `/${locale}/contact`} prefetch={false} className={LINK_CLASS}>
      Contact
    </Link>
  );
}
