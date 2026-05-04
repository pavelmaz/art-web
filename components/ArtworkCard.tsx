import Link from "next/link";

<<<<<<< HEAD
import { generateAltText } from "@/lib/utils";
=======
>>>>>>> 42d7ea5 (initial commit)
import type { Artwork } from "@/types/artwork";

type ArtworkCardProps = {
  artwork: Artwork;
};

export function ArtworkCard({ artwork }: ArtworkCardProps) {
<<<<<<< HEAD
  const artist = artwork.artistDisplay ?? artwork.artistName;
  const hasImage = Boolean(artwork.imageUrl);

  return (
    <Link href={`/artworks/${artwork.slug}`} className="group block">
      <div className="overflow-hidden bg-[#f0ede8]">
        {hasImage ? (
          <img
            src={artwork.imageUrl}
            alt={generateAltText({
              title: artwork.title,
              date_display: artwork.dateDisplay ?? null,
              artist_display: artwork.artistDisplay ?? artwork.artistName ?? null,
              medium_display: null,
            })}
            className="h-auto w-full object-contain transition-transform duration-300 ease-in-out group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex min-h-40 w-full items-center justify-center text-sm text-neutral-600">
            No image
          </div>
        )}
      </div>

      <div className="pt-[10px]">
        <h2 className="line-clamp-2 text-[13px] font-medium leading-snug text-[#1a1a1a]">{artwork.title}</h2>
        <p className="mt-[2px] truncate text-[12px] font-normal leading-snug text-[#6b6b6b]">{artist}</p>
      </div>
    </Link>
=======
  const hasImage = Boolean(artwork.imageUrl);

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <Link href={`/artworks/${artwork.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-neutral-100">
          {hasImage ? (
            <img
              src={artwork.imageUrl}
              alt={`${artwork.title} by ${artwork.artistName}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-200 text-sm text-neutral-600">
              No image
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-2 p-4">
        <h2 className="text-base font-semibold text-neutral-900">
          <Link href={`/artworks/${artwork.slug}`} className="hover:underline">
            {artwork.title}
          </Link>
        </h2>
        <p className="text-sm text-neutral-700">{artwork.artistName}</p>
        {artwork.museum ? <p className="text-sm text-neutral-600">{artwork.museum}</p> : null}
      </div>
    </article>
>>>>>>> 42d7ea5 (initial commit)
  );
}
