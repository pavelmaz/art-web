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

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metaUserId = session.metadata?.supabase_user_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

      const userId =
        (typeof metaUserId === "string" && metaUserId.length > 0 ? metaUserId : null) ??
        (customerId ? await getUserIdByCustomerId(customerId) : undefined);

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
