import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  buildHreflangLinkHeader,
  detectLocaleFromPathname,
  enPathToLocalized,
  isEnOnlyPathname,
  localizedPathToEn,
} from "@/lib/hreflang-paths";
import type { SiteLocale } from "@/lib/locale-routes";
import { retryAfterSeconds, shouldRateLimit } from "@/lib/rate-limit";
import { claimsSearchBot } from "@/lib/verified-search-bot";

type CookieRow = { name: string; value: string; options: CookieOptions };

const LOCALE_COOKIE = "faf_locale";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const SUPPORTED_LOCALES = new Set<SiteLocale>([
  "en", "es", "pt", "ja", "fr", "de", "it", "ko", "ru", "zh",
]);

function isSupportedLocale(value: string | undefined | null): value is SiteLocale {
  return !!value && SUPPORTED_LOCALES.has(value as SiteLocale);
}

/** Best supported locale (incl. "en") from an Accept-Language header, or null. */
function pickPreferredLocale(acceptLanguage: string): SiteLocale | null {
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { lang: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .filter((e) => e.lang && e.lang !== "*")
    .sort((a, b) => b.q - a.q);
  for (const { lang } of ranked) {
    const primary = lang.split("-")[0];
    if (isSupportedLocale(primary)) return primary;
  }
  return null;
}

/** Broad crawler check for redirect exemption (never redirect bots — keeps every locale crawlable). */
function looksLikeCrawler(ua: string): boolean {
  return /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|bingpreview|duckduck|yandex|baidu|petalbot|preview/i.test(
    ua,
  );
}

export async function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "";

  if (await shouldRateLimit(ip, userAgent)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": retryAfterSeconds() },
    });
  }

  const { pathname } = request.nextUrl;

  // Sitemaps must stay fast and must not get hreflang Link headers (e.g. /es/sitemap/...).
  if (pathname === "/sitemap.xml" || pathname.startsWith("/sitemap/")) {
    return NextResponse.next();
  }

  // ---- Locale: honor ?lang override, then auto-redirect English URLs by browser language ----
  // Only real page GETs — never assets, API, or files.
  const isPageRequest =
    request.method === "GET" &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/api") &&
    !pathname.includes(".");

  if (isPageRequest) {
    // 1) Explicit override: ?lang=xx sets a durable preference, strips the param, and lands on
    //    the right-locale URL. A future language switcher can just link to `?lang=xx`.
    const langParam = request.nextUrl.searchParams.get("lang");
    if (isSupportedLocale(langParam)) {
      const here = detectLocaleFromPathname(pathname);
      const enPath = localizedPathToEn(pathname, here);
      const target = request.nextUrl.clone();
      target.pathname = enPathToLocalized(enPath, langParam);
      target.searchParams.delete("lang");
      const res = NextResponse.redirect(target, 307);
      res.cookies.set(LOCALE_COOKIE, langParam, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
      return res;
    }

    // 2) Auto-redirect: only on English (default) URLs that have a localized twin, never for bots.
    const here = detectLocaleFromPathname(pathname);
    const isCrawler = claimsSearchBot(userAgent) !== null || looksLikeCrawler(userAgent);
    if (here === "en" && !isEnOnlyPathname(pathname) && !isCrawler) {
      const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
      const preferred = isSupportedLocale(cookieLocale)
        ? cookieLocale
        : pickPreferredLocale(request.headers.get("accept-language") ?? "");
      if (preferred && preferred !== "en") {
        const dest = enPathToLocalized(pathname, preferred);
        if (dest !== pathname) {
          const target = request.nextUrl.clone();
          target.pathname = dest;
          return NextResponse.redirect(target, 307);
        }
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Only touch Supabase Auth when a session cookie is actually present. Anonymous
  // visitors and crawlers (the vast majority of traffic) carry no auth cookie, so we
  // skip the GoTrue round-trip entirely — saving egress and request latency. Logged-in
  // users still get their token refreshed and cookies rewritten as before.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));

  if (hasAuthCookie) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieRow[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    await supabase.auth.getUser();
  }

  if (
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/api") &&
    !pathname.includes(".")
  ) {
    const page = request.nextUrl.searchParams.get("page") ?? undefined;
    const linkHeader = buildHreflangLinkHeader(pathname, page);
    if (linkHeader) {
      response.headers.set("Link", linkHeader);
    }

    // Remember the locale the visitor is actively browsing, so a later visit to a bare
    // English URL (e.g. "/") sends them back to it. Only write when it actually changes.
    const activeLocale = detectLocaleFromPathname(pathname);
    if (activeLocale !== "en" && request.cookies.get(LOCALE_COOKIE)?.value !== activeLocale) {
      response.cookies.set(LOCALE_COOKIE, activeLocale, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
