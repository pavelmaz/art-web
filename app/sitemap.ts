import type { MetadataRoute } from "next";

import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

type ArtworkSlugRow = {
  slug: string | null;
};

type StyleSlugRow = {
  slug: string | null;
};

type ValueRow = {
  genre_title?: string | null;
  artist_display?: string | null;
  museum?: string | null;
};

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function toAbsolute(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const staticPaths = ["/", "/artworks", "/styles", "/genres", "/artists", "/museums"];

  const [artworksResult, stylesResult, genresResult, artistsResult, museumsResult] = await Promise.all([
    supabase.from("artworks").select("slug").not("slug", "is", null),
    supabase.from("styles").select("slug").not("slug", "is", null),
    supabase.from("artworks").select("genre_title").not("genre_title", "is", null),
    supabase.from("artworks").select("artist_display").not("artist_display", "is", null),
    supabase.from("artworks").select("museum").not("museum", "is", null),
  ]);

  const artworkPaths = uniqueNonEmpty(((artworksResult.data as ArtworkSlugRow[] | null) ?? []).map((item) => item.slug)).map(
    (slug) => `/artworks/${slug}`
  );

  const stylePaths = uniqueNonEmpty(((stylesResult.data as StyleSlugRow[] | null) ?? []).map((item) => item.slug)).map(
    (slug) => `/styles/${slug}`
  );

  const genrePaths = uniqueNonEmpty(((genresResult.data as ValueRow[] | null) ?? []).map((item) => item.genre_title)).map(
    (genre) => `/genres/${slugify(genre)}`
  );

  const artistPaths = uniqueNonEmpty(
    ((artistsResult.data as ValueRow[] | null) ?? []).map((item) => item.artist_display)
  ).map((artist) => `/artists/${slugify(artist)}`);

  const museumPaths = uniqueNonEmpty(((museumsResult.data as ValueRow[] | null) ?? []).map((item) => item.museum)).map(
    (museum) => `/museums/${slugify(museum)}`
  );

  return [...staticPaths, ...artworkPaths, ...stylePaths, ...genrePaths, ...artistPaths, ...museumPaths].map((path) => ({
    url: toAbsolute(baseUrl, path),
  }));
}
