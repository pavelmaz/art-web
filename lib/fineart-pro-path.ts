import type { Locale } from "@/lib/translations";

/** Marketing + join URLs per site locale (checkout callbacks stay under `/fineart-pro/`). */
export function fineArtProPath(locale: Locale): string {
  return locale === "en" ? "/fineart-pro" : `/${locale}/fineart-pro`;
}

export function fineArtProJoinPath(
  locale: Locale,
  plan?: "monthly" | "yearly" | null,
  coupon?: string | null
): string {
  const base = locale === "en" ? "/fineart-pro/join" : `/${locale}/fineart-pro/join`;
  if (plan !== "monthly" && plan !== "yearly") {
    return base;
  }
  const params = new URLSearchParams({ plan });
  if (coupon) params.set("coupon", coupon);
  return `${base}?${params.toString()}`;
}

export function fineArtProSuccessPath(locale: Locale): string {
  return locale === "en" ? "/fineart-pro/success" : `/${locale}/fineart-pro/success`;
}
