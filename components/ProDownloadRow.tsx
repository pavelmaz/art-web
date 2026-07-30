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
  /** Nice download filename (e.g. the artwork slug). */
  filename?: string;
  /** Render with the glass design system (used on the artwork page pilot). */
  glass?: boolean;
  /** Per-artwork Pro-download dimensions, e.g. "6407 x 4789px". */
  maxDims?: string | null;
  /** Per-artwork Pro-download file size, e.g. "19.4 MB". */
  maxSize?: string | null;
};

/**
 * The "max size / 4K" download row: the real hi-res file for Pro members, and an
 * upsell pitch for everyone else. Fires paywall analytics so conversion can be
 * measured (paywall_view on display, paywall_cta_click on click).
 */
export function ProDownloadRow({ locale, isPro, downloadHref, filename, glass = false, maxDims, maxSize }: ProDownloadRowProps) {
  const t = getT(locale);
  // Route the real file through the same-origin /api/download proxy so it saves
  // instead of opening (a cross-origin <a download> is ignored by browsers).
  const proDownloadHref = downloadHref
    ? `/api/download?src=${encodeURIComponent(downloadHref)}${filename ? `&name=${encodeURIComponent(filename)}` : ""}`
    : "#";

  useEffect(() => {
    if (!isPro) {
      track("paywall_view", { source: "download_4k", locale });
    }
  }, [isPro, locale]);

  if (isPro) {
    return (
      <div className={`flex items-center justify-between gap-2 rounded-lg p-3 ${glass ? "glass-inset" : "bg-[#eceff3]"}`}>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[#1a1a1a]">Max Size{maxDims ? `, ${maxDims}` : ""}</p>
          <p className="text-xs text-[#999]">{maxSize ? `JPG, Size: ${maxSize}` : t.downloadMaxFormat}</p>
        </div>
        <a
          href={proDownloadHref}
          className={
            glass
              ? "glass-primary inline-flex shrink-0 items-center justify-center rounded-md px-3 py-2 text-[13px] font-medium"
              : "inline-flex shrink-0 items-center justify-center rounded-md bg-[#9e9e9e] px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#8a8a8a]"
          }
        >
          {t.downloadStandard}
        </a>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg p-3 ${glass ? "glass-inset" : "border-2 border-[#1a1a1a] bg-white"}`}>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[#1a1a1a]">Max Size{maxDims ? `, ${maxDims}` : ""}</p>
        <p className="text-xs text-[#999]">{maxSize ? `JPG, Size: ${maxSize}` : t.downloadMaxFormat}</p>
      </div>
      <Link
        // Carry the artwork over so the Pro page's hero opens with the painting
        // the visitor was just looking at (filename = the artwork slug).
        href={filename ? `${fineArtProPath(locale)}?art=${encodeURIComponent(filename)}` : fineArtProPath(locale)}
        onClick={() => track("paywall_cta_click", { source: "download_4k", locale })}
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-gradient-to-br from-[#4CAF50] to-[#1e9e57] px-3 py-2 text-[13px] font-medium text-white shadow-[0_6px_18px_rgba(76,175,80,0.4)] transition hover:brightness-110"
      >
        {t.insightsLimitCta}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
