"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { getLibraryT } from "@/lib/library-translations";
import { translations, type Locale } from "@/lib/translations";

/**
 * Tab bar for /account. A client component because the active tab comes from
 * the pathname — layouts don't receive searchParams, so the locale is read from
 * the query string here and threaded onto every tab link.
 */
export function AccountTabs() {
  const pathname = usePathname() || "/account";
  const params = useSearchParams();
  const raw = params.get("loc") ?? undefined;
  const locale: Locale = raw && raw in translations ? (raw as Locale) : "en";
  const t = getLibraryT(locale);
  const suffix = locale === "en" ? "" : `?loc=${locale}`;

  const tabs = [
    { href: "/account", label: t.accountHome },
    { href: "/account/collections", label: t.accountCollections },
    { href: "/account/downloads", label: t.accountDownloads },
    { href: "/account/subscription", label: t.accountSubscription },
    { href: "/account/profile", label: t.accountProfile },
  ];

  return (
    <nav className="-mx-5 mb-8 overflow-x-auto border-b border-[#e8e6e1] px-5">
      <ul className="flex min-w-max gap-6">
        {tabs.map((tab) => {
          const active =
            tab.href === "/account" ? pathname === "/account" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={`${tab.href}${suffix}`}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-block whitespace-nowrap border-b-2 pb-3 text-sm transition ${
                  active
                    ? "border-[#1a1a1a] font-medium text-[#1a1a1a]"
                    : "border-transparent text-[#6b6b6b] hover:text-[#1a1a1a]"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
