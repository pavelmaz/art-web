import type { Metadata } from "next";

import { PreviewSwitcher } from "@/components/paywall/PreviewSwitcher";
import { getFineArtProT } from "@/lib/fineart-pro-translations";

export const metadata: Metadata = {
  title: "Paywall · Anchored hero",
  robots: { index: false, follow: false },
};

/** Concept 3 — one price, one anchor ("less than a stock photo"), one CTA,
 *  the whole offer above the fold. Preview only; CTAs unwired. */
export default function Paywall3() {
  const c = getFineArtProT("en");
  return (
    <>
      <PreviewSwitcher active={3} />
      <main className="relative isolate overflow-hidden bg-[#0f1115] px-4 py-24 text-white sm:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 scale-125 bg-cover bg-center opacity-[0.22] blur-[64px]" style={{ backgroundImage: "url(/images/pro-detail/vangogh-vine.jpg)" }} />
          <div className="absolute -left-24 top-10 size-[520px] rounded-full bg-[#E4A23C]/20 blur-[130px]" />
          <div className="absolute -right-24 bottom-0 size-[560px] rounded-full bg-[#3B6EA5]/25 blur-[140px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1115]/70 via-[#0f1115]/60 to-[#0f1115]/90" />
        </div>

        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0A93C]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E7BB57]">
            <span aria-hidden>◆</span> Fine Art Pro
          </span>
          <h1 className="mt-6 font-serif text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            500,000 masterpieces.<br />In 4K. Yours to use.
          </h1>
          <p className="mt-5 text-base text-white/70">Unlimited downloads · commercial licence included · all public domain.</p>

          <div className="glass-dark-strong mx-auto mt-9 max-w-sm rounded-3xl p-7">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-4xl font-bold tracking-tight">$3.75</span>
              <span className="text-base text-white/60">USD /mo</span>
            </div>
            <div className="mt-1.5 text-[13px] text-white/60">
              {c.yearlyBilling} · <span className="text-white/40 line-through">$9.99</span> <span className="text-[#8FBF9B]">{c.yearlySave}</span>
            </div>
            <div className="mt-3 inline-flex items-center rounded-full bg-[#8FBF9B]/12 px-3 py-1 text-[12px] font-medium text-[#9FCFAA]">
              ≈ less than a single stock photo
            </div>

            <button type="button" className="mt-6 w-full rounded-xl bg-white py-4 text-[15px] font-semibold text-[#12100e] transition hover:bg-white/90">
              {c.cta}
            </button>
            <p className="mt-3 text-[11px] text-white/50">{c.ctaNote}</p>
          </div>

          <button type="button" className="mt-5 text-[13px] text-white/55 underline-offset-2 transition hover:text-white/85 hover:underline">
            or pay monthly — $9.99/mo
          </button>
        </div>
      </main>
    </>
  );
}
