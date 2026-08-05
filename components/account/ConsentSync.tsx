"use client";

import { useEffect } from "react";

import { MARKETING_CONSENT_KEY } from "@/components/LoginAuth";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * The marketing opt-in is chosen on /login, but there is no user id until the
 * OAuth / magic-link round trip completes. LoginAuth stashes the choice in
 * localStorage; this writes it to the profile exactly once, then clears it.
 *
 * Only ever writes when marketing_opt_in is still null, so it can never
 * overwrite a later change made on the Profile tab.
 */
export function ConsentSync({ userId }: { userId: string }) {
  useEffect(() => {
    let stashed: string | null = null;
    try {
      stashed = window.localStorage.getItem(MARKETING_CONSENT_KEY);
    } catch {
      return;
    }
    if (stashed !== "0" && stashed !== "1") return;

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("profiles")
        .select("marketing_opt_in")
        .eq("id", userId)
        .maybeSingle();

      if (data && data.marketing_opt_in === null) {
        await supabase
          .from("profiles")
          .update({
            marketing_opt_in: stashed === "1",
            marketing_opt_in_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
      try {
        window.localStorage.removeItem(MARKETING_CONSENT_KEY);
      } catch {
        // nothing to clean up
      }
    })();
  }, [userId]);

  return null;
}
