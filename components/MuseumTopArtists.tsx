import Image from "next/image";
import Link from "next/link";

import { artistDetailPath, type SiteLocale } from "@/lib/locale-routes";
import type { MuseumTopArtist } from "@/lib/museum-page-data";
import { artworkImageUrl } from "@/lib/utils";

type MuseumTopArtistsProps = {
  artists: MuseumTopArtist[];
  heading: string;
  locale: SiteLocale;
  artworksLabel: string;
  artworksSingular?: string;
};

export function MuseumTopArtists({
  artists,
  heading,
  locale,
  artworksLabel,
  artworksSingular,
}: MuseumTopArtistsProps) {
  if (!artists.length) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-[#1a1a1a]">{heading}</h2>
      <div className="mt-4 flex flex-wrap gap-5">
        {artists.map((artist) => {
          const imageUrl = artworkImageUrl(
            { url: artist.url, image_id: artist.imageId },
            { width: 160, quality: 85 },
          );

          return (
            <Link
              key={artist.slug}
              href={artistDetailPath(locale, artist.slug)}
              className="group flex w-[5.5rem] flex-col items-center gap-2 sm:w-24"
            >
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[#e8e4de] sm:h-20 sm:w-20">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={artist.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#b8b0a6] sm:text-xl"
                    aria-hidden
                  >
                    {artist.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-center text-xs font-medium leading-snug text-[#1a1a1a]">
                {artist.name}
              </p>
              <p className="text-center text-xs text-[#6b6b6b]">
                {artist.count} {artist.count === 1 ? (artworksSingular ?? artworksLabel) : artworksLabel}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
