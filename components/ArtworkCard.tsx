import Link from "next/link";

import { generateAltText } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

type ArtworkCardProps = {
  artwork: Artwork;
};

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  const artist = artwork.artistDisplay ?? artwork.artistName;
  const hasImage = Boolean(artwork.imageUrl);

  return (
    <Link href={`/artworks/${artwork.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f0ede8]">
        {hasImage ? (
          <img
            src={artwork.imageUrl}
            alt={generateAltText({
              title: artwork.title,
              date_display: artwork.dateDisplay ?? null,
              artist_display: artwork.artistDisplay ?? artwork.artistName ?? null,
              medium_display: null,
            })}
            className="h-full w-full object-contain transition-transform duration-300 ease-in-out group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-600">
            No image
          </div>
        )}
      </div>

      <div className="pt-[10px]">
        <h2 className="line-clamp-2 text-[13px] font-medium leading-snug text-[#1a1a1a]">{artwork.title}</h2>
        <p className="mt-[2px] truncate text-[12px] font-normal leading-snug text-[#6b6b6b]">{artist}</p>
      </div>
    </Link>
  );
}
