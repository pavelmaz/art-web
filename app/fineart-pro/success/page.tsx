import type { Metadata } from "next";

import { FineArtProSuccessPage } from "@/components/FineArtProSuccessPage";
import type { VerifiedPurchase } from "@/components/ProPurchaseTracking";
import { getStripe } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Thank you — Fine Art Pro",
  description: "Your Fine Art Pro subscription is active.",
  robots: { index: false, follow: false },
};

type SuccessSearchParams = Promise<{ session_id?: string }>;

/**
 * Confirm with Stripe that this checkout session was actually paid before treating
 * the visit as a conversion — otherwise anyone loading the URL would inflate the
 * numbers a paid campaign optimizes against.
 */
async function verifyPurchase(sessionId: string | undefined): Promise<VerifiedPurchase | null> {
  if (!sessionId) {
    return null;
  }
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.status !== "complete") {
      return null;
    }
    return {
      value: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? "usd").toUpperCase(),
      transactionId: session.id,
      plan: typeof session.metadata?.plan === "string" ? session.metadata.plan : null,
    };
  } catch {
    return null;
  }
}

export default async function SuccessPage({ searchParams }: { searchParams: SuccessSearchParams }) {
  const { session_id } = await searchParams;
  const purchase = await verifyPurchase(session_id);

  return <FineArtProSuccessPage locale="en" purchase={purchase} />;
}
