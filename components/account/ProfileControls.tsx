"use client";

import { useState } from "react";

import { getLibraryT } from "@/lib/library-translations";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/translations";

/** Marketing consent toggle — the lawful basis for any upsell email we send. */
export function MarketingToggle({
  userId,
  initial,
  locale,
}: {
  userId: string;
  initial: boolean | null;
  locale: Locale;
}) {
  const t = getLibraryT(locale);
  const [optIn, setOptIn] = useState(Boolean(initial));
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const change = async (next: boolean) => {
    setOptIn(next);
    setBusy(true);
    setSaved(false);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ marketing_opt_in: next, marketing_opt_in_at: new Date().toISOString() })
      .eq("id", userId);
    setBusy(false);
    if (error) setOptIn(!next);
    else setSaved(true);
  };

  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={optIn}
          disabled={busy}
          onChange={(e) => void change(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[#e4a23c]"
        />
        <span className="text-sm leading-relaxed text-[#4a4a4a]">
          {t.marketingConsent}
          <span className="mt-0.5 block text-xs text-[#9a9a9a]">{t.marketingConsentHint}</span>
        </span>
      </label>
      {saved ? <p className="mt-2 text-xs text-[#2c6e30]">{t.saved}</p> : null}
    </div>
  );
}

/** Irreversible account deletion, gated behind a typed confirmation. */
export function DeleteAccountButton({ locale }: { locale: Locale }) {
  const t = getLibraryT(locale);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = typed.trim().toUpperCase() === "DELETE";

  const doDelete = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      let msg = "Could not delete account";
      try {
        msg = ((await res.json()) as { error?: string }).error ?? msg;
      } catch {
        // keep the fallback message
      }
      setError(msg);
      setBusy(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[#e5b4b0] bg-white px-4 py-2 text-sm font-medium text-[#b42318] transition hover:bg-[#fef3f2]"
      >
        {t.deleteAccount}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-[#1a1a1a]">{t.deleteConfirmTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6b6b6b]">{t.deleteConfirmBody}</p>

            <label htmlFor="delete-confirm" className="mt-4 block text-xs text-[#6b6b6b]">
              {t.deleteConfirmType}
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-[#dadada] px-3 py-2 text-sm focus:border-[#1a1a1a] focus:outline-none"
            />

            {error ? <p className="mt-2 text-xs text-[#b42318]">{error}</p> : null}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 rounded-lg border border-[#dadada] px-4 py-2.5 text-sm font-medium text-[#1a1a1a] hover:bg-[#fafafa]"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => void doDelete()}
                disabled={!confirmed || busy}
                className="flex-1 rounded-lg bg-[#b42318] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#98200f] disabled:opacity-40"
              >
                {t.deleteForever}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
