/**
 * Prodigi print-on-demand: no catalog to pre-register, no product to create —
 * every order is one POST carrying the artwork's own image URL, a Prodigi SKU,
 * and a shipping address. Confirmed against their live API docs 23 Sep 2026:
 * Orders / Products / Quotes / Callbacks are the only endpoints; there is no
 * bulk-upload capability, and none is needed.
 */

export type ProductCategory = "wall-art" | "prints-posters" | "cards-stationery";

export type PrintProduct = {
  sku: string;
  category: ProductCategory;
  label: string;
  /** Units per order — always 1 except the card set, which is sold as a box. */
  copies: number;
  retailCents: number;
  /** Prodigi's required per-SKU attributes (e.g. canvas needs a wrap style).
   *  Confirmed empty for posters/cards via a live Quotes check 23 Sep 2026 —
   *  Prodigi validates this at order time, so an empty object is a real,
   *  checked value here, not a placeholder. */
  attributes: Record<string, string>;
};

/**
 * Retail prices set 23 Sep 2026 from live Quotes API checks (wholesale =
 * item + shipping to the US, "Standard" method). Adjust here; nothing else
 * needs to change.
 *
 * Wall Art (canvas): $51.80 / $60.90 / $84.35 wholesale -> ~2.3-2.4x.
 * Prints & Posters: $25.85 / $27.95 / $37.90 wholesale -> ~2.3-2.6x.
 * Cards & Stationery: every Prodigi card SKU ships from a single UK lab —
 * flat ~$31.50 shipping regardless of style or quantity, so a single card
 * doesn't work economically ($32+ wholesale for a $1 item). Sold as a
 * 10-card box instead: $42.09 wholesale total (shipping is flat per
 * package, so more copies dilutes it) -> $74 retail.
 */
export const PRINT_PRODUCTS: Record<string, PrintProduct> = {
  "canvas-12x16": {
    sku: "GLOBAL-CAN-12X16",
    category: "wall-art",
    label: "12 × 16 in",
    copies: 1,
    retailCents: 11900,
    attributes: { wrap: "ImageWrap" },
  },
  "canvas-16x20": {
    sku: "GLOBAL-CAN-16X20",
    category: "wall-art",
    label: "16 × 20 in",
    copies: 1,
    retailCents: 14900,
    attributes: { wrap: "ImageWrap" },
  },
  "canvas-24x32": {
    sku: "GLOBAL-CAN-24X32",
    category: "wall-art",
    label: "24 × 32 in",
    copies: 1,
    retailCents: 19900,
    attributes: { wrap: "ImageWrap" },
  },
  "poster-11x14": {
    sku: "GLOBAL-FAP-11X14",
    category: "prints-posters",
    label: "11 × 14 in",
    copies: 1,
    retailCents: 5900,
    attributes: {},
  },
  "poster-16x24": {
    sku: "GLOBAL-FAP-16X24",
    category: "prints-posters",
    label: "16 × 24 in",
    copies: 1,
    retailCents: 6900,
    attributes: {},
  },
  "poster-24x36": {
    sku: "GLOBAL-FAP-24X36",
    category: "prints-posters",
    label: "24 × 36 in",
    copies: 1,
    retailCents: 9900,
    attributes: {},
  },
  "card-set-10": {
    sku: "GLOBAL-GRE-GLOS-7X5-BLA",
    category: "cards-stationery",
    label: "Box of 10 cards",
    copies: 10,
    retailCents: 7400,
    attributes: {},
  },
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
 * Places a real order — this prints and ships a real physical item and
 * charges the Prodigi account on file the moment it succeeds. Call only
 * after Stripe has already captured payment for the same order.
 *
 * `idempotencyKey` should be the Stripe checkout session id: Stripe redelivers
 * webhooks at-least-once, and without this a retried delivery would place a
 * second real order for the same payment. Prodigi returns the original order
 * (`outcome: "AlreadyExists"`) instead of creating a duplicate.
 */
export async function createProdigiOrder({
  sku,
  copies,
  attributes,
  imageUrl,
  recipient,
  idempotencyKey,
}: {
  sku: string;
  copies: number;
  attributes: Record<string, string>;
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
          copies,
          sizing: "fillPrintArea",
          attributes,
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
