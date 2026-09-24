"use client";

import { useState } from "react";

import { PrintProductGallery } from "@/components/PrintProductGallery";
import { PrintProductPurchasePanel } from "@/components/PrintProductPurchasePanel";
import { sizesForArtwork, type FrameKey } from "@/lib/canvas-catalog";

export function PrintProductPage({
  artworkSlug,
  title,
  artist,
  imageUrl,
  imgWidth,
  imgHeight,
}: {
  artworkSlug: string;
  title: string;
  artist: string | null;
  imageUrl: string;
  imgWidth: number;
  imgHeight: number;
}) {
  const sizes = sizesForArtwork(imgWidth, imgHeight);
  const [sizeCode, setSizeCode] = useState("");
  const [frame, setFrame] = useState<FrameKey | "">("");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <PrintProductGallery imageUrl={imageUrl} title={title} aspect={imgWidth / imgHeight} frame={frame || "canvas"} />
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
    </div>
  );
}
