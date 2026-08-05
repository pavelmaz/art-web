import Link from "next/link";

import { artworkHref, type AccountArtwork } from "@/lib/account";
import type { Locale } from "@/lib/translations";
import { artworkGridImageUrl } from "@/lib/utils";

/**
 * Thumbnail card for the account panel. Deliberately separate from
 * <ArtworkCard>, which expects the camelCased app-level Artwork type — here we
 * render raw DB rows straight from the favourites/collections joins.
 */
export function AccountArtworkCard({
  artwork,
  locale,
  action,
}: {
  artwork: AccountArtwork;
  locale: Locale;
  action?: React.ReactNode;
}) {
  const src = artworkGridImageUrl({ url: artwork.url, image_id: artwork.image_id });

  return (
    <div className="group relative">
      <Link href={artworkHref(artwork.slug, locale)} className="block">
        <div className="overflow-hidden rounded-lg bg-[#f1efea]">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={artwork.title ?? ""}
              loading="lazy"
              decoding="async"
              className="artwork-img artwork-img--card transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-[#aaa]">No image</div>
          )}
        </div>
        <p className="line-clamp-2 pt-2.5 text-[13px] font-medium leading-snug text-[#1a1a1a]">
          {artwork.title}
        </p>
        <p className="mt-[2px] truncate text-[12px] text-[#6b6b6b]">{artwork.artist_display}</p>
      </Link>
      {action ? <div className="absolute right-2 top-2">{action}</div> : null}
    </div>
  );
}
