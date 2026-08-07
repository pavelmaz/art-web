"use client";

import { track } from "@vercel/analytics";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState, type MouseEvent } from "react";

import { DownloadInterstitial } from "@/components/DownloadInterstitial";
import { detectLocaleFromPathname } from "@/lib/hreflang-paths";

type DownloadButtonProps = {
  imageUrl: string;
  /** Nice download filename (e.g. the artwork slug). Falls back to the URL's name. */
  filename?: string;
  label?: string;
  variant?: "solid" | "glass";
  /** Artwork title, shown in the interstitial. */
  title?: string;
  /** Original width in px. The interstitial is skipped when there is nothing bigger to sell. */
  maxWidth?: number | null;
};

/** Shown at most once per browsing session, so someone collecting ten works isn't nagged ten times. */
const SEEN_KEY = "faf_dl_interstitial_seen";

/**
 * Standard-download button. Points at the same-origin /api/download proxy, which
 * streams the file back with Content-Disposition: attachment so it actually saves
 * to the device (desktop + mobile) instead of opening — a cross-origin `<a download>`
 * to the CDN is ignored by browsers.
 *
 * Client component so the free download can be measured: `download_free` is the
 * counterpart to `paywall_view` / `paywall_cta_click`, giving the ratio of visitors
 * who take the free file versus those who click through to Pro.
 */
export function DownloadButton({
  imageUrl,
  filename,
  label = "Download",
  variant = "solid",
  title,
  maxWidth = null,
}: DownloadButtonProps) {
  const pathname = usePathname();
  const params = new URLSearchParams({ src: imageUrl, size: "standard" });
  if (filename?.trim()) params.set("name", filename.trim());
  const href = imageUrl ? `/api/download?${params.toString()}` : "#";

  const [showInterstitial, setShowInterstitial] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  /**
   * "Continue free download" re-clicks the anchor to start the download, which
   * re-enters handleClick. Without this the click would be counted a second
   * time and download_free would read roughly double for every visitor who saw
   * the interstitial — corrupting the exact ratio the experiment measures.
   */
  const resumingRef = useRef(false);

  const className =
    variant === "glass"
      ? "glass-primary inline-flex shrink-0 items-center justify-center rounded-md px-3 py-2 text-[13px] font-medium"
      : "inline-flex shrink-0 items-center justify-center rounded-md bg-[#4CAF50] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#43A047]";

  const locale = detectLocaleFromPathname(pathname);

  const alreadySeen = () => {
    try {
      return window.sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      return true; // storage blocked — never interrupt
    }
  };

  const markSeen = () => {
    try {
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // nothing to record
    }
  };

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      // Programmatic re-click from the interstitial: the download proceeds, but
      // this click is a continuation of one already counted, not a new one.
      if (resumingRef.current) {
        resumingRef.current = false;
        return;
      }

      track("download_free", { artwork: filename ?? "unknown", locale });

      // Skip when there is no larger file to sell: on those works the download
      // panel behind the modal shows Max Size at the same 1400px, so an upgrade
      // offer would contradict what is on screen.
      const hasUpgrade = typeof maxWidth === "number" && maxWidth > 1400;
      if (!hasUpgrade || alreadySeen()) return; // let the download proceed

      e.preventDefault();
      markSeen();
      track("interstitial_view", { artwork: filename ?? "unknown", locale });
      setShowInterstitial(true);
    },
    [filename, locale, maxWidth]
  );

  return (
    <>
      <a ref={anchorRef} href={href} className={className} onClick={handleClick}>
        {label}
      </a>

      <DownloadInterstitial
        open={showInterstitial}
        title={title ?? filename ?? ""}
        imageUrl={imageUrl}
        maxWidth={maxWidth}
        locale={locale}
        onClose={() => setShowInterstitial(false)}
        onContinue={() => {
          setShowInterstitial(false);
          track("interstitial_continue_free", { artwork: filename ?? "unknown", locale });
          resumingRef.current = true;
          anchorRef.current?.click(); // resumes the download without re-counting
        }}
      />
    </>
  );
}
