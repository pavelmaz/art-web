"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { fineArtProPath } from "@/lib/fineart-pro-path";
import { getT, type Locale } from "@/lib/translations";

/**
 * Shown once per session when a visitor clicks the free Download button, before
 * the download starts. The free file is a fraction of the original's pixels, and
 * this is the moment that costs the visitor something — so it is where the
 * upgrade is worth putting in front of them.
 *
 * Both panels are the SAME image the page has already loaded and decoded, zoomed
 * into the centre with background-size, with a blur on the free side. That means
 * no extra network request, no image generation and no storage reads — the modal
 * costs nothing to show. At this display size a real resample and a blur are
 * indistinguishable anyway, so the cheap route is the right one.
 *
 * The free download stays one full-width click away. This is an interstitial,
 * not a paywall — university libraries list the site on the promise that the
 * download is free and unblocked, and that has to remain true.
 */
export function DownloadInterstitial({
  open,
  onClose,
  onContinue,
  title,
  imageUrl,
  maxWidth,
  locale = "en",
}: {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  title: string;
  /** The artwork image the page already displays — reused, never re-fetched. */
  imageUrl?: string;
  maxWidth: number | null;
  locale?: Locale;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const t = getT(locale);
  const FREE_PX = 1400; // the free download is 1400 px wide

  // Zoom to the centre so the panels read as a detail, not a thumbnail — a whole
  // painting shrunk to this size looks identical at any resolution.
  const tile: React.CSSProperties = imageUrl
    ? {
        backgroundImage: `url("${imageUrl}")`,
        backgroundSize: "320%",
        backgroundPosition: "center",
      }
    : {};

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dl-interstitial-title"
      onClick={onClose}
    >
      {/* Bottom sheet on mobile, centred modal from sm up. */}
      <div
        className="w-full max-w-[430px] rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="dl-interstitial-title" className="text-[17px] font-semibold text-[#1a1a1a]">
          {t.dlHeadline}
        </p>
        <p className="mt-0.5 text-[13px] text-[#6b6b6b]">
          {title}
          {maxWidth ? ` · ${FREE_PX} px ${t.dlOf} ${maxWidth} px` : ""}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            {/* The blur lives on an inner layer scaled past the frame, and the
                frame clips it. Blurring the bordered element itself softens its
                own edges against transparency, which reads as an applied effect
                rather than a low-resolution file. */}
            <div className="h-24 w-full overflow-hidden rounded-lg border border-[#e8e6e1] bg-[#f1efea]">
              <div
                className="h-full w-full"
                style={{ ...tile, filter: "blur(1px)", transform: "scale(1.12)" }}
                aria-hidden
              />
            </div>
            <p className="mt-1.5 text-xs text-[#6b6b6b]">{t.dlFree} · {FREE_PX} px</p>
          </div>
          <div>
            <div className="h-24 w-full overflow-hidden rounded-lg border border-[#e4a23c] bg-[#f1efea]">
              <div className="h-full w-full" style={tile} aria-hidden />
            </div>
            <p className="mt-1.5 text-xs font-medium text-[#b07a1e]">Pro · {t.dlFullSize}</p>
          </div>
        </div>

        {/* Deliberately identical to the Max Size row behind the modal — same
            green, same padlock, same words. Two different-looking buttons for
            one action reads as two different offers. The line beneath adds the
            catalogue; no price, since the plan choice belongs on the Pro page. */}
        <Link
          href={fineArtProPath(locale)}
          onClick={() => track("interstitial_upgrade_click", { artwork: title, locale })}
          className="mt-3 flex h-[38px] w-full items-center justify-center gap-1.5 rounded-md bg-gradient-to-br from-[#4CAF50] to-[#1e9e57] text-sm font-medium text-white shadow-[0_6px_18px_rgba(76,175,80,0.4)] transition hover:brightness-110"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          {getT(locale).downloadMaxCta}
        </Link>
        <p className="mt-1.5 text-center text-[11px] text-[#9a9a9a]">
          {t.dlPlusCatalog}
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#dcd9d3] bg-white text-sm font-medium text-[#1a1a1a] transition hover:bg-[#f4f2ee]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
          </svg>
          {t.dlContinueFree}
        </button>
      </div>
    </div>,
    document.body
  );
}
