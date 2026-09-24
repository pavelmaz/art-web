"use client";

import { useState } from "react";

import { FRAME_OPTIONS, isFrameKey, priceUsd, type CanvasSize, type FrameKey } from "@/lib/canvas-catalog";

type PrintProductPurchasePanelProps = {
  artworkSlug: string;
  title: string;
  artist: string | null;
  sizes: CanvasSize[];
  sizeCode: string;
  frame: FrameKey | "";
  onSizeChange: (code: string) => void;
  onFrameChange: (frame: FrameKey | "") => void;
};

const usd = (n: number) => `$${n}`;

function range(values: (number | null)[]): string {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return "unavailable";
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return lo === hi ? usd(lo) : `${usd(lo)} - ${usd(hi)}`;
}

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

  const allPrices = sizes.flatMap((s) => FRAME_OPTIONS.map((f) => priceUsd(s.code, f.key)));
  const minPrice = Math.min(...allPrices.filter((p): p is number => p !== null));
  const selectedPrice = sizeCode && frame ? priceUsd(sizeCode, frame) : null;

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
      <p className="text-3xl font-semibold text-[#222]">
        {selectedPrice ? usd(selectedPrice) : `${usd(minPrice)}+`}
      </p>
      <p className="mt-1 text-sm font-medium text-[#2e7d32]">Free shipping within the US</p>

      <h1 className="mt-4 text-lg leading-snug text-[#222]">{title} — Canvas Print, Museum-Quality Reproduction</h1>
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
                  {s.label} ({frame ? usd(priceUsd(s.code, frame) ?? 0) : range(FRAME_OPTIONS.map((f) => priceUsd(s.code, f.key)))})
                </option>
              ))}
            </select>
            {chevron}
          </div>
          {showMissing && !sizeCode ? <p className="mt-1.5 text-sm text-[#b3261e]">Please select an option</p> : null}
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
              {FRAME_OPTIONS.map((f) => {
                const label = sizeCode
                  ? priceUsd(sizeCode, f.key)
                  : null;
                const unavailable = sizeCode !== "" && label === null;
                return (
                  <option key={f.key} value={f.key} disabled={unavailable}>
                    {f.label} ({sizeCode ? (label ? usd(label) : "not available in this size") : range(sizes.map((s) => priceUsd(s.code, f.key)))})
                  </option>
                );
              })}
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
          <li>Printed on 400gsm cotton canvas, wrapped around 1.5&quot; (38mm) wooden stretcher bars</li>
          <li>Framed options sit in a float frame with a slim shadow gap around the canvas</li>
          <li>Printed from the museum&apos;s high-resolution scan of the original</li>
          <li>Ready to hang</li>
          <li>Made to order and shipped to your door</li>
        </ul>
      </div>
    </div>
  );
}
