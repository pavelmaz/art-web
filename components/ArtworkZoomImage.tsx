"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

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
  const [magnifyMode, setMagnifyMode] = useState(false);
  const [origin, setOrigin] = useState("center center");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    moved: false,
  });

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
        setOrigin("center center");
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) return;
    setZoom(1);
    setOrigin("center center");
    setPan({ x: 0, y: 0 });
    setMagnifyMode(false);
    setIsDragging(false);
    dragStateRef.current.active = false;
  }, [open]);

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const resetZoom = () => {
    setZoom(1);
    setOrigin("center center");
    setPan({ x: 0, y: 0 });
    setMagnifyMode(false);
    setIsDragging(false);
  };

  const zoomAtPoint = (clientX: number, clientY: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  };

  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom <= 1 || magnifyMode) return;
    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      moved: false,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updatePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragStateRef.current;
    if (!d.active || d.pointerId !== event.pointerId) return;
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      d.moved = true;
    }
    setPan({
      x: d.startPanX + dx,
      y: d.startPanY + dy,
    });
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragStateRef.current;
    if (d.active && d.pointerId === event.pointerId) {
      dragStateRef.current.active = false;
      dragStateRef.current.pointerId = -1;
      setIsDragging(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // no-op if capture was already released
      }
    }
  };

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
              onClick={() => setMagnifyMode((v) => !v)}
              className={
                magnifyMode
                  ? "rounded-md bg-white px-3 py-2 text-sm text-black"
                  : "rounded-md bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
              }
              aria-label="Toggle point zoom mode"
              title="Magnify point mode"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
                <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10.5 7.5V13.5M7.5 10.5H13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={resetZoom}
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

          <div className="relative z-[1] flex h-full w-full items-center justify-center overflow-auto p-8" onClick={(e) => e.stopPropagation()}>
            {/* keep transform on wrapper so Next image sizing remains predictable */}
            <div
              style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`, transformOrigin: origin }}
              className={magnifyMode ? "cursor-zoom-in" : zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}
              onPointerDown={beginPan}
              onPointerMove={updatePan}
              onPointerUp={endPan}
              onPointerCancel={endPan}
              onClick={(event) => {
                if (!magnifyMode || dragStateRef.current.moved) return;
                zoomAtPoint(event.clientX, event.clientY, event.currentTarget as HTMLElement);
              }}
            >
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
