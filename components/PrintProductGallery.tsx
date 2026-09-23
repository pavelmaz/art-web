"use client";

import { useState } from "react";

import { MOCKUP_TEMPLATES } from "@/lib/print-mockup-templates";
import type { ProductCategory } from "@/lib/prodigi";

type PrintProductGalleryProps = {
  imageUrl: string;
  title: string;
  category: ProductCategory;
};

/** The artwork itself, styled to read as the chosen category — same
 *  treatments as the original modal (canvas shadow / print mat / card fold),
 *  just reusable at any size so it can sit inside a room photo's wallRect
 *  or stand alone as a flat product shot. */
function StyledArtwork({
  category,
  imageUrl,
  fill = false,
}: {
  category: ProductCategory;
  imageUrl: string;
  fill?: boolean;
}) {
  const tile: React.CSSProperties = imageUrl
    ? { backgroundImage: `url("${imageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};
  const base = fill ? "h-full w-full" : "aspect-[4/5] w-full max-w-xs";

  if (category === "wall-art") {
    return <div className={`${base} rounded-[2px] shadow-[0_10px_24px_-6px_rgba(0,0,0,0.5)]`} style={tile} aria-hidden />;
  }
  if (category === "cards-stationery") {
    return (
      <div className={`${base} relative rounded-sm bg-white p-2 shadow-[0_10px_20px_-6px_rgba(0,0,0,0.35)]`}>
        <div style={tile} className="h-full w-full rounded-[1px]" aria-hidden />
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/10" aria-hidden />
      </div>
    );
  }
  // prints-posters: white mat border
  return (
    <div className={`${base} rounded-[1px] bg-white p-2.5 shadow-[0_10px_20px_-6px_rgba(0,0,0,0.35)]`}>
      <div style={tile} className="h-full w-full" aria-hidden />
    </div>
  );
}

function RoomMockup({
  category,
  imageUrl,
  template,
}: {
  category: ProductCategory;
  imageUrl: string;
  template: (typeof MOCKUP_TEMPLATES)[number];
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-[#f1efea]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={template.imageUrl} alt="" className="block w-full" aria-hidden />
      <div
        className="absolute"
        style={{
          top: `${template.wallRect.top}%`,
          left: `${template.wallRect.left}%`,
          width: `${template.wallRect.width}%`,
          height: `${template.wallRect.height}%`,
        }}
      >
        <StyledArtwork category={category} imageUrl={imageUrl} fill />
      </div>
    </div>
  );
}

export function PrintProductGallery({ imageUrl, title, category }: PrintProductGalleryProps) {
  const showRoomMockups = category !== "cards-stationery";
  const slides = showRoomMockups
    ? [{ kind: "flat" as const }, ...MOCKUP_TEMPLATES.map((t) => ({ kind: "room" as const, template: t }))]
    : [{ kind: "flat" as const }, { kind: "flat" as const }];

  const [activeIndex, setActiveIndex] = useState(0);

  // The category's visual treatment differs enough (canvas/poster/card) that
  // an index from a previous category's slide set may point at the wrong
  // kind of thumbnail — reset to the flat shot whenever category changes.
  // Adjusted during render (React's recommended pattern for this) rather
  // than in an effect, which would cause an extra cascading render.
  const [prevCategory, setPrevCategory] = useState(category);
  if (category !== prevCategory) {
    setPrevCategory(category);
    setActiveIndex(0);
  }

  const active = slides[activeIndex] ?? slides[0];

  return (
    <div>
      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-[#f1efea] p-6">
        {active.kind === "room" ? (
          <div className="w-full">
            <RoomMockup category={category} imageUrl={imageUrl} template={active.template} />
          </div>
        ) : (
          <StyledArtwork category={category} imageUrl={imageUrl} />
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {slides.map((slide, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`aspect-square overflow-hidden rounded-md border bg-[#f1efea] transition-colors ${
              i === activeIndex ? "border-[#1a1a1a]" : "border-[#e8e6e1] hover:border-[#b8b5af]"
            }`}
            aria-label={slide.kind === "room" ? slide.template.label : `${title} — full view`}
          >
            {slide.kind === "room" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.template.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
