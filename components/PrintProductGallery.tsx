"use client";

import { useMemo, useState } from "react";

import { ProductShot, WallMockup, type PrintGeometry } from "@/components/WallMockup";
import type { FrameKey } from "@/lib/print-catalog";
import { livingRoomsFor, type WallScene } from "@/lib/wall-scenes";

type PrintProductGalleryProps = {
  /** Seeds which living rooms this artwork shows. */
  artworkSlug: string;
  imageUrl: string;
  title: string;
  /** Real proportions of the size on show: frame, mount, window, fitted artwork. */
  geometry: PrintGeometry;
  frame: FrameKey;
};

/** The framed print first, then three living rooms (a different mix per
 *  artwork), then the frame colour samples. */
type Slide =
  | { kind: "product"; key: string; label: string }
  | { kind: "room"; key: string; label: string; scene: WallScene }
  | { kind: "frames"; key: string; label: string };

function SlideView({
  slide,
  imageUrl,
  geometry,
  frame,
  thumb,
}: { slide: Slide; thumb?: boolean } & Omit<PrintProductGalleryProps, "title" | "artworkSlug">) {
  if (slide.kind === "room") {
    return <WallMockup scene={slide.scene} artUrl={imageUrl} geometry={geometry} frame={frame} thumb={thumb} />;
  }
  if (slide.kind === "frames") {
    return (
      <div className="relative aspect-square w-full overflow-hidden bg-[#f6f6f6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/print-mockups/frame-colours${thumb ? "-thumb" : ""}.jpg`}
          alt={thumb ? "" : "The eight frame colours: walnut, gold, silver, dark grey, natural wood, black, white and light grey"}
          draggable={false}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }
  return <ProductShot artUrl={imageUrl} geometry={geometry} frame={frame} />;
}

export function PrintProductGallery({ title, artworkSlug, ...props }: PrintProductGalleryProps) {
  const slides = useMemo<Slide[]>(
    () => [
      { kind: "product", key: "product", label: "The print" },
      ...livingRoomsFor(artworkSlug).map((scene) => ({ kind: "room" as const, key: scene.id, label: scene.label, scene })),
      { kind: "frames", key: "frames", label: "Frame colours" },
    ],
    [artworkSlug]
  );
  const [active, setActive] = useState(0);
  const go = (delta: number) => setActive((i) => (i + delta + slides.length) % slides.length);

  return (
    <div className="relative">
      {/* Desktop: thumbnails in a column as tall as the main image, scrolling like Etsy's. */}
      <div className="relative md:pl-[88px]">
        <div className="relative overflow-hidden rounded-xl bg-[#efece6]">
          <SlideView slide={slides[active]} {...props} />
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#222] shadow-md transition hover:scale-105"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#222] shadow-md transition hover:scale-105"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:absolute md:inset-y-0 md:left-0 md:mt-0 md:w-[72px] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pb-0 md:pr-1">
          {slides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${slide.label} — ${title}`}
              aria-current={i === active}
              className={`w-16 shrink-0 overflow-hidden rounded-lg border-2 transition md:w-full ${
                i === active ? "border-[#222]" : "border-transparent opacity-80 hover:opacity-100"
              }`}
            >
              <SlideView slide={slide} thumb {...props} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
