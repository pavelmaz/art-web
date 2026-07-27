import Link from "next/link";

import { MuseumLogoStrip } from "@/components/MuseumLogoStrip";
import { RotatingProHero } from "@/components/RotatingProHero";
import { getT, type Locale } from "@/lib/translations";

const POPULAR_LABEL: Record<Locale, string> = {
  en: "Popular:", es: "Popular:", pt: "Popular:", ja: "人気:", fr: "Populaire :",
  de: "Beliebt:", it: "Popolari:", ko: "인기:", ru: "Популярное:", zh: "热门：",
};

const SOURCED_LABEL: Record<Locale, string> = {
  en: "Sourced from the world's great museums",
  es: "De los mejores museos del mundo",
  pt: "Dos melhores museus do mundo",
  ja: "世界の名だたる美術館より",
  fr: "Issu des plus grands musées du monde",
  de: "Aus den bedeutendsten Museen der Welt",
  it: "Dai più grandi musei del mondo",
  ko: "세계 유수의 미술관에서",
  ru: "Из величайших музеев мира",
  zh: "来自世界顶级博物馆",
};

/** The homepage hero, shared by every locale so English and translations stay in
 *  sync: Friedrich background, headline + glass search + popular chips, the
 *  rotating masterpieces column, and the scrolling museum-logo strip. */
export function HomeHero({ locale }: { locale: Locale }) {
  const t = getT(locale);
  const prefix = locale === "en" ? "" : `/${locale}`;
  const popular = [
    { href: `${prefix}/artists/vincent-van-gogh`, label: "van gogh" },
    { href: `${prefix}/artworks/water-lilies-claude-monet`, label: "monet water lilies" },
    { href: `${prefix}/artists/rembrandt-van-rijn`, label: "rembrandt" },
    { href: `${prefix}/artists/johannes-vermeer`, label: "vermeer" },
  ];

  return (
    <section className="relative w-full overflow-hidden bg-[#080b16] py-20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-caspar.jpg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#080b16]/90 via-[#080b16]/65 to-[#080b16]/40"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex max-w-7xl items-center gap-12 px-5">
        <div className="min-w-0 flex-1 text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">{t.heroH1}</h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-white">{t.heroSubtitle}</p>
          <form action={`${prefix}/search`} method="get" className="mt-8 max-w-xl">
            <div className="flex items-center rounded-full border border-white/25 bg-white/10 px-5 py-3 backdrop-blur-md">
              <input
                type="text"
                name="q"
                placeholder={t.searchPlaceholder}
                className="w-full bg-transparent text-[15px] text-white placeholder:text-white/55 focus:outline-none"
                aria-label={t.searchPlaceholder}
              />
              <button type="submit" className="pl-2 text-2xl text-white" aria-label={t.searchPlaceholder}>
                ⌕
              </button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/70">{POPULAR_LABEL[locale]}</span>
            {popular.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm text-white/90 backdrop-blur-md transition hover:border-white/40 hover:bg-white/20 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden w-[340px] shrink-0 lg:block xl:w-[380px]">
          <div className="overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <RotatingProHero alt={t.heroH1} />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-14 max-w-7xl px-5">
        <MuseumLogoStrip label={SOURCED_LABEL[locale]} />
      </div>
    </section>
  );
}
