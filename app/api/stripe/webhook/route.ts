import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import type { StripeRoutesDatabase } from "@/lib/supabase/stripe-routes-db";

let supabaseAdminSingleton: SupabaseClient<StripeRoutesDatabase> | undefined;

function getSupabaseAdmin(): SupabaseClient<StripeRoutesDatabase> {
  if (supabaseAdminSingleton) return supabaseAdminSingleton;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  supabaseAdminSingleton = createClient<StripeRoutesDatabase>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseAdminSingleton;
}

async function getUserIdByCustomerId(customerId: string): Promise<string | undefined> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id;
}

/**
 * Get-or-create a Supabase auth user for a guest checkout's email, without
 * emailing them anything: `generateLink` creates the account (or, if one
 * already exists under that email, just resolves it) and returns the raw
 * link/OTP instead of sending it, unlike `inviteUserByEmail`. The visitor
 * later signs in the normal way — magic link, same email — and lands on the
 * account this created, already marked active.
 */
async function getOrCreateUserIdByEmail(email: string): Promise<string | undefined> {
  const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) {
    console.error("generateLink for guest checkout failed:", error.message);
    return undefined;
  }
  return data.user?.id;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // Async variant: the sync `constructEvent` needs Node's crypto and throws
    // under Stripe's worker build (SubtleCrypto is async-only). Same result on Node.
    event = await getStripe().webhooks.constructEventAsync(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metaUserId = session.metadata?.supabase_user_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

      let userId =
        (typeof metaUserId === "string" && metaUserId.length > 0 ? metaUserId : null) ??
        (customerId ? await getUserIdByCustomerId(customerId) : undefined);

      // Guest checkout, still unclaimed: don't strand a paid subscription on
      // nobody. The success page normally links this the moment the visitor
      // returns and signs in, but that depends on the browser round-tripping
      // back — this is the guarantee for the visitor who pays and never does.
      if (!userId) {
        const guestEmail = session.customer_details?.email;
        if (guestEmail) {
          userId = await getOrCreateUserIdByEmail(guestEmail);
        }
      }

      if (userId) {
        await getSupabaseAdmin()
          .from("profiles")
          .update({
            subscription_status: "active",
            ...(customerId ? { stripe_customer_id: customerId } : {}),
          })
          .eq("id", userId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (!customerId) break;
      const userId = await getUserIdByCustomerId(customerId);
      if (userId) {
        const interval = sub.items.data[0]?.plan?.interval;
        await getSupabaseAdmin()
          .from("profiles")
          .update({
            subscription_status: sub.status,
            plan_interval: interval ?? null,
          })
          .eq("id", userId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (!customerId) break;
      const userId = await getUserIdByCustomerId(customerId);
      if (userId) {
        await getSupabaseAdmin()
          .from("profiles")
          .update({ subscription_status: "canceled", plan_interval: null })
          .eq("id", userId);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
