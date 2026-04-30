import Link from "next/link";

import { slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

type ArtworkCardProps = {
  artwork: Artwork;
};

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  const artist = artwork.artistDisplay ?? artwork.artistName;
  const hasImage = Boolean(artwork.imageUrl);

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <Link href={`/artworks/${artwork.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-neutral-100">
          {hasImage ? (
            <img
              src={artwork.imageUrl}
              alt={`${artwork.title} by ${artist}`}
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
        <p className="text-sm text-neutral-700">{artist}</p>
        {artwork.museum ? (
          <p className="text-sm text-neutral-600">
            <Link href={`/museums/${slugify(artwork.museum)}`} className="underline">
              {artwork.museum}
            </Link>
          </p>
        ) : null}
      </div>
    </article>
  );
}
