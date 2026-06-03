import { getLocaleConfig, getSegments, type SiteLocale } from "@/lib/locale-routes";
import { supabase } from "@/lib/supabase";

type HubLocale = Exclude<SiteLocale, "en">;

export async function resolveGenreHubLink(
  genreTitleEnglish: string,
  locale: HubLocale
): Promise<{ href: string; label: string } | null> {
  const name = genreTitleEnglish.trim();
  if (!name) return null;

  const { data, error } = await supabase
    .from("genres")
    .select("name, name_es, name_pt, slug, slug_es, slug_pt")
    .eq("name", name)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    name: string;
    name_es: string | null;
    name_pt: string | null;
    slug: string;
    slug_es: string | null;
    slug_pt: string | null;
  };

  const config = getLocaleConfig(locale);
  const prefix = config?.prefix ?? `/${locale}`;
  const slug =
    locale === "es"
      ? row.slug_es?.trim() || row.slug
      : locale === "pt"
        ? row.slug_pt?.trim() || row.slug
        : row.slug;
  const label =
    locale === "es"
      ? row.name_es?.trim() || row.name
      : locale === "pt"
        ? row.name_pt?.trim() || row.name
        : row.name;

  const segment = getSegments(locale).genres;
  return { href: `${prefix}/${segment}/${slug}`, label };
}

export async function resolveStyleHubLink(
  styleTitleEnglish: string,
  locale: HubLocale
): Promise<{ href: string; label: string } | null> {
  const name = styleTitleEnglish.trim();
  if (!name) return null;

  const { data, error } = await supabase
    .from("styles")
    .select("name, name_es, name_pt, slug, slug_es, slug_pt")
    .eq("name", name)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    name: string;
    name_es: string | null;
    name_pt: string | null;
    slug: string;
    slug_es: string | null;
    slug_pt: string | null;
  };

  const config = getLocaleConfig(locale);
  const prefix = config?.prefix ?? `/${locale}`;
  const slug =
    locale === "es"
      ? row.slug_es?.trim() || row.slug
      : locale === "pt"
        ? row.slug_pt?.trim() || row.slug
        : row.slug;
  const label =
    locale === "es"
      ? row.name_es?.trim() || row.name
      : locale === "pt"
        ? row.name_pt?.trim() || row.name
        : row.name;

  const segment = getSegments(locale).styles;
  return { href: `${prefix}/${segment}/${slug}`, label };
}
