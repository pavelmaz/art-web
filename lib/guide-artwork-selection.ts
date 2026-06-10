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

function pickOverview(
  candidates: GuideArtworkCandidate[],
  stopCount: number,
  returningVisitor = false,
): GuideArtworkCandidate[] {
  const pool = candidates.filter((a) => {
    const bucket = scoreBucket(a.score);
    if (returningVisitor) {
      return bucket === "iconic" || bucket === "strong" || bucket === "discovery";
    }
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
    if (returningVisitor) {
      group.sort((a, b) => {
        const bucketRank = { discovery: 0, strong: 1, iconic: 2 };
        const rankA = bucketRank[scoreBucket(a.score)];
        const rankB = bucketRank[scoreBucket(b.score)];
        if (rankA !== rankB) return rankA - rankB;
        return b.score - a.score;
      });
    } else {
      group.sort((a, b) => b.score - a.score);
    }
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

  const trimmedFocus = focus.trim();
  const focusWords = trimmedFocus.toLowerCase().split(/\s+/);
  const fieldMatches = (text: string) =>
    focusWords.some((word) => word.length > 2 && text.toLowerCase().includes(word));
  const selected: GuideArtworkCandidate[] = [];
  const selectedIds = new Set<string>();

  const matching = iconicStrong.filter((a) => focusMatchesArtwork(trimmedFocus, a));
  const artistMatches = matching.filter((a) => fieldMatches(a.artist_display));
  const styleMatches = matching.filter(
    (a) =>
      !artistMatches.some((m) => m.id === a.id) && fieldMatches(a.style_title ?? ""),
  );
  const titleMatches = matching.filter(
    (a) =>
      !artistMatches.some((m) => m.id === a.id) &&
      !styleMatches.some((m) => m.id === a.id) &&
      fieldMatches(a.title),
  );

  for (const artwork of [...artistMatches, ...styleMatches, ...titleMatches]) {
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
  options?: { returningVisitor?: boolean },
): GuideArtworkCandidate[] {
  const stopCount = STOP_COUNT_BY_TIME[timeHours];
  const candidates = filterCandidates(artworks);

  switch (visitType) {
    case "masterpieces":
      return pickMasterpieces(candidates, stopCount);
    case "overview":
      return pickOverview(candidates, stopCount, options?.returningVisitor ?? false);
    case "in_depth":
      return pickInDepth(candidates, stopCount, focus);
    default:
      return pickMasterpieces(candidates, stopCount);
  }
}
