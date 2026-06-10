import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { selectArtworksForGuide } from "@/lib/guide-artwork-selection";
import {
  generateGuideInsights,
  generateGuideOverview,
  type GeneratedOverview,
} from "@/lib/guide-openai";
import type {
  GenerateGuideRequest,
  GuideArtworkCandidate,
  GuideData,
  GuideStop,
  TimeHours,
  VisitType,
} from "@/lib/guide-types";
import { TIME_HOURS_OPTIONS, VISIT_TYPES } from "@/lib/guide-types";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const ARTWORK_SELECT_COLUMNS =
  "id, title, artist_display, image_id, score, style_title";

function isVisitType(value: unknown): value is VisitType {
  return typeof value === "string" && (VISIT_TYPES as readonly string[]).includes(value);
}

function isTimeHours(value: unknown): value is TimeHours {
  return typeof value === "number" && (TIME_HOURS_OPTIONS as readonly number[]).includes(value);
}

function parseRequest(body: unknown): GenerateGuideRequest | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object" };
  }

  const raw = body as Record<string, unknown>;
  const museum_slug = typeof raw.museum_slug === "string" ? raw.museum_slug.trim() : "";
  const museum_name = typeof raw.museum_name === "string" ? raw.museum_name.trim() : "";
  const visit_type = raw.visit_type;
  const time_hours = raw.time_hours;
  const locale = typeof raw.locale === "string" && raw.locale.trim() ? raw.locale.trim() : "en";
  const focus = typeof raw.focus === "string" && raw.focus.trim() ? raw.focus.trim() : undefined;

  if (!museum_slug || !museum_name) {
    return { error: "museum_slug and museum_name are required" };
  }
  if (!isVisitType(visit_type)) {
    return { error: "visit_type must be masterpieces, overview, or in_depth" };
  }
  if (!isTimeHours(time_hours)) {
    return { error: "time_hours must be 0.5, 1, 1.5, 2, 3, or 4" };
  }

  return {
    museum_slug,
    museum_name,
    visit_type,
    time_hours,
    focus,
    locale,
  };
}

function focusMatchesArtwork(focus: string, artwork: GuideArtworkCandidate): boolean {
  const focusWords = focus.toLowerCase().trim().split(/\s+/);
  const artistLower = (artwork.artist_display || "").toLowerCase();
  const styleLower = (artwork.style_title || "").toLowerCase();
  const titleLower = (artwork.title || "").toLowerCase();

  return focusWords.some(
    (word) =>
      word.length > 2 &&
      (artistLower.includes(word) || styleLower.includes(word) || titleLower.includes(word)),
  );
}

function topArtistSuggestions(artworks: GuideArtworkCandidate[], limit = 5): string[] {
  const counts: Record<string, number> = {};
  for (const artwork of artworks) {
    counts[artwork.artist_display] = (counts[artwork.artist_display] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

async function fetchMuseumArtworks(museumName: string): Promise<GuideArtworkCandidate[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select(ARTWORK_SELECT_COLUMNS)
    .eq("museum", museumName)
    .not("image_id", "is", null)
    .order("score", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Failed to fetch artworks: ${error.message}`);
  }

  return ((data ?? []) as Array<{
    id: string;
    title: string;
    artist_display: string | null;
    image_id: string | null;
    score: number | null;
    style_title: string | null;
  }>)
    .filter((row) => row.id && row.title && row.image_id && row.artist_display?.trim())
    .map((row) => ({
      id: row.id,
      title: row.title,
      artist_display: row.artist_display!.trim(),
      image_id: row.image_id!,
      score: typeof row.score === "number" ? row.score : 0,
      style_title: row.style_title,
    }));
}

function assembleGuide(
  request: GenerateGuideRequest,
  selected: GuideArtworkCandidate[],
  overview: GeneratedOverview,
  insights: Map<string, string[]>,
): GuideData {
  const selectedById = new Map(selected.map((artwork) => [artwork.id, artwork]));
  const stops: GuideStop[] = [];

  for (const aiStop of overview.stops) {
    const artwork = selectedById.get(aiStop.artwork_id);
    if (!artwork) continue;

    stops.push({
      order: aiStop.order,
      artwork_id: artwork.id,
      title: artwork.title,
      artist_display: artwork.artist_display,
      image_id: artwork.image_id,
      score: artwork.score,
      reason: aiStop.reason,
      bullets: insights.get(artwork.id) ?? [],
    });
  }

  stops.sort((a, b) => a.order - b.order);

  for (let i = 0; i < stops.length; i += 1) {
    stops[i] = { ...stops[i], order: i + 1 };
  }

  return {
    title: overview.title,
    description: overview.description,
    museum_name: request.museum_name,
    museum_slug: request.museum_slug,
    visit_type: request.visit_type,
    time_hours: request.time_hours,
    focus: request.focus ?? null,
    generated_at: new Date().toISOString(),
    stops,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseRequest(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const artworks = await fetchMuseumArtworks(parsed.museum_name);
    if (artworks.length === 0) {
      return NextResponse.json(
        { error: `No artworks found for museum: ${parsed.museum_name}` },
        { status: 404 },
      );
    }

    if (parsed.visit_type === "in_depth" && parsed.focus) {
      const focusMatches = artworks.some((a) => focusMatchesArtwork(parsed.focus!, a));
      if (!focusMatches) {
        return NextResponse.json(
          {
            error: "focus_not_found",
            message: `No artworks found matching '${parsed.focus}' at ${parsed.museum_name}. Try a different artist or style.`,
            suggestions: topArtistSuggestions(artworks),
          },
          { status: 422 },
        );
      }
    }

    const selected = selectArtworksForGuide(
      artworks,
      parsed.visit_type,
      parsed.time_hours,
      parsed.focus,
    );

    if (selected.length === 0) {
      return NextResponse.json(
        { error: "No suitable artworks could be selected for this visit" },
        { status: 404 },
      );
    }

    const stopCount = selected.length;

    const [overviewResult, insightsResult] = await Promise.all([
      generateGuideOverview(
        parsed.museum_name,
        parsed.visit_type,
        parsed.time_hours,
        parsed.focus ?? null,
        stopCount,
        selected,
      ),
      generateGuideInsights(selected),
    ]);

    if ("error" in overviewResult) {
      console.error("[guides/generate] OpenAI overview error:", overviewResult.error);
      return NextResponse.json({ error: overviewResult.error }, { status: 500 });
    }

    if ("error" in insightsResult) {
      console.error("[guides/generate] OpenAI insights error:", insightsResult.error);
      return NextResponse.json({ error: insightsResult.error }, { status: 500 });
    }

    const guideData = assembleGuide(
      parsed,
      selected,
      overviewResult.data,
      insightsResult.data,
    );

    if (guideData.stops.length === 0) {
      return NextResponse.json(
        { error: "Failed to assemble guide: no matching stops from AI response" },
        { status: 500 },
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("guided_visits")
      .insert({
        museum_slug: parsed.museum_slug,
        museum_name: parsed.museum_name,
        visit_type: parsed.visit_type,
        time_hours: parsed.time_hours,
        focus: parsed.focus ?? null,
        locale: parsed.locale,
        guide_data: guideData,
        user_id: null,
      })
      .select("token")
      .single();

    if (insertError || !inserted?.token) {
      console.error("[guides/generate] Supabase insert error:", insertError?.message);
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to save guide" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      token: inserted.token,
      guide: guideData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[guides/generate] unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
