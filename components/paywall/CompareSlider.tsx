"use client";

import Image from "next/image";
import { useState } from "react";

/** Drag-to-compare: the same artwork as a blurry "web preview" vs the crisp
 *  "4K original". Two stacked copies; the top (blurred) one is revealed by a
 *  clip-path the range input drives. */
export function CompareSlider({ src, alt }: { src: string; alt: string }) {
  const [v, setV] = useState(52);
  return (
    <div className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-2xl ring-1 ring-white/10">
      {/* base: sharp 4K */}
      <Image src={src} alt={alt} fill sizes="(max-width:768px) 100vw, 560px" className="object-cover" priority />
      {/* top: blurred web preview, clipped to the left of the handle */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - v}% 0 0)` }}>
        <Image src={src} alt="" fill sizes="(max-width:768px) 100vw, 560px" aria-hidden className="scale-[1.03] object-cover blur-[3px] saturate-[.88]" />
        <div className="absolute inset-0 bg-black/[0.06]" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.25)]" style={{ left: `${v}%` }} />
      <div className="pointer-events-none absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[15px] text-[#333] shadow-lg" style={{ left: `${v}%` }}>⇆</div>
      <span className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/55 px-2 py-1 text-[10px] font-medium tracking-wide text-white">WEB PREVIEW</span>
      <span className="pointer-events-none absolute bottom-3 right-3 rounded bg-[#3B6EA5] px-2 py-1 text-[10px] font-medium tracking-wide text-white">4K ORIGINAL</span>
      <input
        type="range"
        min={0}
        max={100}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        aria-label="Drag to compare web preview and 4K original"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
