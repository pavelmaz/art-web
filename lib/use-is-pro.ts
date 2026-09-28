"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/** The signed-in visitor, or null for an anonymous one. */
export type Account = { email: string | null; isPro: boolean } | null;

let accountPromise: Promise<Account> | null = null;
let authListenerRegistered = false;

/** One lookup per page load, shared by every component that asks; reset on login/logout. */
export function getAccount(): Promise<Account> {
  if (!accountPromise) {
    accountPromise = (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        if (!authListenerRegistered) {
          authListenerRegistered = true;
          supabase.auth.onAuthStateChange(() => {
            accountPromise = null;
          });
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return null;
        const { data } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("id", session.user.id)
          .maybeSingle();
        return { email: session.user.email ?? null, isPro: data?.subscription_status === "active" };
      } catch {
        return null;
      }
    })();
  }
  return accountPromise;
}

function fetchIsPro(): Promise<boolean> {
  return getAccount().then((account) => account?.isPro ?? false);
}

/**
 * Client-side "is this visitor a Pro member?" check. Doing this on the server
 * needs `cookies()`, which makes the page dynamic — and that is exactly what kept
 * every one of the ~500k artwork pages from ever being cached. `resolved` turns
 * true once the answer is known (initial render assumes not Pro).
 */
export function useIsPro(): { isPro: boolean; resolved: boolean } {
  const [state, setState] = useState({ isPro: false, resolved: false });

  useEffect(() => {
    let active = true;
    void fetchIsPro().then((isPro) => {
      if (active) setState({ isPro, resolved: true });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
