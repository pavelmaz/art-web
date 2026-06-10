"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  ArtworkInsightsControls,
  ArtworkInsightsOverlay,
  ArtworkInsightsProvider,
} from "@/components/ArtworkInsights";
import { GuideLoginGate } from "@/components/GuideLoginGate";
import { ArtworkZoomImage } from "@/components/ArtworkZoomImage";
import type { GuideData, GuideStop } from "@/lib/guide-types";
import { getGuideTranslations, type GuideTranslations } from "@/lib/guide-translations";
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
  expanded: boolean;
  onToggleBullets: () => void;
  copy: GuideTranslations["guide"];
};

function StopCard({ stop, locale, expanded, onToggleBullets, copy }: StopCardProps) {
  const imageSrc = stop.image_id;

  return (
    <div className="relative mb-16 flex gap-6 md:gap-8">
      <div className="relative z-10 hidden shrink-0 flex-col items-center md:flex">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 font-mono text-sm font-bold text-white">
          {String(stop.order).padStart(2, "0")}
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
        {imageSrc ? (
          <div className="relative bg-neutral-50">
            <ArtworkInsightsProvider
              artwork={{ title: stop.title, artist_display: stop.artist_display }}
              locale={locale}
            >
              <div className="relative mx-auto w-fit max-w-full">
                <ArtworkZoomImage
                  src={imageSrc}
                  fullSrc={imageSrc}
                  alt={`${stop.title} by ${stop.artist_display}`}
                />
                <ArtworkInsightsOverlay />
              </div>
              <div className="px-4 pb-4">
                <ArtworkInsightsControls />
              </div>
            </ArtworkInsightsProvider>
          </div>
        ) : null}

        <div className="p-6 md:p-8">
          <div className="mb-2 flex items-center gap-3">
            <span className="rounded bg-neutral-900 px-2 py-1 font-mono text-xs font-bold text-white md:hidden">
              {String(stop.order).padStart(2, "0")}
            </span>
            <p className="text-sm font-medium text-neutral-500">{stop.artist_display}</p>
          </div>

          <h2 className="mb-4 font-serif text-xl font-bold leading-snug text-neutral-900 md:text-2xl">
            {stop.title}
          </h2>

          <p className="mb-6 border-l-2 border-neutral-300 pl-4 italic leading-relaxed text-neutral-600">
            {stop.reason}
          </p>

          {stop.bullets.length > 0 ? (
            <div className="border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={onToggleBullets}
                className="flex items-center gap-2 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900"
              >
                <span>{expanded ? "−" : "+"}</span>
                <span>{expanded ? copy.hideInsights : copy.showInsights}</span>
              </button>

              {expanded ? (
                <ol className="mt-4 list-none space-y-3 pl-0">
                  {stop.bullets.map((bullet, index) => (
                    <li key={index} className="flex gap-3 text-sm leading-relaxed text-neutral-700">
                      <span className="mt-0.5 shrink-0 font-mono text-neutral-400">{index + 1}</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function GuideDisplay({ guide, isLoggedIn, locale }: GuideDisplayProps) {
  const pathname = usePathname();
  const resolvedLocale = toLocale(locale);
  const t = getGuideTranslations(resolvedLocale);
  const heroImage = guide.stops[0]?.image_id;
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});

  const toggleBullets = (artworkId: string) => {
    setExpandedStops((prev) => ({
      ...prev,
      [artworkId]: !prev[artworkId],
    }));
  };

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
            <h1 className="mb-6 max-w-3xl font-serif text-4xl font-bold leading-tight text-white md:text-6xl">
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
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
                {t.guide.visitTypes[guide.visit_type]}
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
          <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight text-white md:text-6xl">
            {guide.title}
          </h1>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-6 py-10 md:py-14">
        <p className="text-lg leading-relaxed text-neutral-600">{guide.description}</p>
      </div>

      <div className="relative mx-auto max-w-3xl px-6 pb-20">
        <div className="absolute bottom-0 left-[2.25rem] top-0 hidden w-px bg-neutral-200 md:block" />

        {guide.stops.map((stop) => (
          <StopCard
            key={stop.artwork_id}
            stop={stop}
            locale={resolvedLocale}
            expanded={!!expandedStops[stop.artwork_id]}
            onToggleBullets={() => toggleBullets(stop.artwork_id)}
            copy={t.guide}
          />
        ))}
      </div>

      {false && <GuideLoginGate isLoggedIn={isLoggedIn} locale={locale} />}
    </article>
  );
}
