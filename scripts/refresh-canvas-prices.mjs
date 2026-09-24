// Refreshes lib/canvas-prices.json from Prodigi's live Quotes API: wholesale cost
// (item + Standard shipping to the US, in USD) for every stretched-canvas and
// float-framed-canvas size. Quotes place no order. Re-run when Prodigi changes prices:
//   node scripts/refresh-canvas-prices.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const KEY = process.env.PRODIGI_API_KEY || env.PRODIGI_API_KEY;
const BASE = process.env.PRODIGI_API_BASE || env.PRODIGI_API_BASE;

const SIZES = ["8X8", "8X10", "8X12", "10X10", "10X12", "10X20", "11X14", "12X12", "12X16", "12X18", "12X24", "12X36",
  "14X14", "16X16", "16X20", "16X24", "16X32", "16X48", "18X18", "18X24", "20X20", "20X24", "20X28", "20X30", "20X40",
  "20X60", "24X24", "24X30", "24X32", "24X36", "24X48", "28X28", "28X40", "30X30", "30X40", "30X45", "30X60", "32X40",
  "32X48", "36X36", "36X48", "40X40", "40X50", "40X60", "48X48"];
const FAMILIES = {
  canvas: { prefix: "GLOBAL-CAN", attributes: { wrap: "ImageWrap" } },
  framed: { prefix: "GLOBAL-FRA-CAN", attributes: { wrap: "ImageWrap", color: "black" } },
};

async function quote(sku, attributes) {
  const res = await fetch(`${BASE}/quotes`, {
    method: "POST",
    headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      shippingMethod: "Standard",
      destinationCountryCode: "US",
      currencyCode: "USD",
      items: [{ sku, copies: 1, attributes, assets: [{ printArea: "default" }] }],
    }),
  });
  const text = await res.text();
  // Prodigi allows 30 calls / 30 s; back off and retry when throttled.
  if (text.startsWith("API calls quota exceeded")) {
    await new Promise((r) => setTimeout(r, 31_000));
    return quote(sku, attributes);
  }
  const data = JSON.parse(text);
  const cost = data.quotes?.[0]?.costSummary;
  // "NotAvailable" = the SKU exists but can't ship to the US; recorded as null.
  if (!cost) return null;
  return { item: Number(cost.items.amount), shipping: Number(cost.shipping.amount) };
}

const prices = {};
const jobs = SIZES.flatMap((size) => Object.entries(FAMILIES).map(([family, f]) => ({ size, family, f })));
for (const { size, family, f } of jobs) {
  const q = await quote(`${f.prefix}-${size}`, f.attributes);
  (prices[size] ||= {})[family] = q ? Math.round((q.item + q.shipping) * 100) / 100 : null;
  await new Promise((r) => setTimeout(r, 1_100));
}

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  note: "Prodigi wholesale USD: item + Standard shipping to US. Regenerate with scripts/refresh-canvas-prices.mjs",
  sizes: Object.fromEntries(SIZES.map((s) => [s, prices[s]])),
};
fs.writeFileSync(path.join(ROOT, "lib/canvas-prices.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote ${SIZES.length} sizes`);
for (const s of SIZES) console.log(`  ${s.padEnd(6)} canvas $${prices[s].canvas}  framed $${prices[s].framed}`);
