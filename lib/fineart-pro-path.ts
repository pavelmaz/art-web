import type { Locale } from "@/lib/translations";

/** 21 Sep 2026 — the one real "just today" 50%-off-once coupon (blog banner
 *  test). Single source of truth: the checkout API allow-lists against this
 *  same constant rather than trusting a client-supplied coupon id. */
export const PROMO_COUPON_ID = "pnHLwbxS" as const;

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
