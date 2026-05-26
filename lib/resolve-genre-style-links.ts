import { supabase } from "@/lib/supabase";

type Locale = "es" | "pt" | "ja";

export async function resolveGenreHubLink(
  genreTitleEnglish: string,
  locale: Locale
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

  const prefix = locale === "es" ? "/es" : locale === "pt" ? "/pt" : "/ja";
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

  const segment = locale === "ja" ? "genres" : "generos";
  return { href: `${prefix}/${segment}/${slug}`, label };
}

export async function resolveStyleHubLink(
  styleTitleEnglish: string,
  locale: Locale
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

  const prefix = locale === "es" ? "/es" : locale === "pt" ? "/pt" : "/ja";
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

  const segment = locale === "ja" ? "styles" : "estilos";
  return { href: `${prefix}/${segment}/${slug}`, label };
}
