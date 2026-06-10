import { supabase } from "@/lib/supabase";
import type { GuideData } from "@/lib/guide-types";

export type GuidedVisitRow = {
  id: string;
  token: string;
  museum_slug: string;
  museum_name: string;
  user_id: string | null;
  visit_type: string;
  time_hours: number;
  focus: string | null;
  locale: string;
  guide_data: GuideData;
  created_at: string;
  expires_at: string | null;
};

/** Public read via anon client so token URLs work for all visitors (RLS: anon SELECT). */
export async function getGuidedVisitByToken(
  museumSlug: string,
  token: string,
): Promise<GuidedVisitRow | null> {
  const { data, error } = await supabase
    .from("guided_visits")
    .select("*")
    .eq("token", token)
    .eq("museum_slug", museumSlug)
    .maybeSingle();

  if (error) {
    console.error("[guided-visit] fetch error:", error.message);
    return null;
  }

  return (data as GuidedVisitRow | null) ?? null;
}
