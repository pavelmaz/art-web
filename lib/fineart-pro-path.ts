import type { Locale } from "@/lib/translations";

/** Marketing + join URLs per site locale (checkout callbacks stay under `/fineart-pro/`). */
export function fineArtProPath(locale: Locale): string {
  return locale === "en" ? "/fineart-pro" : `/${locale}/fineart-pro`;
}

export function fineArtProJoinPath(
  locale: Locale,
  plan?: "monthly" | "yearly" | null,
  /** Slug of the artwork the visitor came from, so checkout can keep showing it. */
  art?: string | null
): string {
  const base = locale === "en" ? "/fineart-pro/join" : `/${locale}/fineart-pro/join`;
  const params = new URLSearchParams();
  if (plan === "monthly" || plan === "yearly") params.set("plan", plan);
  if (art) params.set("art", art);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function fineArtProSuccessPath(locale: Locale): string {
  return locale === "en" ? "/fineart-pro/success" : `/${locale}/fineart-pro/success`;
}
