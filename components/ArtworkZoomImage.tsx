"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const dragStateRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    moved: false,
  });

  const clampZoom = useCallback((z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +z.toFixed(2))), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
      if (event.key === "+" || event.key === "=") {
        setZoom((z) => clampZoom(z + ZOOM_STEP));
      }
      if (event.key === "-") {
        setZoom((z) => {
          const nz = clampZoom(z - ZOOM_STEP);
          if (nz === 1) setPan({ x: 0, y: 0 });
          return nz;
        });
      }
      if (event.key === "0") {
        setZoom(1);
        setOrigin("center center");
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, clampZoom]);

  useEffect(() => {
    if (open) return;
    setZoom(1);
    setOrigin("center center");
    setPan({ x: 0, y: 0 });
    setMagnifyMode(false);
    setIsDragging(false);
    dragStateRef.current.active = false;
  }, [open]);

  const resetZoom = () => {
    setZoom(1);
    setOrigin("center center");
    setPan({ x: 0, y: 0 });
    setMagnifyMode(false);
    setIsDragging(false);
    dragStateRef.current.active = false;
  };

  const zoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));
  const zoomOut = () =>
    setZoom((z) => {
      const nz = clampZoom(z - ZOOM_STEP);
      if (nz === 1) setPan({ x: 0, y: 0 });
      return nz;
    });

  const zoomAtPoint = (clientX: number, clientY: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    setZoom((z) => clampZoom(z + ZOOM_STEP));
  };

  /** Pan whenever zoomed — works with magnify mode: drag moves, click (no drag) zooms at point. */
  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    if (event.button !== 0) return;

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
        // ignore
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    const node = viewportRef.current;
    if (!node) return;

    const handler = (event: WheelEvent) => {
      const surface = node.querySelector<HTMLElement>("[data-zoom-surface]");
      if (!surface) return;
      event.preventDefault();

      const rect = surface.getBoundingClientRect();
      const cx = event.clientX;
      const cy = event.clientY;

      const prevZoom = zoomRef.current;
      const direction = event.deltaY > 0 ? -1 : 1;
      const nextZoom = clampZoom(prevZoom + direction * ZOOM_STEP);
      if (nextZoom === prevZoom) return;

      if (nextZoom === 1) {
        setPan({ x: 0, y: 0 });
        setOrigin("center center");
        zoomRef.current = 1;
        setZoom(1);
        return;
      }

      const ox = ((cx - rect.left) / rect.width) * 100;
      const oy = ((cy - rect.top) / rect.height) * 100;
      setOrigin(`${ox.toFixed(2)}% ${oy.toFixed(2)}%`);
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
    };

    node.addEventListener("wheel", handler, { passive: false });
    return () => node.removeEventListener("wheel", handler);
  }, [open, clampZoom]);

  const cursorClass =
    zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : magnifyMode ? "cursor-zoom-in" : "";

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
              title="Click image to zoom at a point"
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

          <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center text-xs text-white/70">
            {zoom > 1 ? "Drag with the mouse to move around · Scroll wheel to zoom" : "Scroll wheel or + to zoom"}
          </p>

          <div
            ref={viewportRef}
            className="relative z-[1] flex h-full w-full items-center justify-center overflow-hidden p-8 touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              data-zoom-surface
              style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`, transformOrigin: origin }}
              className={cursorClass}
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
                draggable={false}
                className="h-auto max-h-[85vh] w-auto object-contain select-none"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
