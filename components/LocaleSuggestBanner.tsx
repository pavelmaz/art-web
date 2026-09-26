"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import type { SiteLocale } from "@/lib/locale-routes";
import { localeTwinPath, pickBrowserLocale } from "@/lib/locale-twins";
import { localeFromPathname } from "@/lib/pathname-locale";

const DISMISS_KEY = "faf-lang-suggest-dismissed";

const COPY: Partial<Record<SiteLocale, { text: string; cta: string; close: string }>> = {
  en: { text: "This page is also available in English.", cta: "View in English", close: "Dismiss" },
  es: { text: "Esta página también está disponible en español.", cta: "Ver en español", close: "Cerrar" },
  pt: { text: "Esta página também está disponível em português.", cta: "Ver em português", close: "Fechar" },
  fr: { text: "Cette page est aussi disponible en français.", cta: "Voir en français", close: "Fermer" },
  de: { text: "Diese Seite gibt es auch auf Deutsch.", cta: "Auf Deutsch ansehen", close: "Schließen" },
  it: { text: "Questa pagina è disponibile anche in italiano.", cta: "Vedi in italiano", close: "Chiudi" },
  ja: { text: "このページは日本語でもご覧いただけます。", cta: "日本語で見る", close: "閉じる" },
  ko: { text: "이 페이지는 한국어로도 볼 수 있습니다.", cta: "한국어로 보기", close: "닫기" },
  ru: { text: "Эта страница также доступна на русском языке.", cta: "Смотреть на русском", close: "Закрыть" },
};

// Tiny store so dismissing re-evaluates the snapshot below (useSyncExternalStore).
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notify() {
  listeners.forEach((listener) => listener());
}

/** "locale|href" for the page to offer, or "" — computed from browser state, so client-only. */
function offerKey(pathname: string): string {
  const here = localeFromPathname(pathname);
  const cookie = document.cookie.match(/(?:^|; )faf_lang=([a-z]{2})/)?.[1] as SiteLocale | undefined;
  const preferred = cookie ?? pickBrowserLocale(navigator.languages ?? [navigator.language]);
  if (!preferred || preferred === here || !COPY[preferred]) return "";
  try {
    if (localStorage.getItem(DISMISS_KEY) === preferred) return "";
  } catch {
    // storage blocked — still offer, just not remembered
  }
  const href = localeTwinPath(pathname, preferred);
  return href ? `${preferred}|${href}` : "";
}

/**
 * Slim bar offering the same page in the visitor's browser language when they
 * land on another locale (e.g. a Spanish reader on a /pt page from a search
 * result). Rendered only on the client (server snapshot is empty), never a
 * redirect, dismissible per language. An explicit ?lang choice (faf_lang
 * cookie) counts as the preference.
 */
export function LocaleSuggestBanner() {
  const pathname = usePathname();
  const key = useSyncExternalStore(
    subscribe,
    () => offerKey(pathname),
    () => ""
  );

  if (!key) return null;
  const [locale, href] = key.split("|") as [SiteLocale, string];
  const copy = COPY[locale]!;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, locale);
    } catch {
      // nothing to record
    }
    notify();
  };

  return (
    <div
      lang={locale}
      className="flex items-center justify-center gap-3 bg-[#1a1a1a] px-4 py-2 text-center text-[13px] text-[#e5e5e5]"
      role="region"
      aria-label={copy.text}
    >
      <span>{copy.text}</span>
      {/* ?lang= records the choice (faf_lang cookie) so the preference sticks site-wide. */}
      <a href={`${href}?lang=${locale}`} hrefLang={locale} className="font-medium text-white underline underline-offset-2">
        {copy.cta}
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label={copy.close}
        className="ml-1 rounded px-1.5 text-[#a3a3a3] transition-colors hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
