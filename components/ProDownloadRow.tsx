"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect } from "react";

import { fineArtProPath } from "@/lib/fineart-pro-path";
import { getT, type Locale } from "@/lib/translations";

type ProDownloadRowProps = {
  locale: Locale;
  isPro: boolean;
  downloadHref: string;
  /** Render with the glass design system (used on the artwork page pilot). */
  glass?: boolean;
};

/**
 * The "max size / 4K" download row: the real hi-res file for Pro members, and an
 * upsell pitch for everyone else. Fires paywall analytics so conversion can be
 * measured (paywall_view on display, paywall_cta_click on click).
 */
export function ProDownloadRow({ locale, isPro, downloadHref, glass = false }: ProDownloadRowProps) {
  const t = getT(locale);

  useEffect(() => {
    if (!isPro) {
      track("paywall_view", { source: "download_4k", locale });
    }
  }, [isPro, locale]);

  if (isPro) {
    return (
      <div
        className={`flex items-center justify-between gap-4 rounded-lg p-3 ${
          glass ? "glass-inset" : "bg-[#eceff3]"
        }`}
      >
        <div>
          <p className="text-sm font-medium text-[#1a1a1a]">{t.downloadMaxSize}</p>
          <p className="text-xs text-[#999]">{t.downloadMaxFormat}</p>
        </div>
        <a
          href={downloadHref}
          download
          className={
            glass
              ? "glass-primary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
              : "inline-flex items-center justify-center rounded-md bg-[#9e9e9e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8a8a8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b6b6b] focus-visible:ring-offset-2"
          }
        >
          {t.downloadStandard}
        </a>
      </div>
    );
  }

  return (
    <Link
      href={fineArtProPath(locale)}
      onClick={() => track("paywall_cta_click", { source: "download_4k", locale })}
      className={
        glass
          ? "glass-inset flex items-center justify-between gap-3 rounded-lg p-3 transition-colors"
          : "flex items-center justify-between gap-3 rounded-lg border-2 border-[#1a1a1a] bg-white p-3 transition-colors hover:bg-[#faf9f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a] focus-visible:ring-offset-2"
      }
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1a1a1a]">{t.proDownloadTitle}</p>
        <p className="text-xs text-[#6b6b6b]">{t.proDownloadPerks}</p>
      </div>
      <span
        className={
          glass
            ? "inline-flex shrink-0 items-center gap-1 rounded-md bg-[#4CAF50] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#43A047]"
            : "inline-flex shrink-0 items-center gap-1 rounded-md bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white"
        }
      >
        {t.insightsLimitCta}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
