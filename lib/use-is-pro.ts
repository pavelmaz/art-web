"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

let proStatusPromise: Promise<boolean> | null = null;
let authListenerRegistered = false;

/** One lookup per page load, shared by every component that asks; reset on login/logout. */
function fetchIsPro(): Promise<boolean> {
  if (!proStatusPromise) {
    proStatusPromise = (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        if (!authListenerRegistered) {
          authListenerRegistered = true;
          supabase.auth.onAuthStateChange(() => {
            proStatusPromise = null;
          });
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return false;
        const { data } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("id", session.user.id)
          .maybeSingle();
        return data?.subscription_status === "active";
      } catch {
        return false;
      }
    })();
  }
  return proStatusPromise;
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
