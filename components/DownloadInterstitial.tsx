"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { fineArtProPath } from "@/lib/fineart-pro-path";
import type { Locale } from "@/lib/translations";

/**
 * Shown once per session when a visitor clicks the free Download button, before
 * the download starts. The free file is genuinely a fraction of the original's
 * pixels, and this is where that costs the visitor something — so it is the one
 * moment the upgrade is worth putting in front of them.
 *
 * The comparison uses the van Eyck detail crop on both sides. The soft version
 * is REAL resampling, not a blur filter: the crop was reduced to the 126px the
 * 1400px free file actually holds for that region, then scaled back up. Using a
 * fixed example (rather than the visitor's own artwork) keeps this to two static
 * assets with no per-artwork image generation.
 *
 * The free download stays one full-width click away. It is an interstitial, not
 * a paywall — the site is listed by university libraries on the promise that the
 * download is free and unblocked, and that has to stay true.
 */
const FALLBACK = {
  free: "/images/pro-detail/eyck-eye-free.jpg",
  pro: "/images/pro-detail/eyck-eye.jpg",
};

export function DownloadInterstitial({
  open,
  onClose,
  onContinue,
  title,
  slug,
  maxWidth,
  locale = "en",
}: {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  title: string;
  slug?: string;
  maxWidth: number | null;
  locale?: Locale;
}) {
  // Crops of THIS artwork, generated once then served from the CDN. The van
  // Eyck pair shows while they load and stands in if generation fails — better
  // a labelled example than an empty box.
  const [crops, setCrops] = useState(FALLBACK);
  const [isOwn, setIsOwn] = useState(false);

  useEffect(() => {
    if (!open || !slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/detail-crop?slug=${encodeURIComponent(slug)}`);
        if (!res.ok || cancelled) return;
        const d = (await res.json()) as { free?: string; pro?: string };
        if (d.free && d.pro && !cancelled) {
          setCrops({ free: d.free, pro: d.pro });
          setIsOwn(true);
        }
      } catch {
        // keep the fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, slug]);

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
            <div className="overflow-hidden rounded-lg border border-[#e8e6e1] bg-[#f1efea]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={crops.free}
                alt="Detail at the free download's resolution"
                className="h-24 w-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
            <p className="mt-1.5 text-xs text-[#6b6b6b]">Free · 1400 px</p>
          </div>
          <div>
            <div className="overflow-hidden rounded-lg border border-[#e4a23c] bg-[#f1efea]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={crops.pro}
                alt="The same detail at full resolution"
                className="h-24 w-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
            <p className="mt-1.5 text-xs font-medium text-[#b07a1e]">Pro · full size</p>
          </div>
        </div>

        {!isOwn ? (
          <p className="mt-1.5 text-[11px] text-[#9a9a9a]">Example: van Eyck at full resolution</p>
        ) : null}

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
