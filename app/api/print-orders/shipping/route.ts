import { NextRequest, NextResponse } from "next/server";

import { usWholesaleUsd } from "@/lib/print-catalog";
import { isPrintCountry, type PrintShipping } from "@/lib/print-countries";
import { printShipping } from "@/lib/print-shipping";

/**
 * Delivery of the print sizes an artwork is offered in to one country, for the
 * print page's price line and delivery estimate:
 *   GET /api/print-orders/shipping?sizes=16X20,20X24&country=CA
 * Checkout recomputes the same numbers server-side, so what this shows is what
 * is charged.
 */
export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country") ?? "";
  const sizes = (req.nextUrl.searchParams.get("sizes") ?? "")
    .split(",")
    .filter((code) => usWholesaleUsd(code) !== null)
    .slice(0, 12);

  if (!isPrintCountry(country) || sizes.length === 0) {
    return NextResponse.json({ error: "Unknown country or size" }, { status: 400 });
  }

  try {
    const results = await Promise.all(sizes.map((code) => printShipping(code, country)));
    const shipping: Record<string, PrintShipping | null> = Object.fromEntries(sizes.map((code, i) => [code, results[i]]));
    return NextResponse.json({ shipping }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error: unknown) {
    console.error("Print shipping quote failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Couldn't calculate delivery right now" }, { status: 503 });
  }
}
