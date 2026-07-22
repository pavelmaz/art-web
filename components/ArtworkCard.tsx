"use client";

import Link from "next/link";

import { artworkGridImageUrl, buildArtworkPinAttrs, absoluteUrl } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

type ArtworkCardProps = {
  artwork: Artwork;
  index?: number;
  basePath?: string;
};

/** basePath (e.g. "/es", "/de", "" for EN) doubles as the locale code for pin copy. */
function localeFromBasePath(basePath?: string): string {
  const seg = (basePath ?? "").replace(/^\//, "");
  return seg || "en";
}

export function ArtworkCard({ artwork, index, basePath }: ArtworkCardProps) {
  const artist = artwork.artistDisplay ?? artwork.artistName;
  const isFirst = index === 0;

  const artworksSegment = (basePath === '/es' || basePath === '/pt') ? 'obras' : 'artworks';
  const href = `${basePath ?? ''}/${artworksSegment}/${artwork.slug}`;

  const imageSource = {
    url: artwork.sourceUrl ?? artwork.url ?? null,
    image_id: artwork.imageId ?? artwork.imageUrl ?? null,
  };
  const previewSrc = artworkGridImageUrl(imageSource);
  const pinAttrs = buildArtworkPinAttrs(
    { ...imageSource, title: artwork.title, artist_display: artist, description: artwork.description },
    localeFromBasePath(basePath),
    absoluteUrl(href)
  );

  return (
    <Link href={href} className="group block">
      <div className="overflow-hidden">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={artwork.altText || `${artwork.title} by ${artwork.artistDisplay || artwork.artistName}`}
            className="artwork-img artwork-img--card transition-transform duration-300 ease-in-out group-hover:scale-[1.03]"
            loading={isFirst ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={isFirst ? "high" : undefined}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
            {...pinAttrs}
          />
        ) : (
          <div className="w-full h-40 flex items-center justify-center text-[#aaa] text-xs">
            No image
          </div>
        )}
      </div>

      <div className="pt-[10px]">
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-[#1a1a1a]">{artwork.title}</p>
        <p className="mt-[2px] truncate text-[12px] font-normal leading-snug text-[#6b6b6b]">{artist}</p>
      </div>
    </Link>
  );
}
