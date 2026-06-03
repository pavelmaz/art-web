"use client";

import { useState, type FormEvent } from "react";

import type { FineArtProCopy } from "@/lib/fineart-pro-translations";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type FineArtProJoinAuthProps = {
  nextPath: string;
  plan: "monthly" | "yearly" | null;
  isLoggedIn: boolean;
  email: string | null;
  copy: FineArtProCopy["joinAuth"];
};

export function FineArtProJoinAuth({ nextPath, plan, isLoggedIn, email, copy }: FineArtProJoinAuthProps) {
  const [otpEmail, setOtpEmail] = useState("");
  const [busy, setBusy] = useState(false);
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
    <div className="mt-8 space-y-6">
      {plan ? (
        <p className="text-sm text-[#4a4a4a]">
          <span className="font-semibold text-[#1a1a1a]">{copy.selectedPlan(plan)}</span>
        </p>
      ) : (
        <p className="text-sm text-[#6b6b6b]">{copy.pickPlanHint}</p>
      )}

      {isLoggedIn ? (
        <div className="space-y-4 rounded-lg border border-[#e8e6e1] bg-[#f5f5f5] px-4 py-3 text-sm text-[#1a1a1a]">
          <p>{copy.signedInAs(email ?? "")}</p>
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
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#dadada] bg-white px-4 py-3 text-sm font-medium text-[#1a1a1a] shadow-sm transition-colors hover:bg-[#fafafa] disabled:opacity-60"
          >
            {copy.continueGoogle}
          </button>

          <div className="relative py-2 text-center text-xs text-[#6b6b6b]">
            <span className="relative z-10 bg-white px-2">{copy.or}</span>
            <span className="absolute inset-x-0 top-1/2 z-0 h-px bg-[#e8e6e1]" aria-hidden />
          </div>

          <form onSubmit={sendMagicLink} className="space-y-3">
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
              className="w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
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
