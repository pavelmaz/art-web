import { NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieRow = { name: string; value: string; options: CookieOptions };

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/fineart-pro";
  }
  return next;
}

/**
 * Fine Art Free and the LearnArt iOS app share this Supabase project, so they
 * share auth.users. Anyone completing auth HERE came through the website —
 * this route exists nowhere else — so it is the one reliable place to stamp
 * the origin.
 *
 * Only ever fills a NULL: a LearnArt user who later signs in on the website
 * keeps their original source, and a returning user is never relabelled.
 * Written with the service key because profiles only grants `authenticated`
 * the two marketing-consent columns.
 */
async function stampSignupSource(userId: string) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!base || !serviceKey) return;

    await fetch(`${base}/rest/v1/profiles?id=eq.${userId}&signup_source=is.null`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ signup_source: "fineartfree" }),
    });
  } catch {
    // Attribution is best-effort; never block a sign-in over it.
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/fineart-pro/join?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieRow[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/fineart-pro/join?error=auth`);
  }

  if (data.user) await stampSignupSource(data.user.id);

  return NextResponse.redirect(`${origin}${next}`);
}
