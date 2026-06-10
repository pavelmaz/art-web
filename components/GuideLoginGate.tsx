"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";

import { getGuideTranslations } from "@/lib/guide-translations";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/translations";

type GuideLoginGateProps = {
  isLoggedIn: boolean;
  locale?: string;
};

const LOCALES: Locale[] = ["en", "es", "pt", "ja", "fr", "de", "it", "ko", "ru", "zh"];

function toLocale(value?: string): Locale {
  if (value && LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return "en";
}

export function GuideLoginGate({ isLoggedIn, locale }: GuideLoginGateProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [fadedIn, setFadedIn] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const resolvedLocale = toLocale(locale);
  const t = getGuideTranslations(resolvedLocale).loginGate;

  const guideMatch = pathname.match(/^\/guides\/([^/]+)\/([^/]+)\/?$/);
  const nextPath = guideMatch ? `/guides/${guideMatch[1]}/${guideMatch[2]}` : pathname;

  useEffect(() => {
    if (isLoggedIn) return;
    const timer = window.setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setFadedIn(true));
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [isLoggedIn]);

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
    setNotice(t.checkEmail);
  };

  if (isLoggedIn || !visible) {
    return null;
  }

  return (
    <>
      <div
        className={`pointer-events-none fixed bottom-0 left-0 right-0 z-40 h-[65vh] transition-opacity duration-500 ${fadedIn ? "opacity-100" : "opacity-0"}`}
        style={{
          background: "linear-gradient(to bottom, transparent, white 30%)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        aria-hidden
      />

      <div
        className={`fixed bottom-[20%] left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4 transition-opacity duration-500 ${fadedIn ? "opacity-100" : "opacity-0"}`}
        role="dialog"
        aria-labelledby="guide-login-gate-title"
      >
        <div className="rounded-xl bg-white p-8 shadow-xl">
          <h2 id="guide-login-gate-title" className="text-xl font-semibold text-[#1a1a1a]">
            {t.heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#6b6b6b]">{t.subtext}</p>

          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#dadada] bg-white px-4 py-3 text-sm font-medium text-[#1a1a1a] shadow-sm transition-colors hover:bg-[#fafafa] disabled:opacity-60"
            >
              {t.continueGoogle}
            </button>

            <div className="relative py-2 text-center text-xs text-[#6b6b6b]">
              <span className="relative z-10 bg-white px-2">{t.orDivider}</span>
              <span className="absolute inset-x-0 top-1/2 z-0 h-px bg-[#e8e6e1]" aria-hidden />
            </div>

            <form onSubmit={sendMagicLink} className="space-y-3">
              <label htmlFor="guide-gate-email" className="sr-only">
                Email
              </label>
              <input
                id="guide-gate-email"
                type="email"
                autoComplete="email"
                required
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full rounded-lg border border-[#dadada] px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-[#9ca3af] focus:border-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
              >
                {busy ? t.sending : t.sendMagicLink}
              </button>
            </form>
          </div>

          {notice ? <p className="mt-4 text-sm text-[#1a1a1a]">{notice}</p> : null}
        </div>
      </div>
    </>
  );
}
