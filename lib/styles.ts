import { supabase } from "@/lib/supabase";
import type { Style } from "@/types/style";

export async function getStyles(): Promise<Style[]> {
  const { data, error } = await supabase
    .from("styles")
    .select("name, slug, description")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Style[];
}

export async function getStyleBySlug(slug: string): Promise<Style | null> {
  const { data, error } = await supabase
    .from("styles")
    .select("name, slug, description")
    .eq("slug", slug)
    .single();

  if (error) {
    throw error;
  }

  return (data ?? null) as Style | null;
}
