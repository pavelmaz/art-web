"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  getGenreLabelForLocale,
  getGenreSlugForLocale,
  type BrowseGenreRow,
} from "@/lib/browse-genres-helpers";
import { fineArtProPath } from "@/lib/fineart-pro-path";
import { detectLocaleFromPathname } from "@/lib/hreflang-paths";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { HREFLANG_LOCALES, LOCALE_ROUTE_CONFIG, getSegments, localePath } from "@/lib/locale-routes";
import { getT, type Locale } from "@/lib/translations";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

type HeaderProps = {
  /** From `genres` table via `getCachedGenresForBrowse` — labels and path segments are never invented here. */
  browseGenres?: BrowseGenreRow[];
};

export default function Header({ browseGenres = [] }: HeaderProps) {
  const pathname = usePathname();
  const locale = detectLocaleFromPathname(pathname) as Locale;
  const t = getT(locale);
  const prefix = locale === "en" ? "" : `/${locale}`;
  const searchPath = localePath(locale, "search");
  const segments = getSegments(locale);
  // Home pages AND the commercial landing use the transparent header that sits
  // over their dark hero (white text/logo, no header search — the hero has one).
  const isHome =
    pathname === "/" ||
    pathname === "/public-domain-images-for-commercial-use" ||
    // Fine Art Pro landing: same dark hero treatment, so the menu sits over it
    // transparently instead of on a separate white bar.
    /^(\/[a-z]{2})?\/fineart-pro\/?$/.test(pathname) ||
    HREFLANG_LOCALES.some((loc) => {
      if (loc === "en") return false;
      const p = LOCALE_ROUTE_CONFIG[loc].prefix;
      return pathname === p;
    });

  // Pro JOIN page (the registration/checkout step): a checkout-style header with
  // the logo only. Every nav link there is an exit from the one action the page
  // exists for, so search / Browse / Explore / Log in are dropped; the logo stays
  // as a trust anchor and still links home. The /fineart-pro landing page keeps
  // the full navigation.
  const isProFunnel = /^(\/[a-z]{2})?\/fineart-pro\/join\/?$/.test(pathname);

  const genresSegment = segments.genres;
  const stylesSegment = segments.styles;
  const artistsSegment = segments.artists;
  const museumsSegment = segments.museums;

  const BROWSE_LINKS = browseGenres.map((g) => {
    const slug = getGenreSlugForLocale(g, locale);
    const label = getGenreLabelForLocale(g, locale);
    return {
      href: `${prefix}/${genresSegment}/${slug}`,
      label,
    };
  });

  const hasTopicsAndCountries =
    locale === "en" || locale === "es" || locale === "pt" || locale === "ja";
  const topicsSegment = locale === "es" || locale === "pt" ? "temas" : "topics";
  const countriesSegment = locale === "es" || locale === "pt" ? "paises" : "countries";

  const EXPLORE_LINKS = [
    ...(hasTopicsAndCountries
      ? [
          { href: `${prefix}/${topicsSegment}`, label: t.topics },
          { href: `${prefix}/${countriesSegment}`, label: t.countries },
        ]
      : []),
    { href: `${prefix}/${stylesSegment}`, label: t.styles },
    { href: `${prefix}/${genresSegment}`, label: t.genres },
    // English only for now: /prints has no localised route yet, and linking a
    // Spanish or Japanese visitor to an English page is worse than not offering
    // it. Drop the condition once the locale versions exist.
    ...(locale === "en"
      ? [
          { href: "/prints", label: "Prints & Wall Charts" },
          { href: "/book-illustrations", label: "Book Illustrations" },
        ]
      : []),
  ];

  const artworksSegment = segments.artworks;

  const NAV_LINKS = [
    { href: `${prefix}/${artworksSegment}`, label: t.artworks },
    { href: `${prefix}/${artistsSegment}`, label: t.artists },
    { href: `${prefix}/${museumsSegment}`, label: t.museums },
    { href: fineArtProPath(locale), label: "Fine Art Pro" },
  ];

  const [mobileOpen, setMobileOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  // Session-aware login entry: the "Log in" link becomes the user's avatar once
  // signed in. Pages are statically cached, so auth state can only be read
  // client-side. Apple sign-in returns no picture, and magic-link users have no
  // profile at all, so `initial` is always kept as the fallback.
  const [account, setAccount] = useState<{ avatar: string | null; name: string } | null>(null);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    const read = (session: Session | null) => {
      if (!session?.user) {
        setAccount(null);
        return;
      }
      const meta = session.user.user_metadata ?? {};
      setAccount({
        avatar: (meta.avatar_url as string) || (meta.picture as string) || null,
        name:
          (meta.full_name as string) ||
          (meta.name as string) ||
          session.user.email?.split("@")[0] ||
          "",
      });
    };
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) read(session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => read(session));
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);
  const signedIn = account !== null;
  // Signed-in visitors go straight to their library; everyone else to sign-in.
  const accountBase = signedIn ? "/account" : "/login";
  const loginHref = locale === "en" ? accountBase : `${accountBase}?loc=${locale}`;
  const loginLabel = signedIn ? t.navAccount : t.navLogin;

  useEffect(() => {
    setMobileOpen(false);
    setBrowseOpen(false);
    setExploreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const textColor = isHome ? "text-white/85 hover:text-white" : "text-[#1a1a1a] hover:text-black";

  if (isProFunnel) {
    return (
      <header className="border-b border-[#e8e6e1] bg-[#f6f4ee]">
        <div className="flex w-full items-center justify-center px-3 py-3 md:px-6">
          <Link
            href={prefix || "/"}
            className="inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a]/30"
          >
            <Image
              src="/FineArt logo-dark.svg"
              alt="Fine Art"
              width={1024}
              height={1024}
              priority
              className="h-10 w-auto max-h-10 max-w-[220px] object-contain"
              data-pin-nopin="true"
            />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header
      className={
        isHome
          ? "absolute inset-x-0 top-0 z-20 bg-transparent"
          : "glass-nav sticky top-0 z-30 mb-4 border-b border-[#e8e6e1]"
      }
    >
      <div className="flex w-full items-center gap-3 px-3 py-3 md:gap-4 md:px-6">
        <Link
          href={prefix || "/"}
          className="-ml-1 inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          <Image
            src={isHome ? "/logo-fine-art.svg" : "/FineArt logo-dark.svg"}
            alt="Fine Art"
            width={1024}
            height={1024}
            priority
            className="h-12 w-auto max-h-12 max-w-[280px] object-contain object-left"
            data-pin-nopin="true"
          />
        </Link>

        {!isHome ? (
          <form action={searchPath} method="get" className="min-w-0 flex-1 max-w-md hidden sm:block">
            <label htmlFor="header-search" className="sr-only">
              {t.searchPlaceholder}
            </label>
            <div className="flex h-9 items-center gap-2 rounded-full border border-[#e0ded7] bg-[#efeee9] transition-colors focus-within:border-[#c9c6bd] focus-within:bg-white px-3 py-1 focus-within:ring-2 focus-within:ring-[#d1d5db] md:h-10 md:px-4">
              <SearchIcon className="size-4 shrink-0 text-[#9ca3af]" />
              <input
                id="header-search"
                type="search"
                name="q"
                placeholder={t.searchPlaceholder}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#6b7280] focus:outline-none focus:ring-0"
                autoComplete="off"
              />
            </div>
          </form>
        ) : null}

        {/* Desktop nav — hidden on mobile */}
        <nav
          aria-label="Main navigation"
          className="ml-auto hidden md:flex shrink-0 items-center gap-4 text-sm md:gap-6"
        >
          {/* Browse dropdown — hover on desktop */}
          <div className="relative group">
            <button
              type="button"
              className={`flex items-center gap-1 ${textColor} text-sm`}
            >
              {t.navBrowse}
              <ChevronDown className="mt-px" />
            </button>
            <div className="absolute top-full left-0 hidden group-hover:block pt-2 z-50">
              <div className="glass-menu rounded-lg p-6 w-80">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {BROWSE_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="text-sm text-[#1a1a1a] hover:text-[#4CAF50]">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Explore dropdown — hover on desktop */}
          <div className="relative group/explore">
            <button
              type="button"
              className={`flex items-center gap-1 ${textColor} text-sm`}
            >
              {t.navExplore}
              <ChevronDown className="mt-px" />
            </button>
            <div className="absolute top-full left-0 hidden group-hover/explore:block pt-2 z-50">
              <div className="glass-menu rounded-lg p-6 w-48">
                <div className="flex flex-col gap-4">
                  {EXPLORE_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="text-sm text-[#1a1a1a] hover:text-[#4CAF50]">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={textColor}>
              {link.label}
            </Link>
          ))}

          {account ? (
            <Link href={loginHref} aria-label={loginLabel} title={account.name}>
              <AccountAvatar account={account} onDark={isHome} />
            </Link>
          ) : (
            <Link href={loginHref} className={textColor}>
              {loginLabel}
            </Link>
          )}
        </nav>

        {/* Mobile hamburger — visible on mobile only */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`ml-auto md:hidden p-2 ${isHome ? "text-white" : "text-[#1a1a1a]"}`}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen ? (
        <div className="fixed inset-0 top-[60px] z-50 bg-white overflow-y-auto md:hidden">
          <div className="px-5 py-6 space-y-1">
            {/* Mobile search */}
            {!isHome ? (
              <form action={searchPath} method="get" className="mb-6">
                <div className="flex h-10 items-center gap-2 rounded-full border border-[#e0ded7] bg-[#efeee9] transition-colors focus-within:border-[#c9c6bd] focus-within:bg-white px-4 focus-within:ring-2 focus-within:ring-[#d1d5db]">
                  <SearchIcon className="size-4 shrink-0 text-[#9ca3af]" />
                  <input
                    type="search"
                    name="q"
                    placeholder={t.searchPlaceholder}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#6b7280] focus:outline-none focus:ring-0"
                    autoComplete="off"
                  />
                </div>
              </form>
            ) : null}

            {/* Browse accordion */}
            <div className="border-b border-[#e8e6e1]">
              <button
                type="button"
                onClick={() => setBrowseOpen(!browseOpen)}
                className="flex w-full items-center justify-between py-4 text-[15px] font-medium text-[#1a1a1a]"
              >
                {t.navBrowse}
                <ChevronDown className={`transition-transform duration-200 ${browseOpen ? "rotate-180" : ""}`} />
              </button>
              {browseOpen ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 pb-4">
                  {BROWSE_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="text-sm text-[#3a3a3a] active:text-[#1a1a1a]">
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Explore accordion */}
            <div className="border-b border-[#e8e6e1]">
              <button
                type="button"
                onClick={() => setExploreOpen(!exploreOpen)}
                className="flex w-full items-center justify-between py-4 text-[15px] font-medium text-[#1a1a1a]"
              >
                {t.navExplore}
                <ChevronDown className={`transition-transform duration-200 ${exploreOpen ? "rotate-180" : ""}`} />
              </button>
              {exploreOpen ? (
                <div className="flex flex-col gap-3 pb-4">
                  {EXPLORE_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="text-sm text-[#3a3a3a] active:text-[#1a1a1a]">
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Direct nav links */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block border-b border-[#e8e6e1] py-4 text-[15px] font-medium text-[#1a1a1a]"
              >
                {link.label}
              </Link>
            ))}

            <Link
              href={loginHref}
              className="flex items-center gap-3 border-b border-[#e8e6e1] py-4 text-[15px] font-medium text-[#1a1a1a]"
            >
              {account ? (
                <>
                  <AccountAvatar account={account} />
                  <span className="truncate">{account.name}</span>
                </>
              ) : (
                loginLabel
              )}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/**
 * The signed-in nav entry. Google returns a picture, Apple never does and
 * magic-link users have no profile at all, so the lettered fallback is not an
 * edge case — it is what most signed-in users will actually see.
 */
function AccountAvatar({
  account,
  onDark = false,
}: {
  account: { avatar: string | null; name: string };
  onDark?: boolean;
}) {
  const ring = onDark ? "ring-white/45" : "ring-[#e8e6e1]";

  if (account.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={account.avatar}
        alt=""
        width={30}
        height={30}
        referrerPolicy="no-referrer"
        className={`size-[30px] rounded-full object-cover ring-1 ${ring}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`flex size-[30px] items-center justify-center rounded-full bg-[#e8e6e1] text-[13px] font-semibold uppercase text-[#4a4a4a] ring-1 ${ring}`}
    >
      {account.name.slice(0, 1)}
    </span>
  );
}
