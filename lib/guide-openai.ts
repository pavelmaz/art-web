import type { GuideArtworkCandidate, GuideInterest } from "@/lib/guide-types";

function getOpenAiApiKey(): string {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY?.trim() ||
    ""
  );
}

type OpenAiJsonResult<T> = { data: T } | { error: string };

const OPENAI_TIMEOUT_MS = 20000;
const OPENAI_MAX_ATTEMPTS = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls OpenAI for a JSON response with a hard per-attempt timeout (so a slow call
 * can't silently eat the whole 60s function budget and leave the user hanging) and a
 * retry on transient failures — timeouts, rate limits (429), 5xx, and empty/invalid
 * JSON. Bounded so the worst case stays within the route budget even with two
 * concurrent calls.
 */
async function callOpenAiJson<T>(prompt: string, maxTokens: number): Promise<OpenAiJsonResult<T>> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return { error: "OpenAI API key is not configured" };
  }

  let lastError = "OpenAI request failed";

  for (let attempt = 1; attempt <= OPENAI_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        lastError = `OpenAI request failed (${response.status}): ${body.slice(0, 200)}`;
        if (response.status === 429 || response.status >= 500) {
          await sleep(500 * attempt);
          continue;
        }
        return { error: lastError };
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        lastError = "OpenAI returned an empty response";
        await sleep(500 * attempt);
        continue;
      }

      try {
        return { data: JSON.parse(content) as T };
      } catch {
        lastError = "OpenAI returned invalid JSON";
        await sleep(500 * attempt);
        continue;
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
      await sleep(500 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  return { error: lastError };
}

type OverviewResponse = {
  title?: string;
  description?: string;
  stops?: Array<{ artwork_id?: string; order?: number; reason?: string }>;
};

type InsightsResponse = {
  insights?: Array<{ artwork_id?: string; bullets?: string[] }>;
};

export type GeneratedOverview = {
  title: string;
  description: string;
  stops: Array<{ artwork_id: string; order: number; reason: string }>;
};

export type GeneratedInsights = Map<string, string[]>;

export async function generateGuideOverview(
  museumName: string,
  visitType: string,
  timeHours: number,
  focus: string | null,
  stopCount: number,
  selected: GuideArtworkCandidate[],
  options?: { isFirstVisit?: boolean; interest?: GuideInterest },
): Promise<OpenAiJsonResult<GeneratedOverview>> {
  const artworkList = selected
    .map((a) => `ID: ${a.id} | ${a.title} by ${a.artist_display} (score: ${a.score})`)
    .join("\n");

  const interest = options?.interest ?? "stories";
  const visitorType = options?.isFirstVisit ? "first visit" : "returning visitor";

  const prompt = `You write short museum visit guides for a mobile-first art platform.

Generate a visit guide for:
Museum: ${museumName}
Visit type: ${visitType}
Duration: ${timeHours} hours
Focus: ${focus ?? "none"}
Number of stops: ${stopCount}
Visitor type: ${visitorType}
Visitor interest: ${interest}

Artworks selected (in order):
${artworkList}

Return ONLY valid JSON with this exact shape:
{
  "title": "short evocative guide title (max 60 chars)",
  "description": "2-3 sentence guide overview, what the visitor will experience",
  "stops": [
    {
      "artwork_id": "exact id from the list",
      "order": 1,
      "reason": "one sentence: why this work is on this route"
    }
  ]
}

Rules:
- title should feel like a real guide title, not generic
- description should set expectations for the visit
- reason for each stop must be specific to the artwork, not generic ("this is a famous painting")
- never use: masterpiece, stunning, beautiful, amazing, breathtaking, world-class
- JSON only, no markdown, no explanation`;

  const result = await callOpenAiJson<OverviewResponse>(prompt, 2000);
  if ("error" in result) {
    return result;
  }

  const title = result.data.title?.trim();
  const description = result.data.description?.trim();
  const stops = result.data.stops;

  if (!title || !description || !Array.isArray(stops) || stops.length === 0) {
    return { error: "OpenAI overview response is missing required fields" };
  }

  const parsedStops = stops
    .map((stop, index) => ({
      artwork_id: stop.artwork_id?.trim() ?? "",
      order: typeof stop.order === "number" ? stop.order : index + 1,
      reason: stop.reason?.trim() ?? "",
    }))
    .filter((stop) => stop.artwork_id && stop.reason);

  if (parsedStops.length === 0) {
    return { error: "OpenAI overview response has no valid stops" };
  }

  return {
    data: {
      title,
      description,
      stops: parsedStops,
    },
  };
}

export async function generateGuideInsights(
  selected: GuideArtworkCandidate[],
  interest: GuideInterest = "stories",
): Promise<OpenAiJsonResult<GeneratedInsights>> {
  const artworkList = selected
    .map((a) => `ID: ${a.id} | Title: ${a.title} | Artist: ${a.artist_display}`)
    .join("\n");

  const prompt = `You write educational content for an art platform.
Tone: direct, simple, human. Not academic.

For each artwork below generate exactly 3 insight bullets.

Artworks:
${artworkList}

Visitor interest: ${interest}
- If 'stories': prioritize historical context and commission reasons in bullets
- If 'artist': prioritize facts about the artist's life and technique in bullets
- If 'visual': prioritize visual details the visitor can spot, and impact/uniqueness of the work

Return ONLY valid JSON:
{
  "insights": [
    {
      "artwork_id": "exact id",
      "bullets": ["bullet1", "bullet2", "bullet3"]
    }
  ]
}

Bullet structure — follow this order exactly:

Bullet 1: The real reason this specific work was made.
Name the patron, the occasion, or the personal motivation.
Not "it was a commission" — say WHO commissioned it and WHY.

Bullet 2: A specific visual detail the visitor can verify
by looking at the image right now. Must start with
"Look at..." or "Notice..." and point to something
non-obvious — not light and shadow, not composition,
not color palette (too generic). Something specific:
a hidden face, an object out of place, an unusual detail.

Bullet 3: Historical context with a SPECIFIC year AND
a SPECIFIC city or region. Not "a period of prosperity" —
say what was actually happening: a war, a political event,
a social change, and how it connects directly to this
artist or this work.

BANNED phrases across all bullets:
"captures", "explores", "invites the viewer", "timeless",
"powerful", "moving", "resonates", "essence", "dynamic",
"remarkable", "significant", "masterpiece", "stunning",
"period of prosperity", "gaining recognition",
"use of light and shadow", "human condition"

Each bullet must make the visitor think
"I didn't know that" — not "I could have guessed that."

Rules:
- Short sentences, one or two clauses max
- No emojis, no rhetorical questions
- JSON only, no markdown`;

  const maxTokens = Math.min(16000, 400 + selected.length * 500);
  const result = await callOpenAiJson<InsightsResponse>(prompt, maxTokens);
  if ("error" in result) {
    return result;
  }

  const insights = new Map<string, string[]>();
  for (const item of result.data.insights ?? []) {
    const artworkId = item.artwork_id?.trim();
    const bullets = item.bullets?.map((b) => b.trim()).filter(Boolean) ?? [];
    if (artworkId && bullets.length > 0) {
      insights.set(artworkId, bullets.slice(0, 3));
    }
  }

  if (insights.size === 0) {
    return { error: "OpenAI insights response has no valid entries" };
  }

  return { data: insights };
}
