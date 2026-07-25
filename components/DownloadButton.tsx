type DownloadButtonProps = {
  imageUrl: string;
  /** Nice download filename (e.g. the artwork slug). Falls back to the URL's name. */
  filename?: string;
  label?: string;
  variant?: "solid" | "glass";
  /** Render as a full-width block button (stacked below specs). */
  fullWidth?: boolean;
};

/**
 * Standard-download button. Points at the same-origin /api/download proxy, which
 * streams the file back with Content-Disposition: attachment so it actually saves
 * to the device (desktop + mobile) instead of opening — a cross-origin `<a download>`
 * to the CDN is ignored by browsers.
 */
export function DownloadButton({ imageUrl, filename, label = "Download", variant = "solid", fullWidth = false }: DownloadButtonProps) {
  const params = new URLSearchParams({ src: imageUrl });
  if (filename?.trim()) params.set("name", filename.trim());
  const href = imageUrl ? `/api/download?${params.toString()}` : "#";

  const display = fullWidth ? "flex w-full" : "inline-flex";
  const className =
    variant === "glass"
      ? `glass-primary ${display} items-center justify-center rounded-md px-4 py-2 text-sm font-medium`
      : `${display} items-center justify-center rounded-md bg-[#4CAF50] px-4 py-2 text-sm font-medium text-white hover:bg-[#43A047]`;

  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}
