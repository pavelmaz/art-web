import { NextRequest, NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { translations } from "@/lib/translations";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let loc = "en";
    try {
      const body = (await req.json()) as { loc?: string };
      if (typeof body.loc === "string" && body.loc in translations) {
        loc = body.loc;
      }
    } catch {
      // No/invalid JSON body — fall back to the default return path.
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const customerId = profile?.stripe_customer_id;

    if (!customerId) {
      return NextResponse.json({ error: "No billing account found" }, { status: 400 });
    }

    const returnPath = loc === "en" ? "/login" : `/login?loc=${loc}`;

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}${returnPath}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Portal session error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
