"use client";

import { useEffect, useMemo, useState } from "react";

import { PrintProductDetails } from "@/components/PrintProductDetails";
import { track } from "@/lib/analytics";
import { countryName, countryPhrase, isPrintCountry, PRINT_COUNTRIES, type PrintShipping } from "@/lib/print-countries";
import {
  FRAME_OPTIONS,
  isFrameKey,
  overallInches,
  priceUsd,
  type FrameKey,
  type PrintSize,
} from "@/lib/print-catalog";

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

const COUNTRY_KEY = "faf-print-country";

/** The visitor's country: their last choice, else Cloudflare's view of where they
 *  are (/cdn-cgi/trace, answered at the edge), else the US. */
async function initialCountry(): Promise<string> {
  try {
    const saved = window.localStorage.getItem(COUNTRY_KEY);
    if (isPrintCountry(saved)) return saved;
  } catch {
    // storage blocked
  }
  try {
    const res = await fetch("/cdn-cgi/trace", { signal: AbortSignal.timeout(2000) });
    const code = /^loc=([A-Z]{2})$/m.exec(await res.text())?.[1];
    if (isPrintCountry(code)) return code;
  } catch {
    // offline or blocked — fall through
  }
  return "US";
}

/** One line under the price: delivery cost to the chosen country. */
function deliveryLine(
  country: string,
  bySize: Record<string, PrintShipping | null> | null,
  selectedCode: string | undefined
): { text: string; free: boolean } {
  const name = countryPhrase(country);
  if (!bySize) return { text: `Checking delivery to ${name}…`, free: false };
  if (selectedCode) {
    const s = bySize[selectedCode];
    if (!s) return { text: `This size can't be delivered to ${name}`, free: false };
    return s.surchargeUsd === 0
      ? { text: `Free delivery to ${name}`, free: true }
      : { text: `+ ${usd(s.surchargeUsd)} delivery to ${name}`, free: false };
  }
  const costs = Object.values(bySize)
    .filter((s): s is PrintShipping => !!s)
    .map((s) => s.surchargeUsd);
  if (costs.length === 0) return { text: `Not available for delivery to ${name}`, free: false };
  if (costs.every((c) => c === 0)) return { text: `Free delivery to ${name}`, free: true };
  const min = Math.min(...costs);
  return min === 0
    ? { text: `Free delivery to ${name} on some sizes`, free: true }
    : { text: `Delivery to ${name} from ${usd(min)}`, free: false };
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

  const [country, setCountry] = useState("");
  const [shippingBySize, setShippingBySize] = useState<Record<string, PrintShipping | null> | null>(null);

  const prices = sizes.map((s) => priceUsd(s.code)).filter((p): p is number => p !== null);
  const minPrice = Math.min(...prices);
  const selected = sizes.find((s) => s.code === sizeCode);
  const selectedPrice = selected ? priceUsd(selected.code) : null;
  const sizeCodes = sizes.map((s) => s.code).join(",");

  const countryOptions = useMemo(
    () => PRINT_COUNTRIES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  useEffect(() => {
    let cancelled = false;
    initialCountry().then((code) => {
      if (!cancelled) setCountry((current) => current || code);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Delivery cost of every offered size to the chosen country (cached server-side).
  useEffect(() => {
    if (!country) return;
    const controller = new AbortController();
    fetch(`/api/print-orders/shipping?sizes=${sizeCodes}&country=${country}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { shipping: Record<string, PrintShipping | null> }) => setShippingBySize(data.shipping))
      .catch(() => {
        if (!controller.signal.aborted) setShippingBySize({});
      });
    return () => controller.abort();
  }, [country, sizeCodes]);

  const chooseCountry = (code: string) => {
    setShippingBySize(null);
    setCountry(code);
    try {
      window.localStorage.setItem(COUNTRY_KEY, code);
    } catch {
      // storage blocked — the choice still applies to this visit
    }
  };

  const delivery = country ? deliveryLine(country, shippingBySize, selected?.code) : null;

  // The headline is what the customer will actually pay: the size's price plus
  // delivery to the chosen country (frame colours all cost the same). Until the
  // delivery quote arrives it shows the print price and says it's still checking.
  const selectedShipping = selected && shippingBySize ? shippingBySize[selected.code] : undefined;
  const total =
    selectedPrice !== null && selectedShipping ? selectedPrice + selectedShipping.surchargeUsd : null;
  const frameLabel = FRAME_OPTIONS.find((f) => f.key === frame)?.label.toLowerCase();
  const totalNote =
    total !== null && selected
      ? `${selected.label.split(" – ")[0]}${frameLabel ? `, ${frameLabel}` : ""} · ${
          selectedShipping!.surchargeUsd === 0
            ? `free delivery to ${countryPhrase(country)}`
            : `includes ${usd(selectedShipping!.surchargeUsd)} delivery to ${countryPhrase(country)}`
        }`
      : null;
  const shownShipping = shippingBySize
    ? (selected ? shippingBySize[selected.code] : Object.values(shippingBySize).find((s) => !!s)) ?? null
    : null;

  const handleBuy = async () => {
    if (!sizeCode || !frame) {
      setShowMissing(true);
      // Pressed "buy" without choosing a size or frame — intent, but not yet a checkout.
      track("print_checkout_incomplete", { artwork: artworkSlug, locale: "en", has_size: !!sizeCode, has_frame: !!frame });
      return;
    }
    if (!country || (shippingBySize && !shippingBySize[sizeCode])) {
      setError(country ? `This size can't be delivered to ${countryPhrase(country)}.` : "Please choose where to deliver it.");
      return;
    }
    const shippingUsd = shippingBySize?.[sizeCode]?.surchargeUsd ?? 0;
    track("print_checkout_click", {
      artwork: artworkSlug,
      locale: "en",
      size: sizeCode,
      frame,
      country,
      value: (selectedPrice ?? 0) + shippingUsd,
      currency: "USD",
    });
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/print-orders/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkSlug, size: sizeCode, frame, country }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't start checkout. Please try again.");
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
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
      <p className="text-3xl font-semibold text-[#222]" aria-live="polite">
        {total !== null ? usd(total) : selectedPrice ? usd(selectedPrice) : `${usd(minPrice)}+`}
      </p>
      <p
        className={`mt-1 min-h-[1.25rem] text-sm font-medium ${
          totalNote ? (selectedShipping?.surchargeUsd === 0 ? "text-[#2e7d32]" : "text-[#595959]") : delivery?.free ? "text-[#2e7d32]" : "text-[#595959]"
        }`}
      >
        {totalNote ?? delivery?.text ?? ""}
      </p>

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
              Artwork printed edge to edge at {selected.widthIn}&quot; × {selected.heightIn}&quot;, about{" "}
              {overallInches(selected.widthIn)}&quot; × {overallInches(selected.heightIn)}&quot; with the frame.
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

        <div>
          <label htmlFor="print-country" className="mb-2 block text-sm font-semibold text-[#222]">
            Deliver to
          </label>
          <div className="relative">
            <select
              id="print-country"
              value={country}
              onChange={(e) => chooseCountry(e.target.value)}
              className={selectClass(false)}
            >
              {/* The list renders in the browser only (the country is detected there),
                  so server and client never disagree on country names. */}
              {country ? (
                countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))
              ) : (
                <option value="">Detecting your country…</option>
              )}
            </select>
            {chevron}
          </div>
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

      <PrintProductDetails sizes={sizes} selected={selected} country={country} shipping={shownShipping} />
    </div>
  );
}
