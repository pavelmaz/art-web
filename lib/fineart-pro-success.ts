import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { VerifiedPurchase } from "@/components/ProPurchaseTracking";
import { getStripe } from "@/lib/stripe";

export type SuccessResolution = {
  purchase: VerifiedPurchase | null;
  /** True when the payment is confirmed but not yet tied to a signed-in
   *  account — the success page should prompt to sign in / register instead
   *  of showing the normal "welcome" content. */
  needsRegistration: boolean;
  /** Email Stripe collected at checkout, to pre-fill the sign-in form. */
  prefillEmail: string | null;
};

let supabaseAdminSingleton: SupabaseClient | undefined;
function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminSingleton) {
    supabaseAdminSingleton = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return supabaseAdminSingleton;
}

const EMPTY: SuccessResolution = { purchase: null, needsRegistration: false, prefillEmail: null };

/**
 * Confirms a checkout session with Stripe and, for the guest-checkout flow
 * (pay first, no account yet), links it to the visitor's account once they're
 * signed in.
 *
 * Linking is gated on the checkout session's own email (`customer_details.email`,
 * verified server-side by Stripe) matching the signed-in user's email — never on
 * `session_id` + "whoever happens to be logged in" alone. Without that check,
 * a real session_id belonging to someone else's completed purchase (shared,
 * leaked, or guessed) could be used to attach their paid subscription to an
 * unrelated logged-in account.
 *
 * An account-first checkout (metadata already carries `supabase_user_id`) is
 * left untouched here — the webhook already owns linking that case, exactly
 * as before this flow existed.
 */
export async function resolveFineArtProSuccess(
  sessionId: string | undefined,
  user: { id: string; email?: string | null } | null
): Promise<SuccessResolution> {
  if (!sessionId) return EMPTY;

  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return EMPTY;
  }
  if (session.status !== "complete") return EMPTY;

  const purchase: VerifiedPurchase = {
    value: (session.amount_total ?? 0) / 100,
    currency: (session.currency ?? "usd").toUpperCase(),
    transactionId: session.id,
    plan: typeof session.metadata?.plan === "string" ? session.metadata.plan : null,
  };

  const metaUserId =
    typeof session.metadata?.supabase_user_id === "string" ? session.metadata.supabase_user_id : null;
  if (metaUserId) {
    // Account-first checkout: already linked by the webhook, nothing to claim.
    return { purchase, needsRegistration: false, prefillEmail: null };
  }

  const sessionEmail = session.customer_details?.email ?? null;
  const emailMatches =
    !!user?.email && !!sessionEmail && user.email.toLowerCase() === sessionEmail.toLowerCase();
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (user && emailMatches && customerId) {
    await getSupabaseAdmin()
      .from("profiles")
      .update({ subscription_status: "active", stripe_customer_id: customerId })
      .eq("id", user.id);
    return { purchase, needsRegistration: false, prefillEmail: null };
  }

  // Guest checkout, not yet claimed by the current session (nobody signed in,
  // or signed in under a different email than the one used to pay).
  return { purchase, needsRegistration: true, prefillEmail: sessionEmail };
}
