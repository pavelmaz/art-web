"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { PRINT_PRODUCTS, PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/prodigi";

type PrintOptionsModalProps = {
  open: boolean;
  onClose: () => void;
  artworkSlug: string;
  title: string;
  imageUrl: string;
};

/**
 * A physical-goods purchase converts far better with a visual preview than a
 * bare size list — this reuses the same trick DownloadInterstitial already
 * uses (the page's own already-loaded image, restyled with pure CSS) instead
 * of sourcing photographed frame/room mockups, which is real asset-production
 * work saved for later. Category and format visually differ (canvas shadow /
 * print mat / card fold) so the preview is genuinely informative, not just
 * a label.
 */
function ProductPreview({
  category,
  imageUrl,
  size = "large",
}: {
  category: ProductCategory;
  imageUrl: string;
  size?: "small" | "large";
}) {
  const tile: React.CSSProperties = imageUrl
    ? { backgroundImage: `url("${imageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};
  const box = size === "large" ? "h-40" : "h-20";

  if (category === "wall-art") {
    return (
      <div className={`flex ${box} w-full items-center justify-center rounded-md bg-[#e5e0d8] p-3`}>
        <div
          className="h-full w-3/4 rounded-[2px] shadow-[0_10px_20px_-6px_rgba(0,0,0,0.45)]"
          style={tile}
          aria-hidden
        />
      </div>
    );
  }

  if (category === "cards-stationery") {
    return (
      <div className={`flex ${box} w-full items-center justify-center rounded-md bg-[#e5e0d8] p-3`}>
        <div className="relative h-full w-2/3 rounded-sm bg-white p-1 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.35)]">
          <div style={tile} className="h-full w-full rounded-[1px]" aria-hidden />
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/10" aria-hidden />
        </div>
      </div>
    );
  }

  // prints-posters: flat print with a white mat border
  return (
    <div className={`flex ${box} w-full items-center justify-center rounded-md bg-[#e5e0d8] p-3`}>
      <div className="h-full w-3/4 rounded-[1px] bg-white p-1.5 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.35)]">
        <div style={tile} className="h-full w-full" aria-hidden />
      </div>
    </div>
  );
}

export function PrintOptionsModal({ open, onClose, artworkSlug, title, imageUrl }: PrintOptionsModalProps) {
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productKey, setProductKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const categoryDef = category ? PRODUCT_CATEGORIES.find((c) => c.key === category) : null;
  const products = categoryDef?.productKeys.map((key) => ({ key, ...PRINT_PRODUCTS[key] })) ?? [];
  const selected = productKey ? PRINT_PRODUCTS[productKey] : products[0];

  const reset = () => {
    setCategory(null);
    setProductKey(null);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const chooseCategory = (key: ProductCategory) => {
    setCategory(key);
    const defaults = PRODUCT_CATEGORIES.find((c) => c.key === key)?.productKeys ?? [];
    setProductKey(defaults[0] ?? null);
  };

  const handleOrder = async () => {
    if (!productKey) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/print-orders/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkSlug, productKey }),
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

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-options-title"
      onClick={close}
    >
      <div
        className="max-h-[85vh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p id="print-options-title" className="text-[17px] font-semibold text-[#1a1a1a]">
            {category ? categoryDef?.label : "Choose a format"}
          </p>
          <button type="button" onClick={close} className="text-[#999] hover:text-[#1a1a1a]" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-[#6b6b6b]">{title}</p>

        {!category ? (
          <div className="mt-4 space-y-2.5">
            {PRODUCT_CATEGORIES.map((c) => {
              const first = PRINT_PRODUCTS[c.productKeys[0]];
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => chooseCategory(c.key)}
                  className="flex w-full items-center gap-3 rounded-lg border border-[#e8e6e1] p-2.5 text-left transition-colors hover:border-[#1a1a1a]"
                >
                  <div className="w-24 shrink-0">
                    <ProductPreview category={c.key} imageUrl={imageUrl} size="small" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#1a1a1a]">{c.label}</p>
                    <p className="text-xs text-[#999]">From ${(first.retailCents / 100).toFixed(0)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4">
            <ProductPreview category={category} imageUrl={imageUrl} size="large" />

            {products.length > 1 ? (
              <div className="mt-3 flex gap-1.5">
                {products.map((p) => {
                  const isSelected = p.key === productKey;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setProductKey(p.key)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-center text-xs transition-colors ${
                        isSelected
                          ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                          : "border-[#d8d5cf] bg-white text-[#4a4a4a] hover:border-[#1a1a1a]"
                      }`}
                    >
                      <span className="block font-medium">{p.label}</span>
                      <span className="block">${(p.retailCents / 100).toFixed(0)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-center text-[13px] text-[#4a4a4a]">{selected?.label}</p>
            )}

            <button
              type="button"
              onClick={() => {
                setCategory(null);
                setProductKey(null);
              }}
              className="mt-3 text-xs text-[#6b6b6b] underline hover:text-[#1a1a1a]"
            >
              ← Choose a different format
            </button>

            <button
              type="button"
              onClick={handleOrder}
              disabled={busy || !selected}
              className="mt-3 flex h-9 w-full items-center justify-center rounded-md bg-[#4CAF50] text-sm font-medium text-white transition-colors hover:bg-[#43A047] disabled:opacity-60"
            >
              {busy
                ? "Starting checkout…"
                : `Order ${categoryDef?.label} — $${selected ? (selected.retailCents / 100).toFixed(0) : ""}`}
            </button>

            {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
