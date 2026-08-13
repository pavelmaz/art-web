import Link from "next/link";

import type { SiteSearchArtist } from "@/lib/site-search";
import { artworkImageUrl } from "@/lib/utils";

/**
 * Artist results rendered in the same masonry card style as ArtworkGrid
 * (image on top, label below) so the search tabs stay visually consistent.
 */
export function ArtistGrid({
  artists,
  artistPath,
  artworksWord,
}: {
  artists: SiteSearchArtist[];
  artistPath: string;
  artworksWord: string;
}) {
  return (
    <section className="columns-2 md:columns-3 lg:columns-4 [column-gap:16px]">
      {artists.map((artist, index) => {
        const src = artworkImageUrl({ url: artist.url, image_id: artist.image_id });
        return (
          <div key={artist.slug} className="mb-4 break-inside-avoid">
            <Link href={`${artistPath}/${artist.slug}`} className="group block">
              <div className="overflow-hidden">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={artist.name}
                    className="artwork-img artwork-img--card transition-transform duration-300 ease-in-out group-hover:scale-[1.03]"
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-[#e8e4de] text-3xl font-semibold text-[#b8b0a6]">
                    {artist.name.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="pt-[10px]">
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-[#1a1a1a]">{artist.name}</p>
                <p className="mt-[2px] truncate text-[12px] font-normal leading-snug text-[#6b6b6b]">
                  {artist.count} {artworksWord.toLowerCase()}
                </p>
              </div>
            </Link>
          </div>
        );
      })}
    </section>
  );
}
