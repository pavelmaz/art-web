import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";
import type { Artwork } from "@/types/artwork";

export async function getArtworks(): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select(
      "id, slug, title, artist_display, date_display, image_id, url, style_title, description, source_url"
    )
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    artistName: item.artist_display,
    dateDisplay: item.date_display,
    imageUrl: item.url || item.image_id,
    styleSlug: slugify(item.style_title ?? "unknown-style"),
    styleName: item.style_title ?? "Unknown style",
    description: item.description,
    sourceUrl: item.source_url,
  })) as Artwork[];
}

export async function getArtworkBySlug(slug: string): Promise<Artwork | null> {
  const { data, error } = await supabase
    .from("artworks")
    .select(
      "id, slug, title, artist_display, date_display, image_id, url, style_title, description, source_url"
    )
    .eq("slug", slug)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    artistName: data.artist_display,
    dateDisplay: data.date_display,
    imageUrl: data.url || data.image_id,
    styleSlug: slugify(data.style_title ?? "unknown-style"),
    styleName: data.style_title ?? "Unknown style",
    description: data.description,
    sourceUrl: data.source_url,
  };
}

export async function getArtworksByStyle(styleSlug: string): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select(
      "id, slug, title, artist_display, date_display, image_id, url, style_title, description, source_url"
    )
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  const artworks = (data ?? []).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    artistName: item.artist_display,
    dateDisplay: item.date_display,
    imageUrl: item.url || item.image_id,
    styleSlug: slugify(item.style_title ?? "unknown-style"),
    styleName: item.style_title ?? "Unknown style",
    description: item.description,
    sourceUrl: item.source_url,
  })) as Artwork[];

  return artworks.filter((artwork) => artwork.styleSlug === styleSlug);
}
