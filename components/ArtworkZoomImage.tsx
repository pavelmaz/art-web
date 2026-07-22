"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type ArtworkZoomImageProps = {
  src: string;
  fullSrc?: string;
  alt: string;
  /** Pinterest save-button attributes (data-pin-url/media/description). Omit to leave unpinned. */
  pinAttrs?: {
    "data-pin-url": string;
    "data-pin-media": string;
    "data-pin-description": string;
  };
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const WHEEL_STEP = 0.5;
const BUTTON_STEP = 0.5;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 300;

function clampNum(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function ArtworkZoomImage({ src, fullSrc, alt, pinAttrs }: ArtworkZoomImageProps) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number }>({ t: 0, x: 0, y: 0 });
  const view = useRef({ scale: 1, tx: 0, ty: 0 });

  const commit = useCallback((s: number, x: number, y: number) => {
    view.current = { scale: s, tx: x, ty: y };
    setScale(s);
    setTx(x);
    setTy(y);
  }, []);

  const reset = useCallback(() => {
    commit(MIN_ZOOM, 0, 0);
    pinchRef.current = null;
    pointers.current.clear();
    setDragging(false);
  }, [commit]);

  const close = useCallback(() => {
    reset();
    setOpen(false);
  }, [reset]);

  /** Keep the image from being dragged completely out of view. */
  const clampOffset = useCallback((nx: number, ny: number, s: number) => {
    const vp = viewportRef.current?.getBoundingClientRect();
    const img = imgRef.current;
    if (!vp || !img) {
      return { x: nx, y: ny };
    }
    const maxX = Math.max(0, (img.clientWidth * s - vp.width) / 2);
    const maxY = Math.max(0, (img.clientHeight * s - vp.height) / 2);
    return { x: clampNum(nx, -maxX, maxX), y: clampNum(ny, -maxY, maxY) };
  }, []);

  /** Zoom to a new scale while keeping the focal screen point stationary. */
  const zoomTo = useCallback(
    (rawScale: number, focalX: number, focalY: number) => {
      const vp = viewportRef.current?.getBoundingClientRect();
      if (!vp) {
        return;
      }
      const next = clampNum(Number(rawScale.toFixed(3)), MIN_ZOOM, MAX_ZOOM);
      const { scale: s, tx: cx, ty: cy } = view.current;
      if (next === s) {
        return;
      }
      if (next === MIN_ZOOM) {
        commit(MIN_ZOOM, 0, 0);
        return;
      }
      const centerX = vp.left + vp.width / 2;
      const centerY = vp.top + vp.height / 2;
      const focalVecX = focalX - (centerX + cx);
      const focalVecY = focalY - (centerY + cy);
      const factor = 1 - next / s;
      const clamped = clampOffset(cx + focalVecX * factor, cy + focalVecY * factor, next);
      commit(next, clamped.x, clamped.y);
    },
    [clampOffset, commit],
  );

  const zoomAtCenter = useCallback(
    (rawScale: number) => {
      const vp = viewportRef.current?.getBoundingClientRect();
      if (!vp) {
        return;
      }
      zoomTo(rawScale, vp.left + vp.width / 2, vp.top + vp.height / 2);
    },
    [zoomTo],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      } else if (event.key === "+" || event.key === "=") {
        zoomAtCenter(view.current.scale + BUTTON_STEP);
      } else if (event.key === "-") {
        zoomAtCenter(view.current.scale - BUTTON_STEP);
      } else if (event.key === "0") {
        reset();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, zoomAtCenter, reset, close]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const node = viewportRef.current;
    if (!node) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      zoomTo(view.current.scale + direction * WHEEL_STEP, event.clientX, event.clientY);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [open, zoomTo]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      pinchRef.current = { dist: distance(p1, p2), scale: view.current.scale };
      return;
    }

    if (pointers.current.size === 1) {
      setDragging(true);
      const now = Date.now();
      const last = lastTapRef.current;
      const isDoubleTap =
        now - last.t < DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - last.x, event.clientY - last.y) < 30;
      if (isDoubleTap) {
        if (view.current.scale > MIN_ZOOM) {
          reset();
        } else {
          zoomTo(DOUBLE_TAP_ZOOM, event.clientX, event.clientY);
        }
        lastTapRef.current = { t: 0, x: 0, y: 0 };
      } else {
        lastTapRef.current = { t: now, x: event.clientX, y: event.clientY };
      }
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(event.pointerId);
    if (!prev) {
      return;
    }
    const current = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, current);

    if (pointers.current.size >= 2 && pinchRef.current) {
      const [p1, p2] = [...pointers.current.values()];
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const nextScale = pinchRef.current.scale * (distance(p1, p2) / pinchRef.current.dist);
      zoomTo(nextScale, mid.x, mid.y);
      return;
    }

    if (pointers.current.size === 1) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      const { tx: cx, ty: cy, scale: s } = view.current;
      const clamped = clampOffset(cx + dx, cy + dy, s);
      commit(s, clamped.x, clamped.y);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      pinchRef.current = null;
    }
    if (pointers.current.size === 0) {
      setDragging(false);
    }
  };

  const cursorClass = scale > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in";

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          reset();
          setOpen(true);
        }}
        className="group flex w-full cursor-zoom-in justify-center"
      >
        <img
          src={src}
          alt={alt}
          className="artwork-img artwork-img--hero shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-opacity group-hover:opacity-95"
          {...pinAttrs}
        />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/90">
          <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => zoomAtCenter(view.current.scale - BUTTON_STEP)}
              className="rounded-md bg-white/15 px-3 py-2 text-sm text-white transition-colors hover:bg-white/25"
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => zoomAtCenter(view.current.scale + BUTTON_STEP)}
              className="rounded-md bg-white/15 px-3 py-2 text-sm text-white transition-colors hover:bg-white/25"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-white/15 px-3 py-2 text-sm text-white transition-colors hover:bg-white/25"
              aria-label="Reset zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-md bg-white/15 px-3 py-2 text-sm text-white transition-colors hover:bg-white/25"
            >
              Close
            </button>
          </div>

          <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center text-xs text-white/70">
            Scroll or pinch to zoom · drag to move · double-click to zoom
          </p>

          <div
            ref={viewportRef}
            className={`flex h-full w-full touch-none items-center justify-center overflow-hidden p-4 sm:p-8 ${cursorClass}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              ref={imgRef}
              src={fullSrc || src}
              alt={alt}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain"
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: "center center",
                willChange: "transform",
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
