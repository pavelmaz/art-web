import { supabase } from "@/lib/supabase";
import type { Artwork } from "@/types/artwork";

export async function getArtworks(): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select(
      "id, slug, title, artist_name, year, image_url, style_slug, style_name, description, source_url"
    )
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    artistName: item.artist_name,
    year: item.year,
    imageUrl: item.image_url,
    styleSlug: item.style_slug,
    styleName: item.style_name,
    description: item.description,
    sourceUrl: item.source_url,
  })) as Artwork[];
}

export async function getArtworkBySlug(slug: string): Promise<Artwork | null> {
  const { data, error } = await supabase
    .from("artworks")
    .select(
      "id, slug, title, artist_name, year, image_url, style_slug, style_name, description, source_url"
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
    artistName: data.artist_name,
    year: data.year,
    imageUrl: data.image_url,
    styleSlug: data.style_slug,
    styleName: data.style_name,
    description: data.description,
    sourceUrl: data.source_url,
  };
}

export async function getArtworksByStyle(styleSlug: string): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select(
      "id, slug, title, artist_name, year, image_url, style_slug, style_name, description, source_url"
    )
    .eq("style_slug", styleSlug)
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    artistName: item.artist_name,
    year: item.year,
    imageUrl: item.image_url,
    styleSlug: item.style_slug,
    styleName: item.style_name,
    description: item.description,
    sourceUrl: item.source_url,
  })) as Artwork[];
}
