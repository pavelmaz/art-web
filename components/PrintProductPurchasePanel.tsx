"use client";

import { useState } from "react";

import { PRINT_PRODUCTS, PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/prodigi";

type PrintProductPurchasePanelProps = {
  artworkSlug: string;
  title: string;
  category: ProductCategory;
  productKey: string;
  onCategoryChange: (category: ProductCategory) => void;
  onProductChange: (productKey: string) => void;
};

export function PrintProductPurchasePanel({
  artworkSlug,
  title,
  category,
  productKey,
  onCategoryChange,
  onProductChange,
}: PrintProductPurchasePanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryDef = PRODUCT_CATEGORIES.find((c) => c.key === category)!;
  const products = categoryDef.productKeys.map((key) => ({ key, ...PRINT_PRODUCTS[key] }));
  const selected = PRINT_PRODUCTS[productKey];

  // Prints & Posters and Cards & Stationery are hidden for now (wall art
  // only, until that's dialed in) — the categories and checkout logic stay
  // intact so re-enabling them later is just removing this filter.
  const enabledCategories = PRODUCT_CATEGORIES.filter((c) => c.key === "wall-art");

  const handleOrder = async () => {
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

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#999]">Fine Art Free</p>
      <h1 className="mt-1 text-2xl font-semibold text-[#1a1a1a]">{title}</h1>
      <p className="mt-1 text-sm text-[#6b6b6b]">Museum-quality print, made to order and shipped to your door.</p>

      <p className="mt-5 text-2xl font-semibold text-[#1a1a1a]">
        ${selected ? (selected.retailCents / 100).toFixed(0) : ""}
      </p>

      {enabledCategories.length > 1 ? (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#999]">Format</p>
          <div className="flex flex-wrap gap-2">
            {enabledCategories.map((c) => {
              const isSelected = c.key === category;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    onCategoryChange(c.key);
                    onProductChange(c.productKeys[0]);
                  }}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    isSelected
                      ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                      : "border-[#d8d5cf] bg-white text-[#4a4a4a] hover:border-[#1a1a1a]"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {products.length > 1 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#999]">Size</p>
          <div className="flex flex-wrap gap-2">
            {products.map((p) => {
              const isSelected = p.key === productKey;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onProductChange(p.key)}
                  className={`rounded-md border px-3 py-2 text-center text-sm transition-colors ${
                    isSelected
                      ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                      : "border-[#d8d5cf] bg-white text-[#4a4a4a] hover:border-[#1a1a1a]"
                  }`}
                >
                  <span className="block font-medium">{p.label}</span>
                  <span className="block text-xs opacity-80">${(p.retailCents / 100).toFixed(0)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : selected ? (
        <p className="mt-4 text-sm text-[#4a4a4a]">{selected.label}</p>
      ) : null}

      <button
        type="button"
        onClick={handleOrder}
        disabled={busy || !selected}
        className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-[#4CAF50] text-sm font-medium text-white transition-colors hover:bg-[#43A047] disabled:opacity-60"
      >
        {busy ? "Starting checkout…" : "Add to cart"}
      </button>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      <div className="mt-6 space-y-1.5 border-t border-[#e8e6e1] pt-4 text-xs text-[#6b6b6b]">
        <p>Printed and shipped to your door</p>
        <p>Made to order — please allow time for production before shipping</p>
      </div>
    </div>
  );
}
