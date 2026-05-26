import { cache } from "react";

import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

const BATCH = 1000;

/** Lowercase particles / small words common in artist names (non-leading tokens). */
const LOWER_WORDS = new Set([
  "de",
  "del",
  "della",
  "den",
  "der",
  "des",
  "di",
  "du",
  "el",
  "en",
  "la",
  "le",
  "of",
  "op",
  "ten",
  "ter",
  "the",
  "van",
  "von",
  "y",
  "da",
]);

function unslugifyArtist(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function particleNormalize(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts
    .map((part, i) => {
      const lower = part.toLowerCase();
      if (i > 0 && LOWER_WORDS.has(lower)) {
        return lower;
      }
      return part;
    })
    .join(" ");
}

function buildEqCandidates(slug: string): string[] {
  const fromSlug = unslugifyArtist(slug.trim());
  const variants = new Set<string>();
  if (fromSlug) {
    variants.add(fromSlug);
    variants.add(particleNormalize(fromSlug));
  }
  return Array.from(variants);
}

/**
 * Map URL slug (e.g. johannes-vermeer) to the exact `artworks.artist_display` string.
 * Avoids the old `.limit(5000)` sample that missed most artists.
 */
async function resolveArtistDisplayBySlugUncached(slug: string): Promise<string | null> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return null;
  }

  const targetSlug = slugify(trimmed);

  for (const candidate of buildEqCandidates(trimmed)) {
    const { count, error } = await supabase
      .from("artworks")
      .select("id", { count: "exact", head: true })
      .eq("artist_display", candidate);

    if (!error && (count ?? 0) > 0) {
      return candidate;
    }
  }

  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("artworks")
      .select("artist_display")
      .not("artist_display", "is", null)
      .order("id", { ascending: true })
      .range(from, from + BATCH - 1);

    if (error) {
      console.error("[resolveArtistDisplayBySlug] batch", from, error);
      return null;
    }

    const batch = (data as Array<{ artist_display: string | null }> | null) ?? [];
    if (!batch.length) {
      return null;
    }

    for (const row of batch) {
      const name = row.artist_display?.trim();
      if (name && slugify(name) === targetSlug) {
        return name;
      }
    }

    from += BATCH;
  }
}

export const resolveArtistDisplayBySlug = cache(resolveArtistDisplayBySlugUncached);
