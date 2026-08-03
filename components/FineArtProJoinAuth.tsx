"use client";

import { useState, type FormEvent } from "react";

import type { FineArtProCopy } from "@/lib/fineart-pro-translations";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Serializable shape of the join copy: the two interpolating functions
 * (selectedPlan / signedInAs) are resolved to strings on the server before being
 * passed here, because functions cannot cross the server→client boundary.
 */
type JoinAuthCopy = Omit<FineArtProCopy["joinAuth"], "selectedPlan" | "signedInAs"> & {
  selectedPlanLabel: string;
  signedInAsLabel: string;
  continueEmailLabel: string;
};

type FineArtProJoinAuthProps = {
  nextPath: string;
  plan: "monthly" | "yearly" | null;
  isLoggedIn: boolean;
  copy: JoinAuthCopy;
};

export function FineArtProJoinAuth({ nextPath, plan, isLoggedIn, copy }: FineArtProJoinAuthProps) {
  const [otpEmail, setOtpEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const startCheckout = async () => {
    if (!plan) {
      setNotice(copy.choosePlanFirst);
      return;
    }
    setNotice(null);
    setBusy(true);
    const res = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    let data: { url?: string; error?: string } = {};
    try {
      data = (await res.json()) as { url?: string; error?: string };
    } catch {
      setNotice(copy.unexpectedResponse);
      setBusy(false);
      return;
    }
    setBusy(false);
    if (!res.ok) {
      setNotice(data.error ?? copy.checkoutFailed);
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    } else {
      setNotice(copy.noCheckoutUrl);
    }
  };

  const signInWithGoogle = async () => {
    setNotice(null);
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    setBusy(false);
    if (error) {
      setNotice(error.message);
    }
  };

  const sendMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!otpEmail.trim()) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: otpEmail.trim(),
      options: {
        emailRedirectTo,
      },
    });
    setBusy(false);
    if (error) {
      setNotice(error.message);
      return;
    }
    setNotice(copy.checkEmail);
  };

  return (
    <div className="mt-6 space-y-4">
      {/* The chosen plan + price is now shown in the order-summary card above, so
          only the "no plan picked yet" hint is still needed here. */}
      {plan ? null : <p className="text-sm text-[#6b6b6b]">{copy.pickPlanHint}</p>}

      {isLoggedIn ? (
        <div className="space-y-4 rounded-lg border border-[#e8e6e1] bg-[#f5f5f5] px-4 py-3 text-sm text-[#1a1a1a]">
          <p>{copy.signedInAsLabel}</p>
          {plan ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void startCheckout()}
              className="w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
            >
              {copy.continueCheckout}
            </button>
          ) : (
            <p className="text-[#6b6b6b]">{copy.choosePlanOnLanding}</p>
          )}
        </div>
      ) : (
        <>
          {/* Primary path: Google is one tap and never leaves the site. */}
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-br from-[#F5C278] to-[#E4A23C] px-4 py-3.5 text-[15px] font-bold text-[#1a1a1a] shadow-[0_6px_18px_rgba(228,162,60,0.45)] transition hover:brightness-95 disabled:opacity-60"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-white">
              <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
              </svg>
            </span>
            {copy.continueGoogle}
          </button>

          {/* Magic link is collapsed behind a text link: it works, but it sends the
              user to their inbox mid-checkout, so it must never look like an equal
              option to one-tap Google. */}
          {!showEmail ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="mx-auto block text-xs text-[#6b6b6b] underline underline-offset-2 hover:text-[#1a1a1a]"
            >
              {copy.continueEmailLabel}
            </button>
          ) : null}

          {/* Secondary path: magic link (requires leaving for the inbox mid-flow). */}
          <form onSubmit={sendMagicLink} className={showEmail ? "space-y-3" : "hidden"}>
            <label htmlFor="join-email" className="sr-only">
              Email
            </label>
            <input
              id="join-email"
              type="email"
              autoComplete="email"
              required
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              placeholder={copy.emailPlaceholder}
              className="w-full rounded-lg border border-[#dadada] px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-[#9ca3af] focus:border-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg border border-[#dadada] bg-white px-4 py-3 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#fafafa] disabled:opacity-60"
            >
              {copy.emailLink}
            </button>
          </form>
        </>
      )}

      {notice ? <p className="text-sm text-[#1a1a1a]">{notice}</p> : null}
    </div>
  );
}
