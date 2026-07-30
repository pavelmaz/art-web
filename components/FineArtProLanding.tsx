import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";

import { RotatingProHero } from "@/components/RotatingProHero";

import { FineArtProFaq } from "@/components/FineArtProFaq";
import {
  fineArtProLandingJoinHref,
  getFineArtProT,
} from "@/lib/fineart-pro-translations";
import { supabase } from "@/lib/supabase";
import type { Locale } from "@/lib/translations";
import { artworkDetailImageUrl } from "@/lib/utils";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

/** Google-review-style avatar background colors, assigned per testimonial by index. */
const AVATAR_COLORS = ["#4285F4", "#DB4437", "#0F9D58", "#F4B400", "#7E57C2", "#00897B"];

type FineArtProLandingProps = {
  locale: Locale;
  /** Slug of the artwork the visitor came from ("Become Pro" on an artwork page)
   *  — shown as the hero's first slide so the pitch opens with THEIR painting. */
  leadArtSlug?: string | null;
};

/** Resolve the referring artwork's display image; null on any miss so the hero
 *  just runs its normal rotation. */
async function leadImageForSlug(slug: string | null | undefined): Promise<string | null> {
  if (!slug || !/^[a-z0-9-]{1,100}$/.test(slug)) return null;
  try {
    const { data } = await supabase
      .from("artworks")
      .select("image_id, url")
      .eq("slug", slug)
      .limit(1);
    const row = data?.[0];
    if (!row?.image_id) return null;
    return artworkDetailImageUrl({ url: row.url ?? null, image_id: row.image_id });
  } catch {
    return null;
  }
}

/** Render a Free/Pro comparison cell: true → check, false → dash, string → the value. */
function comparisonCell(value: string | boolean) {
  if (value === true) {
    return (
      <>
        <span className="text-[#3b8e3f]" aria-hidden>
          ✓
        </span>
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span className="text-[#c4c4c4]" aria-hidden>
          –
        </span>
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return value;
}

export async function FineArtProLanding({ locale, leadArtSlug }: FineArtProLandingProps) {
  const c = getFineArtProT(locale);
  const leadImage = await leadImageForSlug(leadArtSlug);

  return (
    <div className="bg-[#f6f4ee]">
      <section className="px-3 pb-10 pt-3 md:px-6 md:pb-14 md:pt-3 lg:pb-16">
        <div className="mr-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-16">
          {/* Image — shown after the value/price on mobile, left on desktop */}
          <div className="order-2 -ml-1 w-full shrink-0 lg:order-1 lg:max-w-[42%]">
            <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#f5f5f5] shadow-sm">
              <RotatingProHero alt={c.heroImageAlt} leadImage={leadImage} />
            </div>
          </div>

          <div className="order-1 min-w-0 flex-1 lg:order-2">
            <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-[#1a1a1a] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
              {c.heroH1}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-[#4a4a4a] sm:text-lg">{c.heroSub}</p>

            {/* Social proof — a rating line plus an auto-scrolling review strip, so
                visitors see real reviews exist immediately, without scrolling down. */}
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <span className="text-[15px] tracking-tight text-[#E0A93C]" aria-hidden>
                  ★★★★★
                </span>
                <span className="text-[13px] text-[#4a4a4a]">
                  <span className="font-semibold text-[#1a1a1a]">{c.trustRating}</span> · {c.trustCount}
                </span>
              </div>

              <div className="fap-marquee-mask mt-3">
                <ul className="fap-marquee-track">
                  {[...c.testimonials, ...c.testimonials].map((t, i) => (
                    <li
                      key={`${t.name}-${i}`}
                      className="mr-3.5 flex w-[260px] shrink-0 flex-col rounded-xl border border-[#ece9e3] bg-white px-4 py-3"
                      aria-hidden={i >= c.testimonials.length}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                          aria-hidden
                        >
                          {t.name.charAt(0)}
                        </span>
                        <span className="truncate text-[13px] font-semibold text-[#1a1a1a]">
                          {t.name}
                        </span>
                        <span className="ml-auto text-[11px] tracking-tight text-[#E0A93C]" aria-hidden>
                          ★★★★★
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-[#5a5a5a]">
                        {t.quote}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Free vs Pro — single source of truth for features (modern comparison table). */}
            <div className="mt-7 overflow-hidden rounded-2xl border border-[#e3e0d9] bg-white">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className="w-[46%] px-4 py-3.5 text-left text-xs font-medium text-[#9a9a9a]">
                      {c.comparisonHeader}
                    </th>
                    <th className="w-[27%] px-2 py-3.5 text-center text-[13px] font-medium text-[#8a8a8a]">
                      {c.compareFreeTitle}
                    </th>
                    <th className="w-[27%] bg-[#f4faf4] px-2 py-3.5 text-center">
                      <span className="inline-block rounded-full bg-[#e7f4e7] px-2.5 py-1 text-xs font-semibold text-[#2c6e30]">
                        {c.compareProTitle}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.comparison.map((row) => (
                    <tr key={row.feature}>
                      <td className="border-t border-[#ece9e3] px-4 py-3 text-sm text-[#4a4a4a]">
                        {row.feature}
                      </td>
                      <td className="border-t border-[#ece9e3] px-2 py-3 text-center text-sm text-[#9a9a9a]">
                        {comparisonCell(row.free)}
                      </td>
                      <td className="border-t border-[#ece9e3] bg-[#f4faf4] px-2 py-3 text-center text-sm font-medium text-[#1a1a1a]">
                        {comparisonCell(row.pro)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#F5C278] to-[#E4A23C] px-4 py-3 text-sm font-bold text-[#1a1a1a] shadow-[0_6px_18px_rgba(228,162,60,0.45)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a] focus-visible:ring-offset-2"
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
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-[#d9d9d9] bg-white px-4 py-3 text-sm font-bold text-[#1a1a1a] transition-colors hover:bg-[#f6f4ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a] focus-visible:ring-offset-2"
                >
                  {c.cta}
                </Link>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-[#6b6b6b]">{c.ctaNote}</p>
          </div>
        </div>
      </section>

      {/* Social proof. NOTE: testimonials are PLACEHOLDERS (see fineart-pro-translations.ts) —
          replace with real customer quotes before treating them as genuine. */}
      <section className="px-3 py-12 md:px-6 md:py-16">
        <div className="mr-auto max-w-7xl">
          <h2
            className={`${playfair.className} text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl`}
          >
            {c.testimonialsHeading}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-sm text-[#4a4a4a]">
            <span className="text-[15px] text-[#E0A93C]" aria-hidden>
              ★★★★★
            </span>
            <span>
              <span className="font-semibold text-[#1a1a1a]">{c.trustRating}</span> · {c.trustCount}
            </span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.testimonials.map((t, i) => (
              <figure
                key={t.name}
                className="flex flex-col rounded-2xl border border-[#ece9e3] bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    aria-hidden
                  >
                    {t.name.charAt(0)}
                  </span>
                  <figcaption className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1a1a1a]">{t.name}</p>
                    <p className="truncate text-xs text-[#8a8a8a]">{t.meta}</p>
                  </figcaption>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[15px] text-[#E0A93C]" aria-hidden>
                    ★★★★★
                  </span>
                  <span className="text-xs text-[#9a9a9a]">{t.date}</span>
                </div>
                <blockquote className="mt-2 text-[13px] leading-relaxed text-[#3a3a3a]">
                  {t.quote}
                </blockquote>
              </figure>
            ))}
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
