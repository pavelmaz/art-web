"use client";

import { track } from "@vercel/analytics";
import { Eye, Loader2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import Link from "next/link";

import { fineArtProPath } from "@/lib/fineart-pro-path";
import { getT, type Locale } from "@/lib/translations";

export type ArtworkRow = {
  title: string;
  artist_display: string | null;
};

type Insight = {
  id: number;
  category?: string;
  x: number;
  y: number;
  title: string;
  text: string;
};

type InsightsResponse = {
  insights: Insight[];
};

type InsightsLabels = {
  insightsDiscoverAbout: string;
  insightsDiscover: string;
  insightsGenerating: string;
  insightsClose: string;
  insightsApiKeyMissing: string;
  insightsGenerateFailed: string;
};

type ArtworkInsightsContextValue = {
  artwork: ArtworkRow;
  locale: Locale;
  labels: InsightsLabels;
  loading: boolean;
  error: string | null;
  insights: Insight[];
  visibleCount: number;
  openPopupId: number | null;
  setOpenPopupId: (id: number | null) => void;
  closePopup: () => void;
  handleDiscover: () => void;
};

const ArtworkInsightsContext = createContext<ArtworkInsightsContextValue | null>(null);

function useArtworkInsights() {
  const ctx = useContext(ArtworkInsightsContext);
  if (!ctx) {
    throw new Error("ArtworkInsights components must be used within ArtworkInsightsProvider");
  }
  return ctx;
}

const OUTPUT_LANGUAGE: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  ja: "Japanese",
  fr: "French",
  de: "German",
  it: "Italian",
  ko: "Korean",
  ru: "Russian",
  zh: "Chinese",
};

function buildPrompt(artwork: ArtworkRow, locale: Locale): string {
  const artist = artwork.artist_display?.trim() || "Unknown artist";
  const language = OUTPUT_LANGUAGE[locale];
  return `You are a world-class museum audio guide writer and art historian. 
For the painting "${artwork.title}" by ${artist}, generate exactly 4 insights 
that make viewers feel like insiders — people who now see what others miss.

Each insight must belong to ONE of these 4 categories (use all 4, in this order):

1. THE HIDDEN SECRET — A detail most people walk past but changes everything once 
   you see it. A symbol, hidden figure, visual trick, or disguised meaning embedded 
   in a specific part of the painting.

2. WHY IT WAS PAINTED — The real reason, commission, political motive, personal 
   obsession, or historical moment that made the artist create this. Not "he loved 
   beauty" — the actual documented reason or context.

3. TIME CAPSULE — One element in the painting that reveals something surprising 
   about everyday life, fashion, technology, or society in that exact era. 
   Anchor it with a specific date or time period (e.g., "In 1665, only nobility 
   could afford...").

4. THE PAINTER'S TRICK — A deliberate technical or compositional decision the 
   artist made — a perspective cheat, an impossible light source, a brushwork 
   innovation, a color that shouldn't work but does — and why they did it.

Rules for ALL insights:
- Point to a SPECIFIC visible element (not "the painting overall")
- 2 sentences max: sentence 1 = what to look at / the fact, sentence 2 = why it matters or surprises
- Write like you're whispering a secret to a friend, not lecturing
- NO philosophical fluff, NO vague praise ("masterful", "timeless")
- At least 1 insight must contain a concrete data point: a year, a price, a 
  measurement, a documented historical fact with a date
- Write every "title" and "text" field in ${language}. Keep JSON keys and "category" values in English.

Provide x/y position (0-100 percentage) for where the dot should appear on the 
painting, placed precisely on the element being described.

Return ONLY valid JSON:
{
  "insights": [
    {
      "id": 1,
      "category": "hidden_secret",
      "x": 45,
      "y": 30,
      "title": "3-4 word label",
      "text": "Sentence one: the specific fact or observation. Sentence two: why it's surprising or what it reveals."
    }
  ]
}`;
}

const FREE_INSIGHT_STORAGE_KEY = "faf-insights-free-used";

function markFreeInsightUsed(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(FREE_INSIGHT_STORAGE_KEY, "1");
  } catch {
    // storage unavailable (private mode etc.) — fail open
  }
}

export function ArtworkInsightsProvider({
  artwork,
  locale,
  isPro = false,
  children,
}: {
  artwork: ArtworkRow;
  locale: Locale;
  isPro?: boolean;
  children: ReactNode;
}) {
  const labels = getT(locale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [openPopupId, setOpenPopupId] = useState<number | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  const hasInsights = insights.length > 0;

  const closePopup = useCallback(() => {
    setOpenPopupId(null);
  }, []);

  useEffect(() => {
    if (!hasInsights || visibleCount >= insights.length) {
      return;
    }
    const timer = window.setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [hasInsights, insights.length, visibleCount]);

  const handleDiscover = useCallback(async () => {
    // Insights are temporarily free for everyone — the Pro gate below is disabled.
    // To re-enable: restore the `hasUsedFreeInsight()` check that showed the modal.
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      setError(labels.insightsApiKeyMissing);
      return;
    }

    track("Artwork Insights Discover", { locale });

    setLoading(true);
    setError(null);
    setInsights([]);
    setVisibleCount(0);
    setOpenPopupId(null);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1000,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: buildPrompt(artwork, locale) }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed (${response.status})`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from API");
      }

      const parsed = JSON.parse(content) as InsightsResponse;
      const list = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 4) : [];
      setInsights(list);
      setVisibleCount(0);
      if (!isPro) {
        markFreeInsightUsed();
      }
      track("Artwork Insights Generated", {
        locale,
        count: list.length,
      });
    } catch {
      track("Artwork Insights Failed", { locale });
      setError(labels.insightsGenerateFailed);
    } finally {
      setLoading(false);
    }
  }, [artwork, isPro, locale, labels.insightsApiKeyMissing, labels.insightsGenerateFailed]);

  return (
    <ArtworkInsightsContext.Provider
      value={{
        artwork,
        locale,
        labels: {
          insightsDiscoverAbout: labels.insightsDiscoverAbout,
          insightsDiscover: labels.insightsDiscover,
          insightsGenerating: labels.insightsGenerating,
          insightsClose: labels.insightsClose,
          insightsApiKeyMissing: labels.insightsApiKeyMissing,
          insightsGenerateFailed: labels.insightsGenerateFailed,
        },
        loading,
        error,
        insights,
        visibleCount,
        openPopupId,
        setOpenPopupId,
        closePopup,
        handleDiscover,
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes insight-dot-in{from{opacity:0;transform:translate(-50%,-50%) scale(.75)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`,
        }}
      />
      {children}
      {showProModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowProModal(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowProModal(false)}
              className="absolute right-3 top-3 rounded p-1 text-[#9e9e9e] transition-colors hover:bg-[#f0ede8] hover:text-[#1a1a1a]"
              aria-label={labels.insightsClose}
            >
              <X className="size-4" aria-hidden />
            </button>
            <h3 className="mb-2 text-lg font-semibold text-[#1a1a1a]">{labels.insightsLimitTitle}</h3>
            <p className="mb-5 text-sm leading-relaxed text-[#6b6b6b]">{labels.insightsLimitBody}</p>
            <Link
              href={fineArtProPath(locale)}
              onClick={() => track("Artwork Insights Upsell Click", { locale })}
              className="inline-flex w-full items-center justify-center rounded-md bg-gradient-to-br from-[#4CAF50] to-[#1e9e57] px-5 py-2.5 text-sm font-medium text-white shadow-[0_6px_18px_rgba(76,175,80,0.4)] transition hover:brightness-110"
            >
              {labels.insightsLimitCta}
            </Link>
          </div>
        </div>
      ) : null}
    </ArtworkInsightsContext.Provider>
  );
}

/** Overlay insight dots on the main artwork image (place inside a `relative` wrapper). */
export function ArtworkInsightsOverlay() {
  const { insights, visibleCount, openPopupId, setOpenPopupId, closePopup, labels, loading, handleDiscover } =
    useArtworkInsights();

  // Before any insights exist, show a frosted-glass "Discover" pill on the painting itself.
  if (insights.length === 0) {
    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDiscover();
          }}
          disabled={loading}
          aria-label={labels.insightsDiscoverAbout}
          className="pointer-events-auto absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/35 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-70"
          style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {labels.insightsGenerating}
            </>
          ) : (
            <>
              <Eye className="size-4" aria-hidden />
              {labels.insightsDiscover}
            </>
          )}
        </button>
      </div>
    );
  }

  if (visibleCount === 0) {
    return null;
  }

  const visibleInsights =
    openPopupId !== null
      ? insights.filter((insight) => insight.id === openPopupId)
      : insights.slice(0, visibleCount);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {visibleInsights.map((insight) => {
        const isOpen = openPopupId === insight.id;
        const number = insights.findIndex((i) => i.id === insight.id) + 1;
        return (
          <div
            key={insight.id}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${insight.x}%`,
              top: `${insight.y}%`,
              animation: isOpen ? undefined : "insight-dot-in 0.35s ease-out forwards",
            }}
          >
            {!isOpen ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPopupId(insight.id);
                }}
                className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/35 text-xs font-bold text-white shadow-lg transition-transform hover:scale-110"
                style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                aria-label={`${number}. ${insight.title}`}
              >
                {number}
              </button>
            ) : null}
            {isOpen ? (
              <div
                className="absolute left-1/2 top-1/2 z-20 w-56 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/30 bg-black/35 px-3 py-2.5 pr-8 text-left text-xs leading-relaxed text-white shadow-lg sm:w-64"
                style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closePopup();
                  }}
                  className="absolute right-2 top-2 rounded p-0.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  aria-label={labels.insightsClose}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
                <p className="mb-1 font-semibold text-white">{insight.title}</p>
                <p className="text-white">{insight.text}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Info box and Discover button — place under the main artwork image. */
export function ArtworkInsightsControls() {
  const { error } = useArtworkInsights();

  if (!error) {
    return null;
  }

  return <p className="mt-3 text-xs text-red-600">{error}</p>;
}
