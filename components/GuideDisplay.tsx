"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  ArtworkInsightsControls,
  ArtworkInsightsOverlay,
  ArtworkInsightsProvider,
} from "@/components/ArtworkInsights";
import { GuideLoginGate } from "@/components/GuideLoginGate";
import { ArtworkZoomImage } from "@/components/ArtworkZoomImage";
import type { GuideData, GuideStop } from "@/lib/guide-types";
import { getGuideTranslations } from "@/lib/guide-translations";
import type { Locale } from "@/lib/translations";

const LOCALES: Locale[] = ["en", "es", "pt", "ja", "fr", "de", "it", "ko", "ru", "zh"];

function toLocale(value?: string): Locale {
  if (value && LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return "en";
}

type GuideDisplayProps = {
  guide: GuideData;
  isLoggedIn: boolean;
  locale?: string;
};

type StopCardProps = {
  stop: GuideStop;
  locale: Locale;
  isLast: boolean;
};

function StopCard({ stop, locale, isLast }: StopCardProps) {
  const imageSrc = stop.image_id;

  return (
    <div className="mb-20 flex gap-5 md:gap-8">
      <div className="hidden shrink-0 flex-col items-center pt-1 md:flex">
        <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 font-mono text-xs font-bold text-white">
          {String(stop.order).padStart(2, "0")}
        </div>
        {!isLast ? <div className="mt-3 min-h-[60px] w-px flex-1 bg-neutral-200" /> : null}
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <div className="mb-2 flex items-center gap-3 md:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 font-mono text-xs font-bold text-white">
            {String(stop.order).padStart(2, "0")}
          </span>
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
          {stop.artist_display}
        </p>

        <h2 className="mb-4 font-serif text-2xl font-bold leading-tight text-neutral-900">
          {stop.title}
        </h2>

        {imageSrc ? (
          <ArtworkInsightsProvider
            artwork={{ title: stop.title, artist_display: stop.artist_display }}
            locale={locale}
          >
            <div className="relative mb-6 w-fit max-w-full">
              <ArtworkZoomImage
                src={imageSrc}
                fullSrc={imageSrc}
                alt={`${stop.title} by ${stop.artist_display}`}
              />
              <ArtworkInsightsOverlay />
            </div>
            <ArtworkInsightsControls />
          </ArtworkInsightsProvider>
        ) : null}

        <p className="mb-6 border-l-2 border-neutral-300 pl-4 text-sm italic leading-relaxed text-neutral-600">
          {stop.reason}
        </p>

        {stop.bullets.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-neutral-200">
            <div className="divide-y divide-neutral-100">
              {stop.bullets.map((bullet, index) => (
                <div key={index} className="flex gap-4 px-5 py-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-neutral-700">{bullet}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function GuideDisplay({ guide, isLoggedIn, locale }: GuideDisplayProps) {
  const pathname = usePathname();
  const resolvedLocale = toLocale(locale);
  const t = getGuideTranslations(resolvedLocale);
  const heroImage = guide.stops[0]?.image_id;

  useEffect(() => {
    if (!isLoggedIn) return;
    const token = pathname.split("/").pop();
    if (!token) return;
    void fetch("/api/guides/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  }, [isLoggedIn, pathname]);

  return (
    <article className="overflow-x-hidden bg-white">
      {heroImage ? (
        <div className="relative h-[80vh] min-h-[400px] w-full overflow-hidden">
          <img
            src={guide.stops[0].image_id}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ imageRendering: "auto" }}
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
            <p className="mb-3 text-sm uppercase tracking-widest text-white/60">{t.guide.eyebrow}</p>
            <h1 className="mb-6 max-w-3xl font-serif text-5xl font-bold leading-tight text-white md:text-6xl">
              {guide.title}
            </h1>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
                {guide.museum_name}
              </span>
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
                {guide.stops.length} {t.guide.stops}
              </span>
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
                {guide.time_hours}
                {t.guide.hours}
              </span>
              {guide.focus ? (
                <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
                  {t.guide.focus(guide.focus)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-900 px-8 py-14 md:px-12">
          <p className="mb-3 text-sm uppercase tracking-widest text-white/60">{t.guide.eyebrow}</p>
          <h1 className="max-w-3xl font-serif text-5xl font-bold leading-tight text-white md:text-6xl">
            {guide.title}
          </h1>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-6 py-10 md:py-14">
        <p className="text-center text-base leading-relaxed text-neutral-600">{guide.description}</p>
        <hr className="mx-auto mt-10 max-w-xs border-neutral-200" />
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-20">
        {guide.stops.map((stop, index) => (
          <StopCard
            key={stop.artwork_id}
            stop={stop}
            locale={resolvedLocale}
            isLast={index === guide.stops.length - 1}
          />
        ))}
      </div>

      {false && <GuideLoginGate isLoggedIn={isLoggedIn} locale={locale} />}
    </article>
  );
}
