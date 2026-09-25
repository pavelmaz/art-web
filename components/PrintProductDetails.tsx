"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

import type { PrintSize } from "@/lib/print-catalog";

/**
 * Etsy-style "Item details" and "Delivery and return policies" for the framed
 * print. Every claim comes from Prodigi (Products + Quotes API for GLOBAL-CFP,
 * and its Classic frames spec sheet): US orders are made in Prodigi's US lab in
 * ~72h and shipped UPS Ground; damaged or faulty items are reprinted or refunded
 * when reported within 14 days of delivery. Keep it that way — the page must
 * only promise what is delivered.
 */

/** Business days to print and frame, then UPS Ground transit (contiguous US). */
const PRODUCTION_DAYS = 3;
const TRANSIT_DAYS = { min: 1, max: 5 };
/** Covers an order placed after the lab's daily cutoff. */
const CUTOFF_BUFFER_DAYS = 1;

function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const weekday = d.getDay();
    if (weekday !== 0 && weekday !== 6) left--;
  }
  return d;
}

function deliveryWindow(now: Date): string {
  const first = addBusinessDays(now, PRODUCTION_DAYS + TRANSIT_DAYS.min);
  const last = addBusinessDays(now, PRODUCTION_DAYS + TRANSIT_DAYS.max + CUTOFF_BUFFER_DAYS);
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  return first.getMonth() === last.getMonth()
    ? `${month(first)} ${first.getDate()}–${last.getDate()}`
    : `${month(first)} ${first.getDate()}–${month(last)} ${last.getDate()}`;
}

const noSubscription = () => () => {};

const cm = (inches: number) => Math.round(inches * 2.54);

/* Icons: solid glyphs in the style of Etsy's listing page (drawn for this site). */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden
      className="shrink-0"
    >
      {children}
    </svg>
  );
}
const CalendarIcon = () => (
  <Glyph>
    <path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V2zM5 9v10h14V9H5zm9 5h3v3h-3v-3z" />
  </Glyph>
);
const BoxIcon = () => (
  <Glyph>
    <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm6 0v7.5l2-1.5 2 1.5V3h-4zM6 16v2h4v-2H6z" />
  </Glyph>
);
const CarIcon = () => (
  <Glyph>
    <path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11a2 2 0 0 1 2 2v4a1 1 0 0 1-1 1h-1v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2H8v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2H4a1 1 0 0 1-1-1v-4a2 2 0 0 1 2-2zm2.3 0h9.4l-1.1-3.2a.5.5 0 0 0-.5-.3H8.9a.5.5 0 0 0-.5.3L7.3 11zM6.5 13.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
  </Glyph>
);
const PinIcon = () => (
  <Glyph>
    <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
  </Glyph>
);

/* Highlight icons: outline, like Etsy's "Highlights" list. */
function Line({ d }: { d: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}
const PrinterIcon = () => <Line d="M7 8V3h10v5M7 17H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-3M7 13h10v8H7z" />;
const LayersIcon = () => <Line d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />;
const RulerIcon = () => <Line d="M3 17L17 3l4 4L7 21l-4-4zM7 13l2 2M10 10l2 2M13 7l2 2" />;
const HangIcon = () => <Line d="M12 3l-7 7M12 3l7 7M3 10h18v11H3z" />;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-t border-[#e8e6e1] py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-semibold text-[#222] [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          width="14"
          height="14"
          viewBox="0 0 12 12"
          aria-hidden
          className="transition-transform group-open:rotate-180"
        >
          <path d="M1 3.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-base leading-snug text-[#222]">
      {icon}
      <div className="min-w-0 pt-0.5">{children}</div>
    </li>
  );
}

/** Dotted-underlined phrase that reveals a short explanation, like Etsy's tooltips. */
function Explained({ label, children }: { label: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-left underline decoration-dashed decoration-1 underline-offset-4"
      >
        {label}
      </button>
      {open ? <span className="mt-1.5 block text-sm leading-relaxed text-[#595959]">{children}</span> : null}
    </>
  );
}

const ECO = [
  {
    src: "/images/print-mockups/eco-water-based-inks.png",
    label: "Water-based inks",
  },
  {
    src: "/images/print-mockups/eco-sustainably-sourced.png",
    label: "Sustainably sourced paper or wood",
  },
  {
    src: "/images/print-mockups/eco-local-fulfilment.png",
    label: "Made locally, in the US",
  },
];

export function PrintProductDetails({ sizes, selected }: { sizes: PrintSize[]; selected: PrintSize | undefined }) {
  // The page is cached for a day, so the dates come from the browser's clock
  // (the server renders a placeholder; the client fills it in after hydration).
  const arrival = useSyncExternalStore(
    noSubscription,
    () => deliveryWindow(new Date()),
    () => null,
  );

  const smallest = sizes[0];
  const largest = sizes[sizes.length - 1];
  const dimensions = selected
    ? `Width: ${cm(selected.widthIn)} cm (${selected.widthIn}"); Height: ${cm(selected.heightIn)} cm (${selected.heightIn}")`
    : `Sizes from ${cm(smallest.widthIn)}×${cm(smallest.heightIn)} cm to ${cm(largest.widthIn)}×${cm(largest.heightIn)} cm`;

  return (
    <div className="mt-8">
      <Section title="Item details">
        <p className="text-sm font-semibold text-[#222]">Highlights</p>
        <ul className="mt-3 space-y-3.5">
          <Row icon={<PrinterIcon />}>Printed and framed to order in the US</Row>
          <Row icon={<LayersIcon />}>Materials: solid wood frame, acrylic glazing, fine art paper</Row>
          <Row icon={<RulerIcon />}>{dimensions}</Row>
          <Row icon={<HangIcon />}>Arrives framed and ready to hang</Row>
        </ul>

        <p className="mt-5 text-base leading-relaxed text-[#222]">
          A giclée reproduction printed from the museum&apos;s high-resolution scan of the original, on Enhanced Matte
          Art (EMA) 200gsm fine art paper with water-based inks. The artwork is printed edge to edge (no mount) and set
          in a classic satin-laminated solid wood frame, behind shatterproof acrylic glazing.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#4a4a4a]">
          <li>Frame moulding 20mm wide, 22mm deep from the wall</li>
          <li>Size shown is the printed artwork; the frame adds about 1.5cm on each side</li>
          <li>Hanging hardware fitted: cobra hook, or sawtooth hanger on the largest sizes</li>
          <li>Shipped in a rigid corrugated box made from recycled materials</li>
        </ul>

        <ul className="mt-5 grid grid-cols-3 gap-3">
          {ECO.map((e) => (
            <li
              key={e.src}
              className="flex flex-col items-center gap-2 text-center text-xs leading-snug text-[#4a4a4a]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.src} alt="" width={36} height={36} className="h-9 w-9" />
              {e.label}
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm leading-relaxed text-[#595959]">
          <span className="font-semibold text-[#222]">Care:</span> hang out of direct sunlight, away from heat sources
          such as radiators and fireplaces, in a dry room.
        </p>
      </Section>

      <Section title="Delivery and return policies">
        <ul className="space-y-4">
          <Row icon={<CalendarIcon />}>
            <span className="min-h-[1.5rem]">
              Order today to get by{" "}
              {arrival ? (
                <Explained label={<strong className="font-semibold">{arrival}</strong>}>
                  Each print is made to order: about {PRODUCTION_DAYS} business days to print and frame, then{" "}
                  {TRANSIT_DAYS.min}–{TRANSIT_DAYS.max} business days with UPS Ground.
                </Explained>
              ) : (
                <strong className="font-semibold">…</strong>
              )}
            </span>
          </Row>
          <Row icon={<BoxIcon />}>
            <Explained label="Free reprint or refund if damaged">
              Every print is made for you, so we can&apos;t take back prints you&apos;ve changed your mind about. If it
              arrives damaged or with a print fault, send us a photo within 14 days of delivery through our{" "}
              <a href="/contact" className="underline">
                contact page
              </a>{" "}
              and we&apos;ll reprint it or refund you.
            </Explained>
          </Row>
          <Row icon={<CarIcon />}>
            Free delivery <span className="text-[#595959]">(US addresses only for now)</span>
          </Row>
          <Row icon={<PinIcon />}>
            Sent from: <strong className="font-semibold">United States</strong>
          </Row>
        </ul>
      </Section>
    </div>
  );
}
