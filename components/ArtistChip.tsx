import Link from "next/link";

import { artworkImageUrl } from "@/lib/utils";

type ArtistChipProps = {
  /** Artist display name (also used for the initials fallback + alt text). */
  name: string;
  /** Artist page href, or null when there's no resolvable artist (renders a non-link chip). */
  href: string | null;
  /**
   * Raw `artists.image_url` value (a storage hash/URL). null → falls back to a
   * representative artwork, then to initials. Artist portraits have no renditions,
   * so this resolves to the original via artworkImageUrl.
   */
  portrait?: string | null;
  /**
   * A representative artwork by this artist (their top-scored work), used as the
   * avatar when there's no portrait — only ~2% of artists have a real photo.
   */
  fallbackArtwork?: { image_id: string | null; url: string | null } | null;
};

/**
 * Small, understated pill showing a circular artist portrait + name, linking to the
 * artist page. Shown under the artwork title in place of the plain artist name.
 */
export function ArtistChip({ name, href, portrait, fallbackArtwork }: ArtistChipProps) {
  const src = portrait?.trim()
    ? artworkImageUrl({ url: null, image_id: portrait.trim() }, { width: 96, quality: 85 })
    : fallbackArtwork
      ? artworkImageUrl(fallbackArtwork, { width: 96, quality: 85 })
      : "";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const chipClass =
    "group inline-flex max-w-full items-center gap-2 rounded-full glass-inset py-1 pl-1 pr-3";

  const inner = (
    <>
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8e4de]">
        {src ? (
          <img
            src={src}
            alt={name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[11px] font-semibold text-[#b8b0a6]" aria-hidden>
            {initial}
          </span>
        )}
      </span>
      <span className="truncate text-sm text-[#6b6b6b] transition-colors group-hover:text-[#1a1a1a]">
        {name}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${chipClass} transition-colors`}>
        {inner}
      </Link>
    );
  }

  return <span className={chipClass}>{inner}</span>;
}
