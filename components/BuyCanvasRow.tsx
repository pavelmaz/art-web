"use client";

import { useState } from "react";

import { CANVAS_SIZES, type CanvasSize } from "@/lib/prodigi";

type BuyCanvasRowProps = {
  artworkSlug: string;
  glass?: boolean;
};

const SIZE_ORDER: CanvasSize[] = ["12x16", "16x20", "24x32"];

/**
 * Van Gogh-only test (English locale only — see the print-on-demand plan):
 * a real physical canvas print, fulfilled by Prodigi behind the scenes.
 * Checkout stays on fineartfree.com via Stripe, same redirect pattern as
 * FineArtProJoinAuth — this is deliberately not wired into i18n yet since
 * the whole feature is scoped to one locale for this pass.
 *
 * Reads `?print_order=success` via plain `window.location.search` (a lazy
 * useState initializer) rather than `useSearchParams()`, which would force a
 * Suspense boundary around this component on an otherwise server-rendered page.
 */
export function BuyCanvasRow({ artworkSlug, glass = false }: BuyCanvasRowProps) {
  const [justOrdered] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print_order") === "success"
  );

  const [size, setSize] = useState<CanvasSize>("16x20");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (justOrdered) {
    return (
      <div className={`rounded-lg p-3 ${glass ? "glass-inset" : "bg-[#eceff3]"}`}>
        <p className="text-[13px] font-medium text-[#1a1a1a]">Your canvas print is on its way</p>
        <p className="mt-0.5 text-xs text-[#6b6b6b]">
          We&apos;ll email you tracking details once it ships.
        </p>
      </div>
    );
  }

  const handleOrder = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/print-orders/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkSlug, size }),
      });
      let data: { url?: string; error?: string } = {};
      try {
        data = (await res.json()) as { url?: string; error?: string };
      } catch {
        setError("Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      setBusy(false);
      if (!res.ok) {
        setError(data.error ?? "Checkout failed. Please try again.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Couldn't start checkout. Please try again.");
      }
    } catch {
      setBusy(false);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className={`rounded-lg p-3 ${glass ? "glass-inset" : "bg-[#eceff3]"}`}>
      <p className="text-[13px] font-medium text-[#1a1a1a]">Buy on Canvas</p>
      <p className="text-xs text-[#999]">Printed and shipped to your door</p>

      <div className="mt-2 flex gap-1.5">
        {SIZE_ORDER.map((key) => {
          const option = CANVAS_SIZES[key];
          const selected = key === size;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSize(key)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-center text-xs transition-colors ${
                selected
                  ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                  : "border-[#d8d5cf] bg-white text-[#4a4a4a] hover:border-[#1a1a1a]"
              }`}
            >
              <span className="block font-medium">{option.label}</span>
              <span className="block">${(option.retailCents / 100).toFixed(0)}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleOrder}
        disabled={busy}
        className="mt-2 flex h-9 w-full items-center justify-center rounded-md bg-[#4CAF50] text-sm font-medium text-white transition-colors hover:bg-[#43A047] disabled:opacity-60"
      >
        {busy ? "Starting checkout…" : `Order Canvas Print — $${(CANVAS_SIZES[size].retailCents / 100).toFixed(0)}`}
      </button>

      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
