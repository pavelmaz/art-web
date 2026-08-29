"use client";

import { useState } from "react";

/**
 * Fine Art Pro hero: a drag-to-compare of the artwork the visitor came from (or a
 * default detail crop). Like the download popup, it ZOOMS into the centre
 * (background-size) so the panels read as a detail — a whole painting shrunk to
 * this size looks identical at any resolution and proves nothing. Both halves are
 * the same image: the "Free download" side is blurred + dimmed to stand in for the
 * web-size file, the "Pro · 4K" side is crisp. A clip-path driven by a range input
 * reveals the free side to the left of the handle. One still image the visitor
 * controls — no rotation.
 */
export function ProHeroCompare({ src, alt }: { src: string; alt: string }) {
  const [v, setV] = useState(50);
  const tile: React.CSSProperties = {
    backgroundImage: `url("${src}")`,
    backgroundSize: "280%",
    backgroundPosition: "center",
  };
  return (
    <div className="relative aspect-[799/1024] w-full select-none overflow-hidden" role="img" aria-label={alt}>
      {/* Pro · crisp 4K original (base layer, zoomed detail) */}
      <div className="absolute inset-0 bg-no-repeat" style={tile} />

      {/* Free download · blurred + dimmed, revealed left of the handle */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - v}% 0 0)` }}>
        <div className="absolute inset-0 bg-no-repeat" style={{ ...tile, filter: "blur(6px)" }} aria-hidden />
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
        Free download
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
        aria-label="Drag to compare the free download with the Pro 4K download"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
