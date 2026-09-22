import Image from "next/image";
import type { Metadata } from "next";

import { PreviewSwitcher } from "@/components/paywall/PreviewSwitcher";
import { getFineArtProT } from "@/lib/fineart-pro-translations";

export const metadata: Metadata = {
  title: "Paywall · Contextual unlock",
  robots: { index: false, follow: false },
};

/** Concept 1 — the paywall fires at the download moment, over the exact artwork
 *  the visitor tried to download. Preview only; CTAs are unwired. */
export default function Paywall1() {
  const c = getFineArtProT("en");
  return (
    <>
      <PreviewSwitcher active={1} />
      <main className="relative isolate min-h-[88vh] overflow-hidden bg-[#0f1115] text-white">
        {/* the artwork they're viewing — dimmed + softly blurred behind the card */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image src="/images/fine-art-pro-wanderer.jpg" alt="" fill priority className="scale-105 object-cover object-top opacity-[0.78] blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1115]/45 via-[#0f1115]/35 to-[#0f1115]/75" />
        </div>

        {/* context caption */}
        <div className="absolute left-4 top-4 text-[11px] text-white/55 sm:left-6 sm:top-6">
          <span className="text-white/40">Viewing</span>&nbsp; Wanderer above the Sea of Fog · Caspar David Friedrich
        </div>

        <div className="flex min-h-[88vh] items-center justify-center px-4 py-20">
          <div className="glass-dark-strong w-full max-w-md rounded-3xl p-7 text-center sm:p-9">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0A93C]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E7BB57]">
              <span aria-hidden>◆</span> 4K locked
            </span>
            <h1 className="mt-5 font-serif text-2xl font-bold leading-tight sm:text-[1.75rem]">
              Download this artwork in 4K
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/70">
              Plus 500,000 more — full-resolution originals, commercial licence included.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-[1.7rem] font-bold tracking-tight">$3.75</span>
                <span className="text-sm text-white/60">USD /mo</span>
              </div>
              <div className="mt-1 text-xs text-white/60">
                {c.yearlyBilling} · <span className="text-[#8FBF9B]">{c.yearlySave}</span>
              </div>
            </div>

            <button type="button" className="mt-5 w-full rounded-xl bg-white py-3.5 text-[15px] font-semibold text-[#12100e] transition hover:bg-white/90">
              {c.cta}
            </button>
            <p className="mt-3 text-[11px] text-white/50">{c.ctaNote}</p>
            <button type="button" className="mt-4 text-[13px] text-white/55 underline-offset-2 transition hover:text-white/90 hover:underline">
              Maybe later
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
