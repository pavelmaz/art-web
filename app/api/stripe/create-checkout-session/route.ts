import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/** Pinned by `stripe` npm major; older strings fail `tsc`. */
const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

/** 21 Sep 2026 — "just today" 50%-off-once test promo, linked from the blog banner. */
const PROMO_COUPON_ID = "pnHLwbxS" as const;

type CookieRow = { name: string; value: string; options: CookieOptions };

export async function POST(req: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION,
    });

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: CookieRow[]) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, coupon } = await req.json();

    const priceId =
      plan === "yearly"
        ? process.env.STRIPE_PRICE_PRO_YEARLY!
        : process.env.STRIPE_PRICE_PRO_MONTHLY!;

    // Allow-listed, not client-trusted: a raw coupon id from the request body must
    // never be passed straight to Stripe, or anyone could apply any coupon id they
    // find (including ones never meant for public self-service) to a real charge.
    const appliedCoupon = coupon === PROMO_COUPON_ID ? PROMO_COUPON_ID : undefined;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(appliedCoupon ? { discounts: [{ coupon: appliedCoupon }] } : {}),
      metadata: { supabase_user_id: user.id, plan: plan === "yearly" ? "yearly" : "monthly" },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/fineart-pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/fineart-pro`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
