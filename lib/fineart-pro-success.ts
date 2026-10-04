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

/** How long after paying a guest can claim the subscription under another email. */
const CLAIM_WINDOW_SECONDS = 24 * 60 * 60;

/**
 * Confirms a checkout session with Stripe and, for the guest-checkout flow
 * (pay first, no account yet), links it to the visitor's account once they're
 * signed in.
 *
 * Whoever signs in here within a day of paying gets the subscription, even
 * under a different email than the one Stripe recorded: buyers routinely pay
 * with a shop inbox or an Apple "Hide My Email" address and then sign in with
 * their personal Google account (30 Sep and 4 Oct 2026 — both saw "Free" after
 * paying under the old exact-email rule). After that day only the paying email
 * can claim it, so an old or forwarded thank-you link is useless.
 *
 * A subscription already held by an account someone has actually signed in to
 * is never moved, so a leaked session_id can't take over a real member's plan;
 * only the placeholder the webhook creates for the checkout email is released.
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
  const recent = Date.now() / 1000 - session.created <= CLAIM_WINDOW_SECONDS;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (user && customerId && (emailMatches || recent) && (await releasePlaceholder(customerId, user.id))) {
    await getSupabaseAdmin()
      .from("profiles")
      .update({ subscription_status: "active", stripe_customer_id: customerId })
      .eq("id", user.id);
    return { purchase, needsRegistration: false, prefillEmail: null };
  }

  // Guest checkout, not claimed by the current session (nobody signed in yet,
  // the claim window has passed, or a real account already holds it).
  return { purchase, needsRegistration: true, prefillEmail: sessionEmail };
}

/**
 * Frees the subscription for `userId` to take: false if another account that
 * someone has signed in to holds it, otherwise clears any never-used holder
 * (the webhook's checkout-email placeholder) and returns true. Clearing first
 * matters — the webhook finds the subscriber with maybeSingle(), which breaks
 * on renewal or cancellation if two profiles share one Stripe customer.
 */
async function releasePlaceholder(customerId: string, userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data: holders, error } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .neq("id", userId);
  if (error) return false;
  if (!holders?.length) return true;

  for (const holder of holders) {
    const { data, error: lookupError } = await admin.auth.admin.getUserById(holder.id);
    if (lookupError || data.user?.last_sign_in_at) return false;
  }
  const { error: clearError } = await admin
    .from("profiles")
    .update({ subscription_status: "none", stripe_customer_id: null, plan_interval: null })
    .in(
      "id",
      holders.map((h) => h.id)
    );
  return !clearError;
}
