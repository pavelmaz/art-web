import { supabase } from "@/lib/supabase";

export type ArtistProfileRow = {
  name: string;
  slug: string;
  image_url: string | null;
  nationality: string | null;
  birth_year: number | null;
  death_year: number | null;
  artwork_count: number | null;
  bio: string | null;
  bio_es: string | null;
  bio_pt: string | null;
  bio_ja: string | null;
};

const ARTIST_PROFILE_COLUMNS =
  "name, slug, image_url, nationality, birth_year, death_year, artwork_count, bio, bio_es, bio_pt, bio_ja";

export async function getArtistProfileBySlug(slug: string): Promise<ArtistProfileRow | null> {
  const { data, error } = await supabase
    .from("artists")
    .select(ARTIST_PROFILE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[getArtistProfileBySlug]", slug, error.message);
    return null;
  }

  return (data as ArtistProfileRow | null) ?? null;
}

export function getArtistBioForLocale(artist: ArtistProfileRow, locale: "en" | "es" | "pt" | "ja"): string | null {
  if (locale === "es") {
    return artist.bio_es?.trim() || artist.bio?.trim() || null;
  }
  if (locale === "pt") {
    return artist.bio_pt?.trim() || artist.bio?.trim() || null;
  }
  if (locale === "ja") {
    return artist.bio_ja?.trim() || artist.bio?.trim() || null;
  }
  return artist.bio?.trim() || null;
}
