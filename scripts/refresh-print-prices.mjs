// Refreshes lib/framed-print-prices.json from Prodigi's live API for the Classic
// Framed Print with mount (GLOBAL-CFPM-{size}): per frame size, the printed image
// area in pixels (smaller than the frame — the white mount surrounds it) and the
// wholesale cost (item + Standard shipping to the US, USD). Quotes place no order.
//   node scripts/refresh-print-prices.mjs
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

const SIZES = ["8X8", "8X10", "8X12", "10X20", "11X14", "12X12", "12X16", "12X18", "12X24", "12X36", "16X16", "16X20",
  "16X24", "18X18", "18X24", "20X20", "20X28", "20X30", "20X40", "24X24", "24X30", "24X32", "24X36", "28X28", "28X40",
  "30X30", "30X40", "30X45", "32X40", "36X36", "36X48", "40X40"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Prodigi allows 30 calls / 30 s; back off and retry when throttled.
async function call(url, init) {
  for (;;) {
    const res = await fetch(url, { ...init, headers: { "X-API-Key": KEY, "Content-Type": "application/json", ...init?.headers } });
    const text = await res.text();
    if (!text.startsWith("API calls quota exceeded")) return JSON.parse(text);
    await sleep(31_000);
  }
}

const sizes = {};
for (const size of SIZES) {
  const sku = `GLOBAL-CFPM-${size}`;
  const product = (await call(`${BASE}/products/${sku}`)).product;
  await sleep(1_100);
  const px = product?.variants?.[0]?.printAreaSizes?.default;
  const quote = await call(`${BASE}/quotes`, {
    method: "POST",
    body: JSON.stringify({
      shippingMethod: "Standard",
      destinationCountryCode: "US",
      currencyCode: "USD",
      items: [{ sku, copies: 1, attributes: { color: "black" }, assets: [{ printArea: "default" }] }],
    }),
  });
  await sleep(1_100);
  const cost = quote.quotes?.[0]?.costSummary;
  // null = the size can't ship to the US.
  sizes[size] = {
    wholesale: cost ? Math.round((Number(cost.items.amount) + Number(cost.shipping.amount)) * 100) / 100 : null,
    printPx: px ? [px.horizontalResolution, px.verticalResolution] : null,
  };
  console.log(`  ${size.padEnd(6)} $${sizes[size].wholesale}  print ${px?.horizontalResolution}x${px?.verticalResolution}px`);
}

fs.writeFileSync(
  path.join(ROOT, "lib/framed-print-prices.json"),
  `${JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    note: "Prodigi GLOBAL-CFPM wholesale USD (item + Standard US shipping) and print-area px. Regenerate with scripts/refresh-print-prices.mjs",
    sizes,
  }, null, 2)}\n`,
);
console.log(`wrote ${SIZES.length} sizes`);
