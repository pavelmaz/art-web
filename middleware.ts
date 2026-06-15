import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildHreflangLinkHeader } from "@/lib/hreflang-paths";
import { retryAfterSeconds, shouldRateLimit } from "@/lib/rate-limit";

type CookieRow = { name: string; value: string; options: CookieOptions };

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
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
