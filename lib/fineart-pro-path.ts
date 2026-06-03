import type { Locale } from "@/lib/translations";

/** Marketing + join URLs per site locale (checkout callbacks stay under `/fineart-pro/`). */
export function fineArtProPath(locale: Locale): string {
  return locale === "en" ? "/fineart-pro" : `/${locale}/fineart-pro`;
}

export function fineArtProJoinPath(
  locale: Locale,
  plan?: "monthly" | "yearly" | null
): string {
  const base = locale === "en" ? "/fineart-pro/join" : `/${locale}/fineart-pro/join`;
  if (plan === "monthly" || plan === "yearly") {
    return `${base}?plan=${plan}`;
  }
  return base;
}

export function fineArtProSuccessPath(locale: Locale): string {
  return locale === "en" ? "/fineart-pro/success" : `/${locale}/fineart-pro/success`;
}
