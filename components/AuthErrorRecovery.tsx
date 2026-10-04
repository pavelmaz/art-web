"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { SiteLocale } from "@/lib/locale-routes";

const AUTH_ERROR_PARAMS = ["error", "error_code", "error_description"] as const;

/**
 * Supabase sends a failed OAuth round trip to the site root with
 * ?error=…&error_code=…&error_description=… (or the same in the hash). The usual
 * cause is a replay: after signing in, the visitor presses Back into Google's
 * page, which re-sends a state Supabase already used ("bad_oauth_state", seen
 * 29 Sep 2026). Visitors who are signed in anyway just get the URL cleaned;
 * everyone else is sent to /login with a "please try again" notice instead of
 * being left on the home page with no explanation.
 */
export function AuthErrorRecovery({ lang }: { lang: SiteLocale }) {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const inQuery = url.searchParams.has("error_code") || url.searchParams.has("error_description");
    const inHash = hash.has("error_code") || hash.has("error_description");
    if (!inQuery && !inHash) return;

    for (const key of AUTH_ERROR_PARAMS) url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + (inHash ? "" : url.hash));

    // Loaded only on this rare path, so ordinary pages don't carry the auth client.
    void import("@/lib/supabase/browser").then(async ({ createSupabaseBrowserClient }) => {
      const { data } = await createSupabaseBrowserClient().auth.getSession();
      if (data.session) return;
      router.replace(`/login?${lang === "en" ? "" : `loc=${lang}&`}auth_error=1`);
    });
  }, [lang, router]);

  return null;
}
