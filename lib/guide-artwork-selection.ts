import type { GuideArtworkCandidate, TimeHours, VisitType } from "@/lib/guide-types";
import { STOP_COUNT_BY_TIME } from "@/lib/guide-types";

function scoreBucket(score: number): "iconic" | "strong" | "discovery" {
  if (score >= 0.9) return "iconic";
  if (score >= 0.6) return "strong";
  return "discovery";
}

function normalizeStyle(style: string | null): string {
  const trimmed = style?.trim();
  return trimmed ? trimmed : "Unknown";
}

function filterCandidates(artworks: GuideArtworkCandidate[]): GuideArtworkCandidate[] {
  return artworks.filter(
    (artwork) =>
      artwork.artist_display.trim().length > 0 && artwork.image_id.trim().length > 0,
  );
}

function pickMasterpieces(candidates: GuideArtworkCandidate[], stopCount: number): GuideArtworkCandidate[] {
  const iconic = candidates.filter((a) => scoreBucket(a.score) === "iconic");
  const strong = candidates.filter((a) => scoreBucket(a.score) === "strong");
  return [...iconic, ...strong].slice(0, stopCount);
}

function pickOverview(candidates: GuideArtworkCandidate[], stopCount: number): GuideArtworkCandidate[] {
  const pool = candidates.filter((a) => {
    const bucket = scoreBucket(a.score);
    return bucket === "iconic" || bucket === "strong";
  });

  const byStyle = new Map<string, GuideArtworkCandidate[]>();
  for (const artwork of pool) {
    const style = normalizeStyle(artwork.style_title);
    const group = byStyle.get(style) ?? [];
    group.push(artwork);
    byStyle.set(style, group);
  }

  for (const group of byStyle.values()) {
    group.sort((a, b) => b.score - a.score);
  }

  const styles = [...byStyle.keys()].sort();
  const selected: GuideArtworkCandidate[] = [];
  const selectedIds = new Set<string>();

  while (selected.length < stopCount) {
    let added = false;
    for (const style of styles) {
      if (selected.length >= stopCount) break;
      const group = byStyle.get(style) ?? [];
      const next = group.find((artwork) => !selectedIds.has(artwork.id));
      if (next) {
        selected.push(next);
        selectedIds.add(next.id);
        added = true;
      }
    }
    if (!added) break;
  }

  if (selected.length < stopCount) {
    for (const artwork of pool) {
      if (selected.length >= stopCount) break;
      if (!selectedIds.has(artwork.id)) {
        selected.push(artwork);
        selectedIds.add(artwork.id);
      }
    }
  }

  return selected;
}

function pickInDepth(
  candidates: GuideArtworkCandidate[],
  stopCount: number,
  focus: string | undefined,
): GuideArtworkCandidate[] {
  const iconicStrong = candidates.filter((a) => {
    const bucket = scoreBucket(a.score);
    return bucket === "iconic" || bucket === "strong";
  });

  if (!focus?.trim()) {
    return pickMasterpieces(candidates, stopCount);
  }

  const focusLower = focus.trim().toLowerCase();
  const selected: GuideArtworkCandidate[] = [];
  const selectedIds = new Set<string>();

  const artistMatches = iconicStrong.filter((a) =>
    a.artist_display.toLowerCase().includes(focusLower),
  );
  const styleMatches = iconicStrong.filter(
    (a) =>
      !artistMatches.some((m) => m.id === a.id) &&
      (a.style_title?.toLowerCase().includes(focusLower) ?? false),
  );

  for (const artwork of [...artistMatches, ...styleMatches]) {
    if (selected.length >= stopCount) break;
    if (!selectedIds.has(artwork.id)) {
      selected.push(artwork);
      selectedIds.add(artwork.id);
    }
  }

  for (const artwork of iconicStrong) {
    if (selected.length >= stopCount) break;
    if (!selectedIds.has(artwork.id)) {
      selected.push(artwork);
      selectedIds.add(artwork.id);
    }
  }

  return selected;
}

export function selectArtworksForGuide(
  artworks: GuideArtworkCandidate[],
  visitType: VisitType,
  timeHours: TimeHours,
  focus?: string,
): GuideArtworkCandidate[] {
  const stopCount = STOP_COUNT_BY_TIME[timeHours];
  const candidates = filterCandidates(artworks);

  switch (visitType) {
    case "masterpieces":
      return pickMasterpieces(candidates, stopCount);
    case "overview":
      return pickOverview(candidates, stopCount);
    case "in_depth":
      return pickInDepth(candidates, stopCount, focus);
    default:
      return pickMasterpieces(candidates, stopCount);
  }
}
