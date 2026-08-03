"use client";

import { track } from "@vercel/analytics";
import { usePathname } from "next/navigation";

import { detectLocaleFromPathname } from "@/lib/hreflang-paths";

type DownloadButtonProps = {
  imageUrl: string;
  /** Nice download filename (e.g. the artwork slug). Falls back to the URL's name. */
  filename?: string;
  label?: string;
  variant?: "solid" | "glass";
};

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
export function DownloadButton({ imageUrl, filename, label = "Download", variant = "solid" }: DownloadButtonProps) {
  const pathname = usePathname();
  const params = new URLSearchParams({ src: imageUrl });
  if (filename?.trim()) params.set("name", filename.trim());
  const href = imageUrl ? `/api/download?${params.toString()}` : "#";

  const className =
    variant === "glass"
      ? "glass-primary inline-flex shrink-0 items-center justify-center rounded-md px-3 py-2 text-[13px] font-medium"
      : "inline-flex shrink-0 items-center justify-center rounded-md bg-[#4CAF50] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#43A047]";

  return (
    <a
      href={href}
      className={className}
      onClick={() =>
        track("download_free", {
          artwork: filename ?? "unknown",
          locale: detectLocaleFromPathname(pathname),
        })
      }
    >
      {label}
    </a>
  );
}
