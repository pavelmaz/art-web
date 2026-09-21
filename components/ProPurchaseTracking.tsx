"use client";

import { track } from "@/lib/analytics";
import { useEffect } from "react";

export type VerifiedPurchase = {
  value: number;
  currency: string;
  transactionId: string;
  plan: string | null;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Fires the purchase conversion exactly once per Stripe session. Sends the GA4
 * `purchase` event (your own funnel) and pushes a `purchase` event onto
 * window.dataLayer so any tag manager / ad pixel (Google Ads, Meta) can pick it up.
 * Rendered only after the payment has been verified server-side.
 */
export function ProPurchaseTracking({ value, currency, transactionId, plan }: VerifiedPurchase) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // De-dupe so a page refresh doesn't double-count the conversion.
    const key = `faf-purchase-tracked-${transactionId}`;
    if (sessionStorage.getItem(key)) {
      return;
    }
    sessionStorage.setItem(key, "1");

    // GA4's recommended `purchase` shape: transaction_id + value + currency +
    // items, so Monetization reports and the auto key event both light up.
    track("purchase", {
      transaction_id: transactionId,
      value,
      currency,
      plan: plan ?? "unknown",
      items: [
        {
          item_id: `fineart_pro_${plan ?? "unknown"}`,
          item_name: `Fine Art Pro (${plan ?? "unknown"})`,
          price: value,
          quantity: 1,
        },
      ],
    });

    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      event: "purchase",
      value,
      currency,
      transaction_id: transactionId,
      plan: plan ?? "unknown",
    });

    // Microsoft Ads (UET) conversion — the goal in the Ads UI matches event
    // action "purchase" and reads revenue from revenue_value/currency.
    window.uetq = window.uetq ?? [];
    window.uetq.push("event", "purchase", {
      event_category: "subscription",
      event_label: plan ?? "unknown",
      revenue_value: value,
      currency,
    });
  }, [value, currency, transactionId, plan]);

  return null;
}
