import Image from "next/image";
import type { Metadata } from "next";

import { PreviewSwitcher } from "@/components/paywall/PreviewSwitcher";
import { getFineArtProT } from "@/lib/fineart-pro-translations";

export const metadata: Metadata = {
  title: "Paywall · Trust-stacked CTA",
  robots: { index: false, follow: false },
};

/** Concept 4 — cluster every trust signal (rating, review, risk-reversal,
 *  university libraries) right on the button. Light treatment, on the warm
 *  paper ground. Preview only; CTA unwired. */
export default function Paywall4() {
  const c = getFineArtProT("en");
  const ticks = ["Cancel anytime", "Instant access to every download", "Every work is public domain — yours to keep"];
  return (
    <>
      <PreviewSwitcher active={4} />
      <main className="min-h-[88vh] bg-[#f6f4ee] px-4 py-20 text-[#1a1712]">
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border border-black/[0.07] bg-white p-8 shadow-[0_1px_2px_rgba(20,16,10,.05),0_24px_60px_-28px_rgba(20,16,10,.28)]">
            <div className="text-center">
              <h1 className="font-serif text-2xl font-bold tracking-tight">Join 12,000+ creators</h1>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="tracking-[2px] text-[#E0A93C]" aria-hidden>★★★★★</span>
                <span className="text-sm text-black/55"><span className="font-semibold text-black/80">{c.trustRating}</span> average</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-[#f6f4ee] p-4 text-center">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-2xl font-bold tracking-tight">$3.75</span>
                <span className="text-sm text-black/50">USD /mo</span>
              </div>
              <div className="mt-0.5 text-xs text-black/50">{c.yearlyBilling} · <span className="text-[#2f7d52]">{c.yearlySave}</span></div>
            </div>

            <button type="button" className="mt-5 w-full rounded-xl bg-[#12100e] py-4 text-[15px] font-semibold text-white transition hover:bg-[#12100e]/90">
              Start Fine Art Pro
            </button>

            <ul className="mt-5 space-y-2.5">
              {ticks.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[13.5px] text-black/65">
                  <span className="mt-0.5 text-[#2f7d52]" aria-hidden>✓</span> {t}
                </li>
              ))}
            </ul>

            <figure className="mt-6 rounded-2xl border border-black/[0.06] bg-[#faf9f5] p-4">
              <blockquote className="text-[13.5px] leading-relaxed text-black/75">
                “Cheaper than a single stock photo and I get the whole museum.”
              </blockquote>
              <figcaption className="mt-3 flex items-center gap-2.5">
                <Image src="/images/reviews/david-reynolds.jpg" alt="David Reynolds" width={28} height={28} className="size-7 rounded-full object-cover" />
                <span className="text-[12px] text-black/55">David Reynolds · verified subscriber</span>
              </figcaption>
            </figure>

            <p className="mt-5 text-center text-[11.5px] leading-relaxed text-black/45">
              Recommended by the libraries of KHiO · Portsmouth · NUS · Università Iuav di Venezia
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
