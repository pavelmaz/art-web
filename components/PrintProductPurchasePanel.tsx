"use client";

import { useState } from "react";

import { FRAME_OPTIONS, isFrameKey, priceUsd, type FrameKey, type PrintSize } from "@/lib/print-catalog";

type PrintProductPurchasePanelProps = {
  artworkSlug: string;
  title: string;
  artist: string | null;
  sizes: PrintSize[];
  sizeCode: string;
  frame: FrameKey | "";
  onSizeChange: (code: string) => void;
  onFrameChange: (frame: FrameKey | "") => void;
};

const usd = (n: number) => `$${n}`;

export function PrintProductPurchasePanel({
  artworkSlug,
  title,
  artist,
  sizes,
  sizeCode,
  frame,
  onSizeChange,
  onFrameChange,
}: PrintProductPurchasePanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);

  const prices = sizes.map((s) => priceUsd(s.code)).filter((p): p is number => p !== null);
  const minPrice = Math.min(...prices);
  const selected = sizes.find((s) => s.code === sizeCode);
  const selectedPrice = selected ? priceUsd(selected.code) : null;

  const handleBuy = async () => {
    if (!sizeCode || !frame) {
      setShowMissing(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/print-orders/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkSlug, size: sizeCode, frame }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't start checkout. Please try again.");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const selectClass = (missing: boolean) =>
    `h-14 w-full appearance-none rounded-lg border bg-white px-4 pr-10 text-base text-[#222] outline-none transition focus:border-[#222] focus:ring-2 focus:ring-[#222]/15 ${
      missing ? "border-[#b3261e]" : "border-[#bcb9b3]"
    }`;
  const chevron = (
    <svg
      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#222]"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden
    >
      <path d="M1 3.5l5 5 5-5" fill="currentColor" />
    </svg>
  );

  return (
    <div className="lg:pt-2">
      <p className="text-3xl font-semibold text-[#222]">{selectedPrice ? usd(selectedPrice) : `${usd(minPrice)}+`}</p>
      <p className="mt-1 text-sm font-medium text-[#2e7d32]">Free shipping within the US</p>

      <h1 className="mt-4 text-lg leading-snug text-[#222]">{title} — Framed Art Print, Museum-Quality Reproduction</h1>
      {artist ? <p className="mt-1 text-sm font-semibold text-[#222]">{artist}</p> : null}
      <p className="mt-0.5 text-sm text-[#6b6b6b]">Sold by Fine Art Free</p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="print-size" className="mb-2 block text-sm font-semibold text-[#222]">
            Dimensions
          </label>
          <div className="relative">
            <select
              id="print-size"
              value={sizeCode}
              onChange={(e) => onSizeChange(e.target.value)}
              className={selectClass(showMissing && !sizeCode)}
            >
              <option value="">Select an option</option>
              {sizes.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label} ({usd(priceUsd(s.code) ?? 0)})
                </option>
              ))}
            </select>
            {chevron}
          </div>
          {showMissing && !sizeCode ? <p className="mt-1.5 text-sm text-[#b3261e]">Please select an option</p> : null}
          {selected ? (
            <p className="mt-1.5 text-sm text-[#6b6b6b]">
              Frame {selected.widthIn}&quot; × {selected.heightIn}&quot; · printed image {selected.imageWidthIn}&quot; ×{" "}
              {selected.imageHeightIn}&quot; inside a white mount
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="print-frame" className="mb-2 block text-sm font-semibold text-[#222]">
            Frame Options
          </label>
          <div className="relative">
            <select
              id="print-frame"
              value={frame}
              onChange={(e) => onFrameChange(isFrameKey(e.target.value) ? e.target.value : "")}
              className={selectClass(showMissing && !frame)}
            >
              <option value="">Select an option</option>
              {FRAME_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            {chevron}
          </div>
          {showMissing && !frame ? <p className="mt-1.5 text-sm text-[#b3261e]">Please select an option</p> : null}
        </div>
      </div>

      <button
        type="button"
        onClick={handleBuy}
        disabled={busy}
        className="mt-7 flex h-14 w-full items-center justify-center rounded-full bg-[#222] text-base font-semibold text-white transition-colors hover:bg-black disabled:opacity-60"
      >
        {busy ? "Starting checkout…" : "Buy now"}
      </button>
      {error ? <p className="mt-2 text-sm text-[#b3261e]">{error}</p> : null}

      <div className="mt-8 border-t border-[#e8e6e1] pt-6">
        <h2 className="text-base font-semibold text-[#222]">Item details</h2>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[#4a4a4a]">
          <li>Giclée print on 200gsm museum-grade matte fine art paper</li>
          <li>Classic wooden frame with a white mount around the print</li>
          <li>Protected by shatterproof acrylic glazing</li>
          <li>Printed from the museum&apos;s high-resolution scan of the original</li>
          <li>Arrives ready to hang</li>
          <li>Made to order and shipped to your door</li>
        </ul>
      </div>
    </div>
  );
}
