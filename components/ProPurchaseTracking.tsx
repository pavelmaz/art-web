"use client";

import { track } from "@vercel/analytics";
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
 * Fires the purchase conversion exactly once per Stripe session. Sends a Vercel
 * Analytics `purchase` event (your own funnel) and pushes a `purchase` event onto
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

    track("purchase", {
      value,
      currency,
      plan: plan ?? "unknown",
      transaction_id: transactionId,
    });

    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      event: "purchase",
      value,
      currency,
      transaction_id: transactionId,
      plan: plan ?? "unknown",
    });
  }, [value, currency, transactionId, plan]);

  return null;
}
