import type { MetadataRoute } from "next";

import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

/** Avoid build-time prerender: paginated Supabase reads exceed statement timeout. */
export const dynamic = "force-dynamic";

type ArtworkSlugRow = {
  slug: string | null;
};

type StyleSlugRow = {
  slug: string | null;
};

const PAGE_SIZE = 1000;

/** Single-file sitemap must stay small enough for Vercel (huge XML → 500 / truncated). */
const MAX_ARTWORK_URLS = 12_000;
const MAX_LISTED_SLUGS = 4_000;

const STATIC_PATHS = ["/", "/artworks", "/styles", "/genres", "/artists", "/museums"] as const;

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  return "https://fineartfree.com";
}

function toAbsolute(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

async function fetchAllArtworkSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let from = 0;

  while (slugs.length < MAX_ARTWORK_URLS) {
    const { data, error } = await supabase
      .from("artworks")
      .select("id, slug")
      .not("slug", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const rows = (data as ArtworkSlugRow[] | null) ?? [];
    for (const row of rows) {
      if (row.slug?.trim()) {
        slugs.push(row.slug.trim());
        if (slugs.length >= MAX_ARTWORK_URLS) {
          break;
        }
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return Array.from(new Set(slugs));
}

async function fetchAllStyleSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let from = 0;

  while (slugs.length < MAX_LISTED_SLUGS) {
    const { data, error } = await supabase
      .from("styles")
      .select("slug")
      .not("slug", "is", null)
      .order("slug", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const rows = (data as StyleSlugRow[] | null) ?? [];
    for (const row of rows) {
      if (row.slug?.trim()) {
        slugs.push(row.slug.trim());
        if (slugs.length >= MAX_LISTED_SLUGS) {
          break;
        }
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return Array.from(new Set(slugs));
}

async function fetchAllArtworkColumnValues(
  column: "genre_title" | "artist_display" | "museum"
): Promise<string[]> {
  const values: string[] = [];
  let from = 0;

  while (values.length < MAX_LISTED_SLUGS) {
    const { data, error } = await supabase
      .from("artworks")
      .select(`id, ${column}`)
      .not(column, "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const rows = (data as Record<string, string | null>[] | null) ?? [];
    for (const row of rows) {
      const value = row[column];
      if (typeof value === "string" && value.trim()) {
        values.push(value.trim());
        if (values.length >= MAX_LISTED_SLUGS) {
          break;
        }
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return Array.from(new Set(values));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const baseUrl = getBaseUrl();
    const now = new Date();

    const entries: MetadataRoute.Sitemap = [];

    for (const path of STATIC_PATHS) {
      entries.push({
        url: toAbsolute(baseUrl, path),
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.99,
      });
    }

    const [artworkSlugs, styleSlugs, genreTitles, artistDisplays, museums] = await Promise.all([
      fetchAllArtworkSlugs(),
      fetchAllStyleSlugs(),
      fetchAllArtworkColumnValues("genre_title"),
      fetchAllArtworkColumnValues("artist_display"),
      fetchAllArtworkColumnValues("museum"),
    ]);

    for (const slug of artworkSlugs) {
      entries.push({
        url: toAbsolute(baseUrl, `/artworks/${slug}`),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const artist of artistDisplays) {
      entries.push({
        url: toAbsolute(baseUrl, `/artists/${slugify(artist)}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.9,
      });
    }

    for (const slug of styleSlugs) {
      entries.push({
        url: toAbsolute(baseUrl, `/styles/${slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    for (const genre of genreTitles) {
      entries.push({
        url: toAbsolute(baseUrl, `/genres/${slugify(genre)}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    for (const museum of museums) {
      entries.push({
        url: toAbsolute(baseUrl, `/museums/${slugify(museum)}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    return entries;
  } catch (err) {
    console.error("[sitemap] error — returning minimal URLs:", err);
    const baseUrl = getBaseUrl();
    return STATIC_PATHS.map((path) => ({
      url: toAbsolute(baseUrl, path),
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.5,
    }));
  }
}
