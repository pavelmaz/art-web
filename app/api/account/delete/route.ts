import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Permanently deletes the caller's account.
 *
 * Order matters: cancel billing FIRST, because deleting the auth user cascades
 * the profile row away and with it the stripe_customer_id we need to stop
 * charging them. Favourites, collections and downloads all cascade from
 * auth.users, so no manual cleanup is required.
 *
 * The user id always comes from the session — never from the request body — so
 * this route cannot be used to delete somebody else's account.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. Cancel any live subscription so deletion never leaves a charging customer.
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const customerId = profile?.stripe_customer_id as string | undefined;
    if (customerId) {
      const stripe = getStripe();
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active" });
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
  } catch (err) {
    // Billing must be provably stopped before the account disappears.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not cancel subscription" },
      { status: 502 }
    );
  }

  // 2. Delete the auth user — favourites/collections/downloads/profile cascade.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
