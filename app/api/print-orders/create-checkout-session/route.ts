import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import type Stripe from "stripe";

import { canSellPrint, FRAME_OPTIONS, isFrameKey, priceUsd, prodigiItemFor, sizesForArtwork } from "@/lib/print-catalog";
import { countryPhrase, CUSTOMS_ID, isPrintCountry, PRODUCTION_DAYS } from "@/lib/print-countries";
import { printShipping } from "@/lib/print-shipping";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

type CookieRow = { name: string; value: string; options: CookieOptions };
type AllowedCountry = NonNullable<
  NonNullable<Parameters<Stripe["checkout"]["sessions"]["create"]>[0]>["shipping_address_collection"]
>["allowed_countries"][number];

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
    const { artworkSlug, size, frame, country } = (await req.json()) as {
      artworkSlug?: string;
      size?: string;
      frame?: string;
      country?: string;
    };

    if (!artworkSlug || !size || !isFrameKey(frame)) {
      return NextResponse.json({ error: "Please choose a size and frame" }, { status: 400 });
    }
    if (!isPrintCountry(country)) {
      return NextResponse.json({ error: "Please choose where to deliver it" }, { status: 400 });
    }

    // Print artists only (canSellPrint), enforced server-side too — the UI only
    // renders this option on those artists' pages, but nothing stops a direct POST.
    const { data: artwork } = await supabase
      .from("artworks")
      .select("id, title, artist_display, img_width, img_height, object_type")
      .eq("id", artworkSlug)
      .maybeSingle();

    if (!artwork || !canSellPrint(artwork)) {
      return NextResponse.json({ error: "Not available for this artwork" }, { status: 400 });
    }

    // The size must be one this artwork is actually offered in (shape + resolution),
    // and the price always comes from the server-side table, never the client.
    const chosen = sizesForArtwork(artwork.img_width, artwork.img_height).find((s) => s.code === size);
    const retailUsd = chosen ? priceUsd(chosen.code) : null;
    if (!chosen || !retailUsd) {
      return NextResponse.json({ error: "That size isn't available for this artwork" }, { status: 400 });
    }
    const { sku, attributes, sizing } = prodigiItemFor(chosen.code, frame);
    const frameLabel = FRAME_OPTIONS.find((f) => f.key === frame)!.label;

    // Delivery is priced server-side from Prodigi's quote, same as the page shows.
    const shipping = await printShipping(chosen.code, country);
    if (!shipping) {
      return NextResponse.json({ error: `This size can't be delivered to ${countryPhrase(country)}` }, { status: 400 });
    }
    const [transitMin, transitMax] = shipping.transitDays;
    const customsId = CUSTOMS_ID[country];

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
            unit_amount: retailUsd * 100,
            product_data: { name: `${artwork.title} — Framed print, ${chosen.label}, ${frameLabel}` },
          },
          quantity: 1,
        },
      ],
      // One country per checkout: the one the shipping was priced for.
      shipping_address_collection: {
        allowed_countries: [country as AllowedCountry],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shipping.surchargeUsd * 100, currency: "usd" },
            display_name: `${shipping.surchargeUsd === 0 ? "Free delivery" : "Delivery"} to ${countryPhrase(country)}`,
            delivery_estimate: {
              minimum: { unit: "business_day", value: PRODUCTION_DAYS + transitMin },
              maximum: { unit: "business_day", value: PRODUCTION_DAYS + transitMax },
            },
          },
        },
      ],
      // Customs in some countries need the recipient's tax ID on the parcel.
      ...(customsId
        ? {
            custom_fields: [
              {
                key: "customs_id",
                label: { type: "custom" as const, custom: customsId.label },
                type: "text" as const,
                optional: customsId.optional,
              },
            ],
          }
        : {}),
      metadata: {
        type: "print_order",
        artwork_slug: artworkSlug,
        sku,
        attributes: JSON.stringify(attributes),
        sizing,
        size: chosen.code,
        frame,
        country,
        shipping_usd: String(shipping.surchargeUsd),
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
