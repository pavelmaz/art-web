import type { Metadata } from "next";

import { CompareSlider } from "@/components/paywall/CompareSlider";
import { PreviewSwitcher } from "@/components/paywall/PreviewSwitcher";
import { getFineArtProT } from "@/lib/fineart-pro-translations";

export const metadata: Metadata = {
  title: "Paywall · 4K proof slider",
  robots: { index: false, follow: false },
};

/** Concept 2 — prove the 4K value by eye (drag-to-compare) before the price.
 *  Preview only; CTA is unwired. */
export default function Paywall2() {
  const c = getFineArtProT("en");
  return (
    <>
      <PreviewSwitcher active={2} />
      <main className="bg-[#0f1115] px-4 pb-20 pt-14 text-white sm:px-6">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="order-2 lg:order-1">
            <CompareSlider src="/images/pro-detail/raphael-face.jpg" alt="Raphael, detail — web preview vs 4K original" />
            <p className="mt-3 text-center text-[12px] uppercase tracking-[0.14em] text-white/45">← drag to compare →</p>
          </div>

          <div className="order-1 lg:order-2">
            <span className="text-[13px] uppercase tracking-[0.16em] text-[#E0A93C]">See the difference</span>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">
              This is what commercial-grade looks like.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
              Every Pro download is the full-resolution original — the same file the museum scanned, not a web thumbnail. Drag the handle and see it.
            </p>

            <div className="mt-7 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight">$3.75</span>
                  <span className="text-sm text-white/60">USD /mo</span>
                </div>
                <div className="mt-0.5 text-xs text-white/55">{c.yearlyBilling} · <span className="text-[#8FBF9B]">{c.yearlySave}</span></div>
              </div>
              <button type="button" className="rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-[#12100e] transition hover:bg-white/90">
                {c.cta}
              </button>
            </div>
            <p className="mt-3 text-[12px] text-white/50">{c.ctaNote}</p>
          </div>
        </div>
      </main>
    </>
  );
}
