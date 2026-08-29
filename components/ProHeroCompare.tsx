"use client";

import { useState } from "react";

/**
 * Fine Art Pro hero: a drag-to-compare of the artwork the visitor just came from
 * (or a default detail crop). Both halves are the SAME image — the "Free" side is
 * blurred and dimmed (the same idiom as the download popup) to stand in for the
 * web-size preview, the "Pro" side is the crisp 4K original. A clip-path driven by
 * a range input reveals the free side to the left of the handle. No rotation — one
 * still image the visitor controls.
 */
export function ProHeroCompare({ src, alt }: { src: string; alt: string }) {
  const [v, setV] = useState(50);
  return (
    <div className="relative aspect-[799/1024] w-full select-none overflow-hidden">
      {/* Pro · crisp 4K original (base layer) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />

      {/* Free · web preview — blurred + a dimming layer, revealed left of the handle */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - v}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-[1.06] object-cover blur-[6px]" />
        <div className="absolute inset-0 bg-[#0f1115]/20" />
      </div>

      {/* divider + knob */}
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,.3)]" style={{ left: `${v}%` }} />
      <div className="pointer-events-none absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#333] shadow-lg" style={{ left: `${v}%` }} aria-hidden>
        <span className="text-lg leading-none">⇆</span>
      </div>

      {/* hint + labels */}
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
        Drag to compare
      </div>
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/55 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white backdrop-blur-sm">
        Free · web preview
      </span>
      <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-[#E4A23C] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#1a1a1a]">
        Pro · 4K
      </span>

      <input
        type="range"
        min={0}
        max={100}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        aria-label="Drag to compare the free web preview with the Pro 4K download"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
