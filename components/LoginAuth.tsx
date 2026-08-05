"use client";

import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/** Localized strings for the standalone login widget (from the join-flow copy). */
export type LoginAuthCopy = {
  continueGoogle: string;
  or: string;
  emailPlaceholder: string;
  emailLink: string;
  checkEmail: string;
};

/**
 * Consent is captured at sign-in but can only be written once we know the user
 * id, which is after the OAuth/magic-link round trip. We stash the choice here
 * and <ConsentSync> in /account persists it on first load.
 */
export const MARKETING_CONSENT_KEY = "faf_marketing_opt_in";

/**
 * Sign-in panel for /login — Google OAuth + email magic link.
 *
 * Layout follows the OpenAI sign-in pattern: one centred column, a stack of
 * full-width pill buttons, a hairline OR divider, legal footer. The palette
 * stays in the site's light/cream scheme rather than OpenAI's dark, so it
 * matches every other page.
 */
export function LoginAuth({
  nextPath,
  copy,
  consentLabel,
  consentHint,
}: {
  nextPath: string;
  copy: LoginAuthCopy;
  consentLabel?: string;
  consentHint?: string;
}) {
  const [otpEmail, setOtpEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [optIn, setOptIn] = useState(false);

  /** Remember the marketing choice so /account can persist it post-auth. */
  const stashConsent = () => {
    try {
      window.localStorage.setItem(MARKETING_CONSENT_KEY, optIn ? "1" : "0");
    } catch {
      // private mode / storage disabled — consent simply stays unset
    }
  };

  const signInWithGoogle = async () => {
    setNotice(null);
    setBusy(true);
    stashConsent();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { access_type: "offline", prompt: "consent" },
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
    stashConsent();
    const supabase = createSupabaseBrowserClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: otpEmail.trim(),
      options: { emailRedirectTo },
    });
    setBusy(false);
    if (error) {
      setNotice(error.message);
      return;
    }
    setNotice(copy.checkEmail);
  };

  const pill =
    "flex w-full items-center justify-center gap-3 rounded-full border border-[#dcd9d3] bg-white px-5 py-3.5 text-sm font-medium text-[#1a1a1a] transition hover:bg-[#f4f2ee] disabled:opacity-60";

  return (
    <div className="mt-8 space-y-3">
      <button type="button" onClick={() => void signInWithGoogle()} disabled={busy} className={pill}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
        {copy.continueGoogle}
      </button>

      <div className="relative py-3 text-center text-[11px] uppercase tracking-[0.18em] text-[#9a9a9a]">
        <span className="relative z-10 bg-[#faf9f7] px-3">{copy.or}</span>
        <span className="absolute inset-x-0 top-1/2 z-0 h-px bg-[#e8e6e1]" aria-hidden />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <label htmlFor="login-email" className="sr-only">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={otpEmail}
          onChange={(e) => setOtpEmail(e.target.value)}
          placeholder={copy.emailPlaceholder}
          className="w-full rounded-full border border-[#dcd9d3] bg-white px-5 py-3.5 text-sm text-[#1a1a1a] placeholder:text-[#9ca3af] focus:border-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
        />
        <button type="submit" disabled={busy} className={pill}>
          <MailIcon />
          {copy.emailLink}
        </button>
      </form>

      {consentLabel ? (
        <label className="flex cursor-pointer items-start gap-2.5 pt-3 text-left">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[#e4a23c]"
          />
          <span className="text-xs leading-relaxed text-[#6b6b6b]">
            {consentLabel}
            {consentHint ? <span className="mt-0.5 block text-[#9a9a9a]">{consentHint}</span> : null}
          </span>
        </label>
      ) : null}

      {notice ? <p className="pt-1 text-sm text-[#1a1a1a]">{notice}</p> : null}
    </div>
  );
}

function MailIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}

/** Sends the subscriber to Stripe's customer billing portal (cancel, change plan, update card). */
export function ManageSubscriptionButton({
  locale,
  label,
  errorLabel,
}: {
  locale: string;
  label: string;
  errorLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const openPortal = async () => {
    setNotice(null);
    setBusy(true);
    const res = await fetch("/api/stripe/create-portal-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loc: locale }),
    });
    let data: { url?: string; error?: string } = {};
    try {
      data = (await res.json()) as { url?: string; error?: string };
    } catch {
      setNotice(errorLabel);
      setBusy(false);
      return;
    }
    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setBusy(false);
    setNotice(data.error ?? errorLabel);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void openPortal()}
        disabled={busy}
        className="rounded-lg border border-[#dadada] bg-white px-4 py-2 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#fafafa] disabled:opacity-60"
      >
        {label}
      </button>
      {notice ? <p className="text-sm text-[#1a1a1a]">{notice}</p> : null}
    </div>
  );
}

/** Signs the user out client-side, then reloads so server components drop the session. */
export function SignOutButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  };

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className="rounded-lg border border-[#dadada] bg-white px-4 py-2 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#fafafa] disabled:opacity-60"
    >
      {label}
    </button>
  );
}
