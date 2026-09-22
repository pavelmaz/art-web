import Image from "next/image";
import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";

import { CompareSlider } from "@/components/paywall/CompareSlider";
import { PreviewSwitcher } from "@/components/paywall/PreviewSwitcher";
import { ReviewAvatar } from "@/components/paywall/ReviewAvatar";
import { FineArtProFaq } from "@/components/FineArtProFaq";
import { getFineArtProT } from "@/lib/fineart-pro-translations";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Paywall · 4K proof slider",
  robots: { index: false, follow: false },
};

/** Render a Free/Pro comparison cell (mirrors the real Pro page). */
function comparisonCell(value: string | boolean) {
  if (value === true) return (<><span className="text-[#8FBF9B]" aria-hidden>✓</span><span className="sr-only">Included</span></>);
  if (value === false) return (<><span className="text-white/25" aria-hidden>–</span><span className="sr-only">Not included</span></>);
  return value;
}

/** Concept 2, completed — the 4K proof slider as the hero, then the full Pro page
 *  content (pricing, comparison, reviews, fresh + FAQ). CTAs are visual only
 *  (unwired) until this format is chosen. */
export default function Paywall2() {
  const c = getFineArtProT("en");
  return (
    <div className="bg-[#f6f4ee]">
      <PreviewSwitcher active={2} />

      {/* HERO — slider replaces the rotating image; everything else mirrors /fineart-pro */}
      <section className="relative overflow-hidden bg-[#0f1115] px-3 pb-12 pt-14 text-white md:px-6 md:pb-16 md:pt-16 lg:pb-20">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 scale-125 bg-cover bg-center opacity-[0.24] blur-[64px]" style={{ backgroundImage: "url(/images/pro-detail/vangogh-vine.jpg)" }} />
          <div className="absolute -left-24 top-10 size-[520px] rounded-full bg-[#E4A23C]/20 blur-[130px]" />
          <div className="absolute -right-24 bottom-0 size-[560px] rounded-full bg-[#3B6EA5]/25 blur-[140px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1115]/70 via-[#0f1115]/55 to-[#0f1115]/85" />
        </div>

        <div className="relative mr-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-16">
          {/* the differentiator */}
          <div className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-20 lg:max-w-[44%]">
            <CompareSlider src="/images/pro-detail/raphael-face.jpg" alt="Raphael, detail — web preview vs 4K original" />
            <p className="mt-3 text-center text-[12px] uppercase tracking-[0.16em] text-white/45">← drag to compare →</p>
          </div>

          <div className="order-1 min-w-0 flex-1 lg:order-2">
            <span className="text-[13px] uppercase tracking-[0.16em] text-[#E0A93C]">See the difference</span>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.12]">
              This is what commercial-grade looks like.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/75 sm:text-lg">
              Every Pro download is the full-resolution original — the same file the museum scanned, not a web thumbnail. {c.heroSub}
            </p>

            <div className="mt-5 flex items-center gap-2">
              <span className="text-[15px] tracking-tight text-[#E0A93C]" aria-hidden>★★★★★</span>
              <span className="text-[13px] text-white/75"><span className="font-semibold text-white">{c.trustRating}</span> · {c.trustCount}</span>
            </div>

            <p className="mt-7 text-sm font-medium text-white/90">{c.valueNote}</p>

            {/* pricing cards (visual only — unwired) */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
              <div className="glass-dark-strong relative flex flex-col rounded-2xl p-6">
                <span className="absolute -top-3 left-6 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#12100E]">{c.yearlyBadge}</span>
                <p className="text-sm text-white/70">{c.yearlyPlan}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight sm:text-[1.65rem]">{c.yearlyPrice}</p>
                <p className="mt-1 text-xs font-semibold text-[#8FBF9B]">{c.yearlySave}</p>
                <p className="mt-1 text-xs text-white/55">{c.yearlyBilling}</p>
                <button type="button" className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#F5C278] to-[#E4A23C] px-4 py-3 text-sm font-bold text-[#1a1a1a] shadow-[0_6px_18px_rgba(228,162,60,0.45)] transition hover:brightness-95">
                  {c.cta}
                </button>
              </div>
              <div className="glass-dark flex flex-col rounded-2xl p-6">
                <p className="text-sm text-white/70">{c.monthlyPlan}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight sm:text-[1.65rem]">{c.monthlyPrice}</p>
                <p className="mt-1 text-xs text-white/55">{c.monthlyBilling}</p>
                <button type="button" className="glass-dark-btn mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold transition">
                  {c.cta}
                </button>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-white/60">{c.ctaNote}</p>

            {/* Free vs Pro */}
            <div className="glass-dark mt-8 overflow-hidden rounded-2xl">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className="w-[46%] px-4 py-3.5 text-left text-xs font-medium text-white/45">{c.comparisonHeader}</th>
                    <th className="w-[27%] px-2 py-3.5 text-center text-[13px] font-medium text-white/50">{c.compareFreeTitle}</th>
                    <th className="w-[27%] bg-white/[0.07] px-2 py-3.5 text-center">
                      <span className="inline-block rounded-full bg-[#E4A23C]/20 px-2.5 py-1 text-xs font-semibold text-[#F5C278]">{c.compareProTitle}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.comparison.map((row) => (
                    <tr key={row.feature}>
                      <td className="border-t border-white/10 px-4 py-3 text-sm text-white/75">{row.feature}</td>
                      <td className="border-t border-white/10 px-2 py-3 text-center text-sm text-white/40">{comparisonCell(row.free)}</td>
                      <td className="border-t border-white/10 bg-white/[0.07] px-2 py-3 text-center text-sm font-medium text-white">{comparisonCell(row.pro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="px-3 py-12 md:px-6 md:py-16">
        <div className="mr-auto max-w-7xl">
          <h2 className={`${playfair.className} text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl`}>{c.testimonialsHeading}</h2>
          <div className="mt-2 flex items-center gap-2 text-sm text-[#4a4a4a]">
            <span className="text-[15px] text-[#E0A93C]" aria-hidden>★★★★★</span>
            <span><span className="font-semibold text-[#1a1a1a]">{c.trustRating}</span> · {c.trustCount}</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.testimonials.map((t, i) => (
              <figure key={t.name} className="flex flex-col rounded-2xl border border-[#ece9e3] bg-white p-5">
                <div className="flex items-center gap-3">
                  <ReviewAvatar name={t.name} colorIndex={i} px={40} />
                  <figcaption className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1a1a1a]">{t.name}</p>
                    <p className="truncate text-xs text-[#8a8a8a]">{t.meta}</p>
                  </figcaption>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[15px] text-[#E0A93C]" aria-hidden>★★★★★</span>
                  <span className="text-xs text-[#9a9a9a]">{t.date}</span>
                </div>
                <blockquote className="mt-2 text-[13px] leading-relaxed text-[#3a3a3a]">{t.quote}</blockquote>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Fresh content + FAQ */}
      <section className="bg-[#E3D1B4] px-3 py-14 md:px-6 md:py-20 lg:py-24">
        <div className="mr-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:items-start lg:gap-14 xl:gap-20">
          <div className="min-w-0 flex-1">
            <h2 className={`${playfair.className} text-3xl font-bold leading-[1.15] tracking-tight text-black sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]`}>{c.freshH2}</h2>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-black sm:text-base">{c.freshBody}</p>
            <FineArtProFaq items={c.faq} />
          </div>
          <div className="relative w-full shrink-0 lg:max-w-[48%] lg:self-stretch">
            <div className="lg:-mt-6 lg:pt-2">
              <Image src="/images/fine-art-pro-moonrise-sea.webp" alt={c.moonriseImageAlt} width={800} height={612} className="h-auto w-full rounded-2xl object-contain shadow-sm lg:rounded-3xl" sizes="(max-width: 1024px) 100vw, 45vw" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
