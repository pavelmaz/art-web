"use client";

import { useId, useState } from "react";

export type FineArtProFaqItem = {
  question: string;
  answer: string;
};

type FineArtProFaqProps = {
  items: readonly FineArtProFaqItem[];
};

export function FineArtProFaq({ items }: FineArtProFaqProps) {
  const baseId = useId();
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set());

  const toggle = (index: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="mt-10 border-t border-black/25">
      {items.map((item, index) => {
        const isOpen = openSet.has(index);
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div key={item.question} className="border-b border-black/25">
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(index)}
              className="flex w-full items-start gap-3 py-4 text-left text-[15px] leading-snug text-black transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#E3D1B4] sm:text-base"
            >
              <span className="mt-0.5 w-5 shrink-0 font-light tabular-nums text-black" aria-hidden>
                {isOpen ? "−" : "+"}
              </span>
              <span className="min-w-0">{item.question}</span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={isOpen ? "block pb-4 pl-8 pr-1" : "hidden"}
            >
              <p className="text-[15px] leading-relaxed text-black/90 sm:text-base">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
