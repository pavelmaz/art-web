"use client";

import { useState } from "react";

import type { PrintReview } from "@/lib/print-reviews";

function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[#222]" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8L12 2.8z"
            fill={i <= Math.round(rating) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

function ReviewItem({ review }: { review: PrintReview }) {
  return (
    <li className="border-b border-[#e8e6e1] py-6 last:border-b-0">
      <Stars rating={review.rating} size={16} />
      <p className="mt-2 text-base leading-relaxed text-[#222]">{review.text}</p>
      {review.purchased ? <p className="mt-2 text-sm text-[#595959]">Purchased: {review.purchased}</p> : null}
      <div className="mt-3 flex items-center gap-2.5 text-sm text-[#595959]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8e6e1] font-semibold text-[#222]">
          {review.name.charAt(0)}
        </span>
        <span className="font-semibold text-[#222]">{review.name}</span>
        <span>
          {new Date(review.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
    </li>
  );
}

/** Etsy-style reviews block: summary, "this item" / "all prints" tabs, list. */
export function PrintReviews({ item, all }: { item: PrintReview[]; all: PrintReview[] }) {
  const [tab, setTab] = useState<"item" | "all">("item");
  const shown = tab === "item" ? item : all;
  const average = all.length ? all.reduce((sum, r) => sum + r.rating, 0) / all.length : 0;
  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: all.filter((r) => Math.round(r.rating) === stars).length,
  }));

  const tabClass = (active: boolean) =>
    `border-b-2 pb-2.5 text-sm font-semibold transition ${
      active ? "border-[#222] text-[#222]" : "border-transparent text-[#595959] hover:text-[#222]"
    }`;

  return (
    <section aria-labelledby="print-reviews-heading" className="border-t border-[#e8e6e1] pt-8 lg:border-t-0 lg:pt-2">
      <h2 id="print-reviews-heading" className="flex items-center gap-2.5 text-xl font-semibold text-[#222]">
        Reviews for this item
        <span className="rounded-full bg-[#e8e6e1] px-2.5 py-0.5 text-sm font-semibold">{item.length}</span>
      </h2>

      <div className="mt-5 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10">
        <div>
          <p className="text-4xl font-semibold text-[#222]">{all.length ? average.toFixed(1) : "–"}</p>
          <div className="mt-1.5">
            <Stars rating={average} />
          </div>
          <p className="mt-1 text-sm text-[#595959]">
            {all.length} {all.length === 1 ? "review" : "reviews"} for framed prints
          </p>
        </div>
        <ul className="space-y-1.5">
          {breakdown.map(({ stars, count }) => (
            <li key={stars} className="flex items-center gap-3 text-sm text-[#595959]">
              <span className="w-12 shrink-0">{stars} star</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#e8e6e1]">
                <span
                  className="block h-full rounded-full bg-[#222]"
                  style={{
                    width: all.length ? `${(count / all.length) * 100}%` : "0%",
                  }}
                />
              </span>
              <span className="w-6 shrink-0 text-right tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7 flex gap-6 border-b border-[#e8e6e1]" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "item"}
          onClick={() => setTab("item")}
          className={tabClass(tab === "item")}
        >
          This item ({item.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          onClick={() => setTab("all")}
          className={tabClass(tab === "all")}
        >
          All framed prints ({all.length})
        </button>
      </div>

      {shown.length ? (
        <ul>
          {shown.map((r) => (
            <ReviewItem key={`${r.artworkSlug}-${r.name}-${r.date}`} review={r} />
          ))}
        </ul>
      ) : (
        <div className="py-8 text-center">
          <Stars rating={0} size={22} />
          <p className="mt-3 text-base font-semibold text-[#222]">No reviews yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-[#595959]">
            Framed prints are new here. Reviews from customers who bought one will appear here once their print arrives.
          </p>
        </div>
      )}
    </section>
  );
}
