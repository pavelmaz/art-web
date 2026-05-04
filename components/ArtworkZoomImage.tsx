"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ArtworkZoomImageProps = {
  src: string;
  alt: string;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export function ArtworkZoomImage({ src, alt }: ArtworkZoomImageProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
      if (event.key === "+" || event.key === "=") {
        setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
      }
      if (event.key === "-") {
        setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
      }
      if (event.key === "0") {
        setZoom(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className="group block cursor-zoom-in"
      >
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={900}
          priority={true}
          unoptimized
          className="h-auto max-h-[70vh] w-auto object-contain shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-opacity group-hover:opacity-95"
        />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/90" onClick={() => setOpen(false)}>

          <div className="absolute right-4 top-4 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={zoomOut}
              className="rounded-md bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className="rounded-md bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="rounded-md bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
            >
              Close
            </button>
          </div>

          <div
            className="relative z-[1] flex h-full w-full items-center justify-center overflow-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* keep transform on wrapper so Next image sizing remains predictable */}
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
              <Image
                src={src}
                alt={alt}
                width={1600}
                height={1200}
                unoptimized
                className="h-auto max-h-[85vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
