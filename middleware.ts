import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildHreflangLinkHeader } from "@/lib/hreflang-paths";

type CookieRow = { name: string; value: string; options: CookieOptions };

const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const limit = 30;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + window });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

export async function middleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (checkRateLimit(ip)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": "60",
        "Content-Type": "text/plain",
      },
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

  if (
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/api") &&
    !pathname.includes(".")
  ) {
    response.headers.set("Link", buildHreflangLinkHeader(pathname));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
