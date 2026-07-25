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
 */
export function DownloadButton({ imageUrl, filename, label = "Download", variant = "solid" }: DownloadButtonProps) {
  const params = new URLSearchParams({ src: imageUrl });
  if (filename?.trim()) params.set("name", filename.trim());
  const href = imageUrl ? `/api/download?${params.toString()}` : "#";

  const className =
    variant === "glass"
      ? "glass-primary inline-flex shrink-0 items-center justify-center rounded-md px-3 py-2 text-[13px] font-medium"
      : "inline-flex shrink-0 items-center justify-center rounded-md bg-[#4CAF50] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#43A047]";

  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}
