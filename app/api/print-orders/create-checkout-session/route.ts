import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { PRINT_PRODUCTS, PRODUCT_CATEGORIES } from "@/lib/prodigi";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

type CookieRow = { name: string; value: string; options: CookieOptions };

/**
 * One-time print-order checkout — a separate mode from the Fine Art Pro
 * subscription route (`/api/stripe/create-checkout-session`), which this
 * mirrors the shape of but never touches: `mode: "payment"`, a dynamic
 * `price_data` line item (retail price depends on the chosen product), and
 * shipping address collection instead of a persisted Stripe Customer. The
 * webhook (`/api/stripe/webhook`) tells the two apart via `metadata.type`.
 */
export async function POST(req: NextRequest) {
  try {
    const { artworkSlug, productKey } = (await req.json()) as {
      artworkSlug?: string;
      productKey?: string;
    };

    const product = productKey ? PRINT_PRODUCTS[productKey] : undefined;
    if (!artworkSlug || !product) {
      return NextResponse.json({ error: "Invalid artwork or product" }, { status: 400 });
    }
    const categoryLabel = PRODUCT_CATEGORIES.find((c) => c.key === product.category)?.label ?? "Print";

    // Van-Gogh-only for this test, enforced server-side too — the UI only
    // renders this option on Van Gogh pages, but nothing stops a direct POST.
    const { data: artwork } = await supabase
      .from("artworks")
      .select("id, title, artist_display")
      .eq("id", artworkSlug)
      .maybeSingle();

    if (!artwork || artwork.artist_display !== "Vincent van Gogh") {
      return NextResponse.json({ error: "Not available for this artwork" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
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
    } = await supabaseAuth.auth.getUser();

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: product.retailCents,
            product_data: { name: `${artwork.title} — ${categoryLabel} (${product.label})` },
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: { allowed_countries: ["US"] },
      metadata: {
        type: "print_order",
        artwork_slug: artworkSlug,
        product_key: productKey!,
        sku: product.sku,
        ...(user ? { supabase_user_id: user.id } : {}),
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/artworks/${artworkSlug}?print_order=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/artworks/${artworkSlug}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Print-order checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
