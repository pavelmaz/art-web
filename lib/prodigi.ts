/**
 * Prodigi print-on-demand: no catalog to pre-register, no product to create —
 * every order is one POST carrying the artwork's own image URL, a Prodigi SKU,
 * and a shipping address. Confirmed against their live API docs 23 Sep 2026:
 * Orders / Products / Quotes / Callbacks are the only endpoints; there is no
 * bulk-upload capability, and none is needed.
 */

export type CanvasSize = "12x16" | "16x20" | "24x32";

/** SKU + retail price (USD cents) per size, set 23 Sep 2026 from a live Quotes
 *  API check (wholesale item+shipping: $51.80 / $60.90 / $84.35 to the US) —
 *  roughly 2.3-2.4x wholesale. Adjust here; nothing else needs to change. */
export const CANVAS_SIZES: Record<CanvasSize, { sku: string; label: string; retailCents: number }> = {
  "12x16": { sku: "GLOBAL-CAN-12X16", label: "12 × 16 in", retailCents: 11900 },
  "16x20": { sku: "GLOBAL-CAN-16X20", label: "16 × 20 in", retailCents: 14900 },
  "24x32": { sku: "GLOBAL-CAN-24X32", label: "24 × 32 in", retailCents: 19900 },
};

export type ProdigiRecipient = {
  name: string;
  email: string;
  address: {
    line1: string;
    line2?: string | null;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string | null;
  };
};

function getProdigiConfig(): { apiKey: string; apiBase: string } {
  const apiKey = process.env.PRODIGI_API_KEY;
  const apiBase = process.env.PRODIGI_API_BASE;
  if (!apiKey || !apiBase) {
    throw new Error("PRODIGI_API_KEY and PRODIGI_API_BASE are required");
  }
  return { apiKey, apiBase };
}

/**
 * Places a real order — this prints and ships an actual canvas and charges
 * the Prodigi account on file the moment it succeeds. Call only after Stripe
 * has already captured payment for the same order.
 *
 * `idempotencyKey` should be the Stripe checkout session id: Stripe redelivers
 * webhooks at-least-once, and without this a retried delivery would place a
 * second real canvas order for the same payment. Prodigi returns the original
 * order (`outcome: "AlreadyExists"`) instead of creating a duplicate.
 */
export async function createProdigiOrder({
  sku,
  imageUrl,
  recipient,
  idempotencyKey,
}: {
  sku: string;
  imageUrl: string;
  recipient: ProdigiRecipient;
  idempotencyKey: string;
}): Promise<{ vendorOrderId: string }> {
  const { apiKey, apiBase } = getProdigiConfig();

  const res = await fetch(`${apiBase}/orders`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      idempotencyKey,
      shippingMethod: "Standard",
      recipient,
      items: [
        {
          sku,
          copies: 1,
          sizing: "fillPrintArea",
          attributes: { wrap: "ImageWrap" },
          assets: [{ printArea: "default", url: imageUrl }],
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok || data.outcome === "NotAuthenticated" || data.outcome === "ValidationFailed") {
    throw new Error(`Prodigi order failed: ${JSON.stringify(data)}`);
  }

  const vendorOrderId = data.order?.id;
  if (!vendorOrderId) {
    throw new Error(`Prodigi order response missing order id: ${JSON.stringify(data)}`);
  }
  return { vendorOrderId };
}
