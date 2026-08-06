"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { fineArtProPath } from "@/lib/fineart-pro-path";
import type { Locale } from "@/lib/translations";

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
          You&apos;re downloading 6% of this painting
        </p>
        <p className="mt-0.5 text-[13px] text-[#6b6b6b]">
          {title}
          {maxWidth ? ` · 1400 px of ${maxWidth} px` : ""}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <div
              className="h-24 w-full overflow-hidden rounded-lg border border-[#e8e6e1] bg-[#f1efea]"
              style={{ ...tile, filter: "blur(1.6px)" }}
              aria-hidden
            />
            <p className="mt-1.5 text-xs text-[#6b6b6b]">Free · 1400 px</p>
          </div>
          <div>
            <div
              className="h-24 w-full overflow-hidden rounded-lg border border-[#e4a23c] bg-[#f1efea]"
              style={tile}
              aria-hidden
            />
            <p className="mt-1.5 text-xs font-medium text-[#b07a1e]">Pro · full size</p>
          </div>
        </div>

        <Link
          href={fineArtProPath(locale)}
          onClick={() => track("interstitial_upgrade_click", { artwork: title, locale })}
          className="mt-3 flex h-[38px] w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#F5C278] to-[#E4A23C] text-sm font-bold text-[#1a1a1a] transition hover:brightness-95"
        >
          Get the full resolution — $3.75/mo
        </Link>

        <button
          type="button"
          onClick={onContinue}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#dcd9d3] bg-white text-sm font-medium text-[#1a1a1a] transition hover:bg-[#f4f2ee]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
          </svg>
          Continue free download
        </button>
      </div>
    </div>,
    document.body
  );
}
