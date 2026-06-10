"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";

import { ArtworkInsightsControls, ArtworkInsightsOverlay, ArtworkInsightsProvider } from "@/components/ArtworkInsights";
import { GuideLoginGate } from "@/components/GuideLoginGate";
import { ArtworkZoomImage } from "@/components/ArtworkZoomImage";
import type { GuideData, GuideStop } from "@/lib/guide-types";
import { getGuideTranslations } from "@/lib/guide-translations";
import { localePath } from "@/lib/locale-routes";
import type { Locale } from "@/lib/translations";

const LOCALES: Locale[] = ["en", "es", "pt", "ja", "fr", "de", "it", "ko", "ru", "zh"];

const HERO_GRADIENT =
  "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.58), rgba(0,0,0,0.82), rgba(0,0,0,0.95))";

const CARD_GRADIENT = "linear-gradient(to bottom, #2C2C2E, #1C1C1E)";

function toLocale(value?: string): Locale {
  if (value && LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return "en";
}

function uniqueArtists(stops: GuideStop[]): string[] {
  const seen = new Set<string>();
  const artists: string[] = [];
  for (const stop of stops) {
    if (!seen.has(stop.artist_display)) {
      seen.add(stop.artist_display);
      artists.push(stop.artist_display);
    }
  }
  return artists;
}

type GuideDisplayProps = {
  guide: GuideData;
  isLoggedIn: boolean;
  locale?: string;
};

type MetricProps = {
  value: number;
  label: string;
};

function Metric({ value, label }: MetricProps) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/75">{label}</p>
    </div>
  );
}

type StopCardProps = {
  stop: GuideStop;
  locale: Locale;
  copy: ReturnType<typeof getGuideTranslations>["guide"];
  onOpenZoom: (artworkId: string) => void;
};

function StopCard({ stop, locale, copy, onOpenZoom }: StopCardProps) {
  return (
    <div
      className="mb-3.5 rounded-[14px] border border-white/[0.04] p-3"
      style={{ background: CARD_GRADIENT }}
    >
      <p className="mb-2 text-xs font-semibold text-white/50">{copy.stopNumberLabel(stop.order)}</p>

      {stop.image_id ? (
        <div
          className="mb-4 w-full cursor-zoom-in overflow-hidden rounded-xl"
          onClick={() => onOpenZoom(stop.artwork_id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenZoom(stop.artwork_id);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <img
            src={stop.image_id}
            alt={`${stop.title} by ${stop.artist_display}`}
            className="h-auto w-full object-contain"
            loading="lazy"
          />
        </div>
      ) : null}

      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/55">
        {stop.artist_display}
      </p>

      <h3 className="mb-4 font-serif text-xl font-bold leading-tight text-white">{stop.title}</h3>

      {stop.bullets.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {stop.bullets.map((bullet, index) => (
            <li key={index} className="flex gap-2">
              <span className="shrink-0 text-[#5B9FE3]">•</span>
              <p className="text-xs leading-relaxed text-white/80">{bullet}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <ArtworkInsightsProvider
        artwork={{ title: stop.title, artist_display: stop.artist_display }}
        locale={locale}
      >
        <div className="mt-3 [&_button]:border-white/20 [&_button]:bg-neutral-600 [&_button]:text-white [&_button]:hover:bg-neutral-500 [&_button]:disabled:opacity-60 [&_div.rounded-lg]:border [&_div.rounded-lg]:border-white/10 [&_div.rounded-lg]:bg-white/10 [&_p]:text-white/85 [&_svg]:text-white/60">
          <ArtworkInsightsControls />
        </div>
      </ArtworkInsightsProvider>
    </div>
  );
}

type ZoomOverlayProps = {
  stop: GuideStop;
  locale: Locale;
  closeLabel: string;
  onClose: () => void;
};

function ZoomOverlay({ stop, locale, closeLabel, onClose }: ZoomOverlayProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={onClose}
      role="presentation"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-0 top-0 z-10 p-4 text-white"
        aria-label={closeLabel}
      >
        <X className="size-6" />
      </button>

      <div
        className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-16"
        onClick={(e) => e.stopPropagation()}
      >
        <ArtworkInsightsProvider
          artwork={{ title: stop.title, artist_display: stop.artist_display }}
          locale={locale}
        >
          <div className="relative mx-auto w-fit max-w-full">
            <ArtworkZoomImage
              src={stop.image_id}
              fullSrc={stop.image_id}
              alt={`${stop.title} by ${stop.artist_display}`}
            />
            <ArtworkInsightsOverlay />
          </div>
          <div className="mx-auto mt-4 w-full max-w-lg [&_button]:border-white/20 [&_button]:bg-neutral-600 [&_button]:text-white [&_button]:hover:bg-neutral-500 [&_div.rounded-lg]:border [&_div.rounded-lg]:border-white/10 [&_div.rounded-lg]:bg-white/10 [&_p]:text-white/85 [&_svg]:text-white/60">
            <ArtworkInsightsControls />
          </div>
        </ArtworkInsightsProvider>
      </div>
    </div>
  );
}

export function GuideDisplay({ guide, isLoggedIn, locale }: GuideDisplayProps) {
  const pathname = usePathname();
  const router = useRouter();
  const resolvedLocale = toLocale(locale);
  const t = getGuideTranslations(resolvedLocale);
  const copy = t.guide;
  const heroImageUrl = guide.stops[0]?.image_id ?? null;
  const [zoomedStop, setZoomedStop] = useState<string | null>(null);

  const artists = useMemo(() => uniqueArtists(guide.stops), [guide.stops]);
  const highlightReasons = useMemo(() => guide.stops.slice(0, 3).map((s) => s.reason), [guide.stops]);
  const keyArtists = useMemo(() => artists.slice(0, 6).join(" · "), [artists]);
  const zoomedStopData = guide.stops.find((s) => s.artwork_id === zoomedStop) ?? null;

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
    <article className="overflow-x-hidden text-white">
      {heroImageUrl ? (
        <div className="relative h-[46vh] max-h-[320px] w-full overflow-hidden">
          <img
            src={heroImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ imageRendering: "auto" }}
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0" style={{ background: HERO_GRADIENT }} />

          <div className="absolute inset-x-0 bottom-0 px-5 pb-6 text-center">
            <p className="mb-2 text-base font-semibold tracking-[0.05em] text-white">{copy.eyebrow}</p>
            <h1 className="mx-auto mb-3 line-clamp-2 max-w-lg font-serif text-[22px] font-bold leading-tight text-white">
              {guide.title}
            </h1>

            <div className="mb-3 flex items-center justify-center gap-7">
              <Metric value={guide.stops.length} label={copy.metricStops} />
              <Metric value={artists.length} label={copy.metricArtists} />
              <Metric value={guide.stops.length} label={copy.metricArtworks} />
            </div>

            <p className="text-xs text-white/[0.78]">
              {copy.metaLine(guide.museum_name, guide.time_hours, guide.stops.length)}
            </p>

            <p className="mx-auto mt-2.5 line-clamp-3 max-w-lg text-sm leading-normal text-white/90">
              {guide.description}
            </p>
          </div>
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <p className="mb-2 text-base font-semibold tracking-[0.05em] text-white/60">{copy.eyebrow}</p>
          <h1 className="mx-auto line-clamp-2 max-w-lg font-serif text-[22px] font-bold text-white">{guide.title}</h1>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4">
        <div
          className="mb-7 rounded-2xl border border-white/[0.04] p-5"
          style={{ background: CARD_GRADIENT }}
        >
          <h2 className="mb-3 text-xl font-bold text-white">{copy.exploreTitle(guide.museum_name)}</h2>
          <p className="mb-4 text-[15px] leading-relaxed text-white/85">{guide.description}</p>

          {highlightReasons.length > 0 ? (
            <ul className="mb-4 space-y-1.5">
              {highlightReasons.map((reason, index) => (
                <li key={index} className="flex gap-2 text-sm leading-normal text-white/85">
                  <span className="shrink-0 text-[#5B9FE3]">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {keyArtists ? (
            <div className="mb-3.5">
              <p className="mb-1 text-xs text-white/50">{copy.keyArtistsLabel}</p>
              <p className="text-sm text-white">{keyArtists}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-white/10 p-3.5">
            <p className="mb-1.5 text-[11px] text-white/50">{copy.whatToNoticeLabel}</p>
            <p className="text-sm leading-normal text-white/85">{copy.whatToNoticeText}</p>
          </div>

          <div className="mt-2.5 flex gap-3 rounded-xl border border-white/10 p-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gray-500/20">
              <Eye className="size-[18px] text-white/60" aria-hidden />
            </div>
            <p className="flex-1 text-sm leading-normal text-white/85">{copy.eyeCtaText}</p>
          </div>
        </div>

        <div className="pb-4">
          {guide.stops.map((stop, index) => {
            const prevArtist = index > 0 ? guide.stops[index - 1].artist_display : null;
            const showArtistHeader = stop.artist_display !== prevArtist;

            return (
              <div key={stop.artwork_id}>
                {showArtistHeader ? (
                  <p className="mb-1 mt-1.5 text-[13px] font-bold uppercase tracking-[0.05em] text-white/90">
                    {stop.artist_display}
                  </p>
                ) : null}
                <StopCard
                  stop={stop}
                  locale={resolvedLocale}
                  copy={copy}
                  onOpenZoom={setZoomedStop}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => router.push(`${localePath(resolvedLocale, "museums")}/${guide.museum_slug}`)}
          className="mb-8 w-full rounded-xl border border-white/15 bg-transparent py-3.5 text-center text-[15px] font-semibold text-white/50 transition-colors hover:border-white/25 hover:text-white/70"
        >
          {copy.startOver}
        </button>
      </div>

      {zoomedStopData ? (
        <ZoomOverlay
          stop={zoomedStopData}
          locale={resolvedLocale}
          closeLabel={copy.closeZoomAriaLabel}
          onClose={() => setZoomedStop(null)}
        />
      ) : null}

      {false && <GuideLoginGate isLoggedIn={isLoggedIn} locale={locale} />}
    </article>
  );
}
