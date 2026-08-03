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

/** University libraries that list Fine Art Free — verifiable social proof, shown
 *  white-on-dark via `invert` (the source files are dark-on-transparent). */
const PRO_UNIVERSITY_LOGOS = [
  { file: "york.png", name: "University of York" },
  { file: "waterloo.png", name: "University of Waterloo" },
  { file: "alberta.png", name: "University of Alberta" },
  { file: "skidmore.png", name: "Skidmore College" },
  { file: "seville.png", name: "University of Seville" },
] as const;

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
      {/* ── Resolution demonstration ──────────────────────────────────────────
          The objection isn't "is the art good" — it's "what does 4K actually buy
          me". So show it: the SAME eye of the same Van Eyck, cropped from the
          1,400px file the free tier serves and from the 8,889px original. Nothing
          is blurred or retouched; the softness on the left is what that resolution
          genuinely looks like at this zoom. */}
      <section className="bg-[#12100E] px-3 py-12 text-[#F0EDE4] md:px-6 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-[58ch] text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#B08D4F]">
              {c.cmpEyebrow}
            </p>
            {/* Same treatment as the homepage hero H1: body face (Urbanist), bold,
                tight tracking — so the two entry points read as one brand. */}
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {c.cmpH1}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#A9A396]">{c.cmpSub}</p>
          </div>

          <div className="mx-auto mt-9 grid max-w-3xl grid-cols-2 gap-3 sm:gap-4">
            <figure className="m-0">
              <div className="overflow-hidden rounded-lg bg-[#1C1A16]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/pro-detail/free.jpg"
                  alt={c.cmpFreeLabel}
                  width={1000}
                  height={1161}
                  className="block h-auto w-full opacity-90"
                />
              </div>
              <figcaption className="mt-2.5 text-center text-[12.5px] text-[#8E887B]">
                {c.cmpFreeLabel}
              </figcaption>
            </figure>
            <figure className="m-0">
              <div className="overflow-hidden rounded-lg ring-1 ring-[#B08D4F]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/pro-detail/pro.jpg"
                  alt={c.cmpProLabel}
                  width={1000}
                  height={1161}
                  className="block h-auto w-full"
                />
              </div>
              <figcaption className="mt-2.5 text-center text-[12.5px] font-semibold text-[#E4D9BE]">
                {c.cmpProLabel}
              </figcaption>
            </figure>
          </div>

          {/* Anchor beside the ask: the price is judged against what one stock
              photo costs, not against zero, and the decision is made right here. */}
          <div className="mx-auto mt-10 grid max-w-3xl items-center gap-8 md:grid-cols-2">
            <div>
              <p className="text-[15px] leading-relaxed text-[#BDB7A8]">{c.cmpAnchor}</p>
              <p className="mt-3 font-mono text-[11px] text-[#7E7A6E]">{c.cmpPerWork}</p>
            </div>

            <div className="rounded-xl border border-[#34302A] bg-[#1C1A16] p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-[#9C978A]">{c.yearlyPlan}</span>
                <span className="rounded-full bg-[#26361F] px-2 py-0.5 text-[10.5px] font-bold text-[#8FBF9B]">
                  {c.yearlySave}
                </span>
              </div>
              <p className="mt-1.5 text-[1.75rem] font-extrabold tracking-tight text-[#F0EDE4]">
                {c.yearlyPrice}
              </p>
              <p className="mt-0.5 text-xs text-[#7E7A6E]">{c.yearlyBilling}</p>
              <Link
                href={fineArtProLandingJoinHref(locale, "yearly", leadArtSlug)}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#F5C278] to-[#E4A23C] px-4 py-3 text-sm font-bold text-[#12100E] shadow-[0_6px_18px_rgba(228,162,60,0.4)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4A23C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#12100E]"
              >
                {c.cmpCta}
              </Link>
              <div className="mt-3 flex items-center justify-between border-t border-[#2A2722] pt-3 text-xs text-[#9C978A]">
                <Link
                  href={fineArtProLandingJoinHref(locale, "monthly", leadArtSlug)}
                  className="underline underline-offset-2 hover:text-[#F0EDE4]"
                >
                  {c.monthlyPlan}
                </Link>
                <span>
                  <b className="text-[#F0EDE4]">{c.monthlyPrice}</b>
                </span>
              </div>
              <p className="mt-3 text-center text-[11px] text-[#7E7A6E]">{c.ctaNote}</p>
            </div>
          </div>

          {/* The credential no competitor can buy. */}
          <div className="mt-10 border-t border-[#262320] pt-8">
            <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#7E7A6E]">
              {c.joinTrustedBy}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              {PRO_UNIVERSITY_LOGOS.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={u.file}
                  src={`/images/university-logos/${u.file}`}
                  alt={u.name}
                  className="h-6 w-auto opacity-40 invert"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What Pro adds, next to the artwork the visitor came from. The pitch and
          the price already happened above — this section only substantiates it. */}
      <section className="px-3 pb-12 pt-12 md:px-6 md:pb-16 md:pt-14">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
          <div className="w-full shrink-0 lg:max-w-[38%]">
            <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#f5f5f5] shadow-sm">
              <RotatingProHero alt={c.heroImageAlt} leadImage={leadImage} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-2xl font-normal leading-tight tracking-tight text-[#1a1a1a] sm:text-[1.9rem]">
              {c.heroH1}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#4a4a4a]">{c.heroSub}</p>

            {/* Free vs Pro — single source of truth for features (modern comparison table). */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-[#e3e0d9] bg-white">
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
