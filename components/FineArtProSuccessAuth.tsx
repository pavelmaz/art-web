"use client";

import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type FineArtProSuccessAuthCopy = {
  continueGoogle: string;
  emailPlaceholder: string;
  emailLink: string;
  checkEmail: string;
};

type FineArtProSuccessAuthProps = {
  /** Where to land back after auth — the same success URL, session_id included,
   *  so the server can finish linking the subscription now that a user exists. */
  nextPath: string;
  /** Email Stripe collected at checkout, to save the visitor re-typing it. */
  prefillEmail: string | null;
  copy: FineArtProSuccessAuthCopy;
};

export function FineArtProSuccessAuth({ nextPath, prefillEmail, copy }: FineArtProSuccessAuthProps) {
  const [otpEmail, setOtpEmail] = useState(prefillEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setNotice(null);
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { access_type: "offline", prompt: "consent" } },
    });
    setBusy(false);
    if (error) setNotice(error.message);
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
    <div className="mt-6 space-y-4 text-left">
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

      <div className="flex items-center gap-3" aria-hidden>
        <hr className="flex-1 border-t border-[#e3e0d9]" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <label htmlFor="success-email" className="sr-only">
          Email
        </label>
        <input
          id="success-email"
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
