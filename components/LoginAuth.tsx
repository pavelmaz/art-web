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
 * Standalone sign-in widget (Google OAuth + email magic link) for /login.
 * Same auth flows as the Fine Art Pro join page, without the plan/checkout step.
 */
export function LoginAuth({ nextPath, copy }: { nextPath: string; copy: LoginAuthCopy }) {
  const [otpEmail, setOtpEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setNotice(null);
    setBusy(true);
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

  return (
    <div className="mt-8 space-y-6">
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-black disabled:opacity-60"
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

      <div className="relative py-2 text-center text-xs text-[#6b6b6b]">
        <span className="relative z-10 bg-white px-2">{copy.or}</span>
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
