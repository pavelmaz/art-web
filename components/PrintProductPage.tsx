"use client";

import { useState } from "react";

import { PrintProductGallery } from "@/components/PrintProductGallery";
import { PrintProductPurchasePanel } from "@/components/PrintProductPurchasePanel";
import { PrintReviews } from "@/components/PrintReviews";
import { sizesForArtwork, type FrameKey } from "@/lib/print-catalog";
import type { PrintReview } from "@/lib/print-reviews";

export function PrintProductPage({
  artworkSlug,
  title,
  artist,
  imageUrl,
  imgWidth,
  imgHeight,
  reviews,
}: {
  artworkSlug: string;
  title: string;
  artist: string | null;
  imageUrl: string;
  imgWidth: number;
  imgHeight: number;
  reviews: { item: PrintReview[]; all: PrintReview[] };
}) {
  const sizes = sizesForArtwork(imgWidth, imgHeight);
  // Start on a real choice — the mid-range size in a black frame, the same
  // product the mockup shows — so the price on screen is an exact total from the
  // first moment instead of a "from $149+" figure.
  const defaultSize = sizes[Math.floor((sizes.length - 1) / 2)];
  const [sizeCode, setSizeCode] = useState(defaultSize?.code ?? "");
  const [frame, setFrame] = useState<FrameKey | "">("black");
  const shown = sizes.find((s) => s.code === sizeCode) ?? defaultSize;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
      {/* Etsy layout: gallery then reviews on the left, purchase panel alongside on the right. */}
      {/* Rows "auto 1fr": the first row is only as tall as the gallery, so the
          reviews start right under the photo; the taller purchase panel (which
          spans both rows) pushes its extra height into the second row instead. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-12 lg:gap-y-10">
        <PrintProductGallery
          artworkSlug={artworkSlug}
          imageUrl={imageUrl}
          title={title}
          geometry={shown}
          frame={frame || "black"}
        />
        <div className="lg:row-span-2">
          <PrintProductPurchasePanel
            artworkSlug={artworkSlug}
            title={title}
            artist={artist}
            sizes={sizes}
            sizeCode={sizeCode}
            frame={frame}
            onSizeChange={setSizeCode}
            onFrameChange={setFrame}
          />
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <PrintReviews item={reviews.item} all={reviews.all} />
        </div>
      </div>
    </div>
  );
}
