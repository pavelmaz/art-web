import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";

import { PlanCtaLink } from "@/components/PlanCtaLink";
import { ProHeroCompare } from "@/components/ProHeroCompare";

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

/** Reviewers who supplied a real photo (square, cropped to the face). Anyone not
 *  listed keeps the coloured-initial avatar, which is also the graceful fallback. */
const REVIEW_PHOTOS: Record<string, string> = {
  "Yuki Tanaka": "/images/reviews/yuki-tanaka.jpg",
  "Sophie Martin": "/images/reviews/sophie-martin.jpg",
  "Chen Wei": "/images/reviews/chen-wei.jpg",
  "Marta López": "/images/reviews/marta-lopez.jpg",
  "David Reynolds": "/images/reviews/david-reynolds.jpg",
  "Liam O'Connor": "/images/reviews/liam-oconnor.jpg",
};

/** Round reviewer avatar: the supplied photo if there is one, otherwise the
 *  coloured initial (also the fallback if a photo is ever missing). */
function ReviewAvatar({ name, colorIndex, px }: { name: string; colorIndex: number; px: 28 | 40 }) {
  const photo = REVIEW_PHOTOS[name];
  const box = px === 28 ? "h-7 w-7" : "h-10 w-10";
  if (photo) {
    return (
      <Image
        src={photo}
        alt={name}
        width={px}
        height={px}
        className={`${box} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full ${px === 28 ? "text-xs" : "text-sm"} font-semibold text-white`}
      style={{ backgroundColor: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length] }}
      aria-hidden
    >
      {name.charAt(0)}
    </span>
  );
}

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
        <span className="text-[#8FBF9B]" aria-hidden>
          ✓
        </span>
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span className="text-white/25" aria-hidden>
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
      {/* Dark hero: the detail crops read far better on a near-black ground, and
          the glass panels (same treatment as the homepage search bar) need
          something behind them to refract. The header sits transparently over it. */}
      <section className="relative overflow-hidden bg-[#0f1115] px-3 pb-12 pt-24 text-white md:px-6 md:pb-16 md:pt-28 lg:pb-20">
        {/* Glass refracts what is behind it — over a flat colour it just reads as
            grey. These two layers give it texture and colour: a heavily blurred
            crop of the Van Gogh, plus warm/cool blooms. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 scale-125 bg-cover bg-center opacity-[0.28] blur-[64px]"
            style={{ backgroundImage: "url(/images/pro-detail/vangogh-vine.jpg)" }}
          />
          <div className="absolute -left-24 top-10 size-[520px] rounded-full bg-[#E4A23C]/20 blur-[130px]" />
          <div className="absolute -right-24 bottom-0 size-[560px] rounded-full bg-[#3B6EA5]/25 blur-[140px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1115]/70 via-[#0f1115]/55 to-[#0f1115]/85" />
        </div>
        <div className="relative">
        <div className="mr-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-16">
          {/* Image — shown after the value/price on mobile, left on desktop */}
          <div className="order-2 -ml-1 w-full shrink-0 lg:order-1 lg:max-w-[42%]">
            <div className="glass-dark overflow-hidden rounded-2xl">
              <ProHeroCompare src={leadImage ?? "/images/pro-detail/raphael-face.jpg"} alt={c.heroImageAlt} />
            </div>
          </div>

          <div className="order-1 min-w-0 flex-1 lg:order-2">
            <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
              {c.heroH1}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-white/75 sm:text-lg">{c.heroSub}</p>

            {/* Social proof — a rating line plus an auto-scrolling review strip, so
                visitors see real reviews exist immediately, without scrolling down. */}
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <span className="text-[15px] tracking-tight text-[#E0A93C]" aria-hidden>
                  ★★★★★
                </span>
                <span className="text-[13px] text-white/75">
                  <span className="font-semibold text-white">{c.trustRating}</span> · {c.trustCount}
                </span>
              </div>

              <div className="fap-marquee-mask mt-3">
                <ul className="fap-marquee-track">
                  {[...c.testimonials, ...c.testimonials].map((t, i) => (
                    <li
                      key={`${t.name}-${i}`}
                      className="glass-dark-chip mr-3.5 flex w-[260px] shrink-0 flex-col rounded-xl px-4 py-3"
                      aria-hidden={i >= c.testimonials.length}
                    >
                      <div className="flex items-center gap-2.5">
                        <ReviewAvatar name={t.name} colorIndex={i} px={28} />
                        <span className="truncate text-[13px] font-semibold text-white">
                          {t.name}
                        </span>
                        <span className="ml-auto text-[11px] tracking-tight text-[#E0A93C]" aria-hidden>
                          ★★★★★
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-white/70">
                        {t.quote}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Pricing FIRST — visitors arrive with intent; the $/mo is the
                strongest hook, so it must land in the first scroll. The Free/Pro
                comparison follows as supporting proof. */}
            <p className="mt-7 text-sm font-medium text-white/90">{c.valueNote}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
              <div className="glass-dark-strong relative flex flex-col rounded-2xl p-6">
                <span className="absolute -top-3 left-6 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#12100E]">
                  {c.yearlyBadge}
                </span>
                <p className="text-sm text-white/70">{c.yearlyPlan}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
                  {c.yearlyPrice}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#8FBF9B]">{c.yearlySave}</p>
                <p className="mt-1 text-xs text-white/55">{c.yearlyBilling}</p>
                <PlanCtaLink
                  href={fineArtProLandingJoinHref(locale, "yearly")}
                  plan="yearly"
                  locale={locale}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#F5C278] to-[#E4A23C] px-4 py-3 text-sm font-bold text-[#1a1a1a] shadow-[0_6px_18px_rgba(228,162,60,0.45)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a] focus-visible:ring-offset-2"
                >
                  {c.cta}
                </PlanCtaLink>
              </div>

              <div className="glass-dark flex flex-col rounded-2xl p-6">
                <p className="text-sm text-white/70">{c.monthlyPlan}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
                  {c.monthlyPrice}
                </p>
                <p className="mt-1 text-xs text-white/55">{c.monthlyBilling}</p>
                <PlanCtaLink
                  href={fineArtProLandingJoinHref(locale, "monthly")}
                  plan="monthly"
                  locale={locale}
                  className="glass-dark-btn mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {c.cta}
                </PlanCtaLink>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-white/60">{c.ctaNote}</p>

            {/* Free vs Pro — single source of truth for features (modern comparison table). */}
            <div className="glass-dark mt-8 overflow-hidden rounded-2xl">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className="w-[46%] px-4 py-3.5 text-left text-xs font-medium text-white/45">
                      {c.comparisonHeader}
                    </th>
                    <th className="w-[27%] px-2 py-3.5 text-center text-[13px] font-medium text-white/50">
                      {c.compareFreeTitle}
                    </th>
                    <th className="w-[27%] bg-white/[0.07] px-2 py-3.5 text-center">
                      <span className="inline-block rounded-full bg-[#E4A23C]/20 px-2.5 py-1 text-xs font-semibold text-[#F5C278]">
                        {c.compareProTitle}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.comparison.map((row) => (
                    <tr key={row.feature}>
                      <td className="border-t border-white/10 px-4 py-3 text-sm text-white/75">
                        {row.feature}
                      </td>
                      <td className="border-t border-white/10 px-2 py-3 text-center text-sm text-white/40">
                        {comparisonCell(row.free)}
                      </td>
                      <td className="border-t border-white/10 bg-white/[0.07] px-2 py-3 text-center text-sm font-medium text-white">
                        {comparisonCell(row.pro)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                  <ReviewAvatar name={t.name} colorIndex={i} px={40} />
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
