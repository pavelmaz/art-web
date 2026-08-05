import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { translations, type Locale } from "@/lib/translations";

/** Minimal artwork shape the account panel renders (raw DB columns). */
export type AccountArtwork = {
  id: string;
  slug: string | null;
  title: string | null;
  artist_display: string | null;
  image_id: string | null;
  url: string | null;
};

export const ACCOUNT_ARTWORK_COLUMNS = "id, slug, title, artist_display, image_id, url";

export function resolveLocale(raw: string | undefined): Locale {
  return raw && raw in translations ? (raw as Locale) : "en";
}

/** Locale-correct artwork URL (es/pt use /obras). */
export function artworkHref(slug: string | null, locale: Locale): string {
  if (!slug) return "#";
  const prefix = locale === "en" ? "" : `/${locale}`;
  const segment = locale === "es" || locale === "pt" ? "obras" : "artworks";
  return `${prefix}/${segment}/${slug}`;
}

/** Preserve the chosen locale across the panel's internal links. */
export function accountHref(path: string, locale: Locale): string {
  return locale === "en" ? path : `${path}?loc=${locale}`;
}

/**
 * Every /account page is behind auth. Returns the session user, or bounces to
 * /login with this page as the post-login destination.
 */
export async function requireUser(nextPath: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return { supabase, user };
}
