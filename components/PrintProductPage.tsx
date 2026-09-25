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
  const [sizeCode, setSizeCode] = useState("");
  const [frame, setFrame] = useState<FrameKey | "">("");
  // Until the customer picks, show a mid-range size exactly as it would arrive.
  const shown = sizes.find((s) => s.code === sizeCode) ?? sizes[Math.floor((sizes.length - 1) / 2)];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
      {/* Etsy layout: gallery then reviews on the left, purchase panel alongside on the right. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-12 lg:gap-y-10">
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
