"use client";

import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type FineArtProJoinAuthProps = {
  nextPath: string;
  plan: "monthly" | "yearly" | null;
  isLoggedIn: boolean;
  email: string | null;
};

export function FineArtProJoinAuth({ nextPath, plan, isLoggedIn, email }: FineArtProJoinAuthProps) {
  const [otpEmail, setOtpEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const startCheckout = async () => {
    if (!plan) {
      setNotice("Choose Monthly or Yearly on the Fine Art Pro page first.");
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
      setNotice("Unexpected response from server.");
      setBusy(false);
      return;
    }
    setBusy(false);
    if (!res.ok) {
      setNotice(data.error ?? "Checkout could not start.");
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    } else {
      setNotice("No checkout URL returned.");
    }
  };

  const signInWithGoogle = async () => {
    setNotice(null);
    setBusy(true);
    const redirectTo =
      plan === "monthly" || plan === "yearly"
        ? `${window.location.origin}/auth/callback?next=/fineart-pro/join?plan=${plan}`
        : `${window.location.origin}/auth/callback?next=/fineart-pro/join`;
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
    setNotice("Check your email for a sign-in link.");
  };

  return (
    <div className="mt-8 space-y-6">
      {plan ? (
        <p className="text-sm text-[#4a4a4a]">
          Selected plan: <span className="font-semibold text-[#1a1a1a]">{plan === "yearly" ? "Yearly" : "Monthly"}</span>
        </p>
      ) : (
        <p className="text-sm text-[#6b6b6b]">Pick a plan on the Fine Art Pro page first, or continue and choose billing in the next step.</p>
      )}

      {isLoggedIn ? (
        <div className="space-y-4 rounded-lg border border-[#e8e6e1] bg-[#f5f5f5] px-4 py-3 text-sm text-[#1a1a1a]">
          <p>
            Signed in as <span className="font-medium">{email}</span>.
          </p>
          {plan ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void startCheckout()}
              className="w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
            >
              Continue to secure checkout
            </button>
          ) : (
            <p className="text-[#6b6b6b]">Go back to Fine Art Pro and choose Monthly or Yearly to continue.</p>
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
            Continue with Google
          </button>

          <div className="relative py-2 text-center text-xs text-[#6b6b6b]">
            <span className="relative z-10 bg-white px-2">or</span>
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
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[#dadada] px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-[#9ca3af] focus:border-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
            >
              Email me a sign-in link
            </button>
          </form>
        </>
      )}

      {notice ? <p className="text-sm text-[#1a1a1a]">{notice}</p> : null}
    </div>
  );
}
