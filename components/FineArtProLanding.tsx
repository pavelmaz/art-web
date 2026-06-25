import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";

import { FineArtProFaq } from "@/components/FineArtProFaq";
import {
  fineArtProLandingJoinHref,
  getFineArtProT,
} from "@/lib/fineart-pro-translations";
import type { Locale } from "@/lib/translations";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type FineArtProLandingProps = {
  locale: Locale;
};

export function FineArtProLanding({ locale }: FineArtProLandingProps) {
  const c = getFineArtProT(locale);

  return (
    <div className="bg-white">
      <section className="px-3 pb-10 pt-3 md:px-6 md:pb-14 md:pt-3 lg:pb-16">
        <div className="mr-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-16">
          {/* Image — shown after the value/price on mobile, left on desktop */}
          <div className="order-2 -ml-1 w-full shrink-0 lg:order-1 lg:max-w-[42%]">
            <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#f5f5f5] shadow-sm">
              <Image
                src="/images/fine-art-pro-wanderer.jpg"
                alt={c.heroImageAlt}
                width={799}
                height={1024}
                className="h-auto w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
              />
            </div>
          </div>

          <div className="order-1 min-w-0 flex-1 lg:order-2">
            <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-[#1a1a1a] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
              {c.heroH1}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-[#4a4a4a] sm:text-lg">{c.heroSub}</p>

            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[#9a8f7d]">
              {c.socialProof}
            </p>

            <ul className="mt-7 space-y-3.5 text-[15px] leading-relaxed text-[#1a1a1a] sm:text-base">
              {c.heroBullets.map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-[#4CAF50]" aria-hidden>
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#e8e6e1]">
              <div className="border-r border-[#e8e6e1] bg-[#faf9f7] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9a9a9a]">
                  {c.compareFreeTitle}
                </p>
                <ul className="mt-3 space-y-2 text-[13px] text-[#6b6b6b]">
                  {c.compareFree.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span aria-hidden>·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#4CAF50]">
                  {c.compareProTitle}
                </p>
                <ul className="mt-3 space-y-2 text-[13px] font-medium text-[#1a1a1a]">
                  {c.comparePro.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-[#4CAF50]" aria-hidden>
                        ✓
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-8 text-sm font-medium text-[#1a1a1a]">{c.valueNote}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
              <div className="relative flex flex-col rounded-2xl border-2 border-[#1a1a1a] bg-white p-6 shadow-sm">
                <span className="absolute -top-3 left-6 rounded-full bg-[#1a1a1a] px-3 py-1 text-xs font-semibold text-white">
                  {c.yearlyBadge}
                </span>
                <p className="text-sm text-[#6b6b6b]">{c.yearlyPlan}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-[1.65rem]">
                  {c.yearlyPrice}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#3b8e3f]">{c.yearlySave}</p>
                <p className="mt-1 text-xs text-[#9a9a9a]">{c.yearlyBilling}</p>
                <Link
                  href={fineArtProLandingJoinHref(locale, "yearly")}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#F5C278] px-4 py-3 text-sm font-bold text-[#1a1a1a] transition-colors hover:bg-[#e8b560] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a] focus-visible:ring-offset-2"
                >
                  {c.cta}
                </Link>
              </div>

              <div className="flex flex-col rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6b6b6b]">{c.monthlyPlan}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-[1.65rem]">
                  {c.monthlyPrice}
                </p>
                <p className="mt-1 text-xs text-[#9a9a9a]">{c.monthlyBilling}</p>
                <Link
                  href={fineArtProLandingJoinHref(locale, "monthly")}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-[#d9d9d9] bg-white px-4 py-3 text-sm font-bold text-[#1a1a1a] transition-colors hover:bg-[#faf9f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a] focus-visible:ring-offset-2"
                >
                  {c.cta}
                </Link>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-[#6b6b6b]">{c.ctaNote}</p>
          </div>
        </div>
      </section>

      <section className="bg-[#E3D1B4] px-3 py-14 md:px-6 md:py-20 lg:py-24">
        <div className="mr-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:items-start lg:gap-14 xl:gap-20">
          <div className="min-w-0 flex-1">
            <h2
              className={`${playfair.className} text-3xl font-bold leading-[1.15] tracking-tight text-black sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]`}
            >
              {c.freshH2}
            </h2>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-black sm:text-base">
              {c.freshBody}
            </p>
            <FineArtProFaq items={c.faq} />
          </div>

          <div className="relative w-full shrink-0 lg:max-w-[48%] lg:self-stretch">
            <div className="lg:-mt-6 lg:pt-2">
              <Image
                src="/images/fine-art-pro-moonrise-sea.webp"
                alt={c.moonriseImageAlt}
                width={800}
                height={612}
                className="h-auto w-full rounded-2xl object-contain shadow-sm lg:rounded-3xl"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
