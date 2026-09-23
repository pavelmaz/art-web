"use client";

import { useState } from "react";

import { PrintOptionsModal } from "@/components/PrintOptionsModal";

type BuyCanvasRowProps = {
  artworkSlug: string;
  title: string;
  imageUrl: string;
  glass?: boolean;
};

/**
 * Van Gogh-only test (English locale only — see the print-on-demand plan):
 * a real physical print, fulfilled by Prodigi behind the scenes. This row is
 * just the entry point — format/size selection and the visual preview live
 * in PrintOptionsModal.
 *
 * Reads `?print_order=success` via plain `window.location.search` (a lazy
 * useState initializer) rather than `useSearchParams()`, which would force a
 * Suspense boundary around this component on an otherwise server-rendered page.
 */
export function BuyCanvasRow({ artworkSlug, title, imageUrl, glass = false }: BuyCanvasRowProps) {
  const [justOrdered] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print_order") === "success"
  );
  const [modalOpen, setModalOpen] = useState(false);

  if (justOrdered) {
    return (
      <div className={`rounded-lg p-3 ${glass ? "glass-inset" : "bg-[#eceff3]"}`}>
        <p className="text-[13px] font-medium text-[#1a1a1a]">Your order is on its way</p>
        <p className="mt-0.5 text-xs text-[#6b6b6b]">
          We&apos;ll email you tracking details once it ships.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center justify-between gap-2 rounded-lg p-3 ${glass ? "glass-inset" : "bg-[#eceff3]"}`}>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[#1a1a1a]">Buy on Canvas</p>
          <p className="text-xs text-[#999]">Printed and shipped to your door</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#4CAF50] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#43A047]"
        >
          Order Canvas Print
        </button>
      </div>

      <PrintOptionsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        artworkSlug={artworkSlug}
        title={title}
        imageUrl={imageUrl}
      />
    </>
  );
}
