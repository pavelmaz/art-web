"use client";

import { Eye, Loader2 } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ArtworkRow = {
  title: string;
  artist_display: string | null;
};

type Insight = {
  id: number;
  x: number;
  y: number;
  title: string;
  text: string;
};

type InsightsResponse = {
  insights: Insight[];
};

type ArtworkInsightsContextValue = {
  artwork: ArtworkRow;
  loading: boolean;
  error: string | null;
  insights: Insight[];
  visibleCount: number;
  activeId: number | null;
  openPopupId: number | null;
  setActiveId: (id: number | null) => void;
  setOpenPopupId: (id: number | null) => void;
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

function buildPrompt(artwork: ArtworkRow): string {
  const artist = artwork.artist_display?.trim() || "Unknown artist";
  return `You are an expert art guide. For the painting 
"${artwork.title}" by ${artist}, 
generate exactly 4 insights that create "aha moments".

Each insight must:
- Point to a SPECIFIC visible element in the painting
- Contain a concrete verifiable fact or observation
- Be written in simple engaging language (no philosophical fluff)
- Create genuine surprise or discovery
- Be 1-2 sentences max

Provide x/y position (0-100 percentage) where the marker 
should appear on the image, placed on the actual element.

Return ONLY valid JSON:
{
  "insights": [
    {
      "id": 1,
      "x": 45,
      "y": 30,
      "title": "short label 3-4 words",
      "text": "The insight text. One surprising specific fact."
    }
  ]
}`;
}

export function ArtworkInsightsProvider({
  artwork,
  children,
}: {
  artwork: ArtworkRow;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [openPopupId, setOpenPopupId] = useState<number | null>(null);
  const hasInsights = insights.length > 0;

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
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      setError("OpenAI API key is not configured.");
      return;
    }

    setLoading(true);
    setError(null);
    setInsights([]);
    setVisibleCount(0);
    setActiveId(null);
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
          messages: [{ role: "user", content: buildPrompt(artwork) }],
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate insights.");
    } finally {
      setLoading(false);
    }
  }, [artwork]);

  return (
    <ArtworkInsightsContext.Provider
      value={{
        artwork,
        loading,
        error,
        insights,
        visibleCount,
        activeId,
        openPopupId,
        setActiveId,
        setOpenPopupId,
        handleDiscover,
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes insight-dot-in{from{opacity:0;transform:translate(-50%,-50%) scale(.75)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`,
        }}
      />
      {children}
    </ArtworkInsightsContext.Provider>
  );
}

/** Overlay insight dots on the main artwork image (place inside a `relative` wrapper). */
export function ArtworkInsightsOverlay() {
  const { insights, visibleCount, activeId, openPopupId, setActiveId, setOpenPopupId } =
    useArtworkInsights();

  if (visibleCount === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {insights.slice(0, visibleCount).map((insight) => {
        const isActive = activeId === insight.id;
        const isOpen = openPopupId === insight.id;
        return (
          <div
            key={insight.id}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${insight.x}%`,
              top: `${insight.y}%`,
              animation: "insight-dot-in 0.35s ease-out forwards",
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenPopupId(isOpen ? null : insight.id);
                setActiveId(insight.id);
              }}
              className={`relative flex size-9 items-center justify-center rounded-full border-2 bg-transparent transition-all ${
                isActive
                  ? "border-white shadow-[0_0_0_3px_rgba(59,130,246,0.6)]"
                  : "border-white/90 hover:border-white"
              }`}
              aria-label={insight.title}
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-white/95 text-[11px] font-semibold text-[#1a1a1a]">
                {insight.id}
              </span>
            </button>
            {isOpen ? (
              <div
                className="absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-lg px-3 py-2.5 text-left text-xs leading-relaxed text-white shadow-lg backdrop-blur-md sm:w-64"
                style={{ background: "rgba(15,15,15,0.95)" }}
              >
                <p className="mb-1 font-medium">{insight.title}</p>
                <p className="text-white/90">{insight.text}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Blue info box, Discover button, and insight cards — place under the main artwork image. */
export function ArtworkInsightsControls() {
  const {
    loading,
    error,
    insights,
    visibleCount,
    activeId,
    openPopupId,
    setActiveId,
    setOpenPopupId,
    handleDiscover,
  } = useArtworkInsights();

  const hasInsights = insights.length > 0;
  const showCards = hasInsights && visibleCount >= insights.length;

  return (
    <div className="mt-4 space-y-4">
      {showCards ? (
        <div className="grid grid-cols-2 gap-3">
          {insights.map((insight) => {
            const isActive = activeId === insight.id;
            return (
              <button
                key={insight.id}
                type="button"
                onClick={() => {
                  setActiveId(insight.id);
                  setOpenPopupId(insight.id);
                }}
                className={`rounded-lg border bg-white p-3 text-left transition-shadow ${
                  isActive
                    ? "border-[#3b82f6] shadow-[0_0_0_1px_rgba(59,130,246,0.4)]"
                    : "border-[#e8e6e1] hover:border-[#d1d5db]"
                }`}
              >
                <p className="text-xs font-semibold text-[#1a1a1a]">{insight.title}</p>
                <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-[#6b6b6b]">{insight.text}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        className="flex items-start gap-2.5 px-3 py-2.5 text-sm text-[#1e40af]"
        style={{
          background: "rgba(59,130,246,0.06)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: "10px",
        }}
      >
        <Eye className="mt-0.5 size-4 shrink-0 text-[#3b82f6]" aria-hidden />
        <p className="leading-snug text-[#1e3a8a]">Discover insights about this artwork</p>
      </div>

      <button
        type="button"
        onClick={handleDiscover}
        disabled={loading}
        className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-md border border-[#d1d5db] bg-transparent px-4 py-2 text-sm font-medium text-[#4a4a4a] transition-colors hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Generating...
          </>
        ) : (
          "Discover"
        )}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
