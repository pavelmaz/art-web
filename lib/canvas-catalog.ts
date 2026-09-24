import prices from "@/lib/canvas-prices.json";

/**
 * Wall-art catalogue for the print product page: which Prodigi canvas sizes suit
 * an artwork, the frame options, and retail prices. Wholesale costs come from
 * lib/canvas-prices.json (regenerate with scripts/refresh-canvas-prices.mjs).
 */

export type FrameKey = "canvas" | "black" | "white" | "natural" | "brown" | "gold" | "silver";

export const FRAME_OPTIONS: { key: FrameKey; label: string }[] = [
  { key: "canvas", label: "Stretched canvas" },
  { key: "black", label: "Black frame" },
  { key: "white", label: "White frame" },
  { key: "natural", label: "Natural wood frame" },
  { key: "brown", label: "Walnut frame" },
  { key: "gold", label: "Gold frame" },
  { key: "silver", label: "Silver frame" },
];

export function isFrameKey(value: unknown): value is FrameKey {
  return FRAME_OPTIONS.some((f) => f.key === value);
}

const MARKUP = 2.3;
/** Above this wholesale cost Prodigi's oversize shipping kicks in (40x60 = $367). */
const MAX_WHOLESALE_USD = 200;
/** Canvas is viewed from a distance: 150 DPI is the accepted floor (vs ~300 for close-up prints). */
const MIN_DPI = 150;
/** How far a size's shape may differ from the artwork's: close matches first,
 *  widened when that leaves too few sizes to choose from. */
const MAX_RATIO_DIFF = 0.05;
const WIDE_RATIO_DIFF = 0.08;
const MIN_SIZE_CHOICES = 4;

type PriceRow = { canvas: number | null; framed: number | null };
const PRICE_TABLE = prices.sizes as Record<string, PriceRow>;

export type CanvasSize = {
  /** Prodigi size code, short side first, e.g. "12X16". */
  code: string;
  /** Printed width and height in inches, oriented like the artwork. */
  widthIn: number;
  heightIn: number;
  label: string;
};

function retailUsd(wholesale: number): number {
  return Math.ceil((wholesale * MARKUP) / 10) * 10 - 1;
}

export function priceUsd(code: string, frame: FrameKey): number | null {
  const row = PRICE_TABLE[code];
  const wholesale = frame === "canvas" ? row?.canvas : row?.framed;
  return wholesale ? retailUsd(wholesale) : null;
}

function sizeLabel(widthIn: number, heightIn: number): string {
  const cm = (inches: number) => Math.round(inches * 2.54);
  return `${cm(widthIn)}x${cm(heightIn)}cm – ${widthIn}"x${heightIn}"`;
}

/**
 * Sizes that suit the artwork: close to its shape (so the print isn't visibly
 * cropped), enough resolution at 150 DPI, and not in oversize-shipping territory.
 * Unusual shapes with nothing close fall back to the nearest shape Prodigi offers.
 */
export function sizesForArtwork(imgWidth: number | null, imgHeight: number | null): CanvasSize[] {
  if (!imgWidth || !imgHeight) return [];
  const landscape = imgWidth > imgHeight;
  const shortPx = Math.min(imgWidth, imgHeight);
  const longPx = Math.max(imgWidth, imgHeight);
  const artRatio = longPx / shortPx;

  const candidates = Object.entries(PRICE_TABLE)
    .filter(([, row]) => row.canvas !== null && row.canvas <= MAX_WHOLESALE_USD)
    .map(([code]) => {
      const [a, b] = code.split("X").map(Number);
      const shortIn = Math.min(a, b);
      const longIn = Math.max(a, b);
      return { code, shortIn, longIn, diff: Math.abs(longIn / shortIn - artRatio) / artRatio };
    })
    .filter((s) => s.shortIn * MIN_DPI <= shortPx && s.longIn * MIN_DPI <= longPx);

  if (candidates.length === 0) return [];
  const closest = Math.min(...candidates.map((s) => s.diff));
  let threshold = Math.max(MAX_RATIO_DIFF, closest + 0.005);
  if (candidates.filter((s) => s.diff <= threshold).length < MIN_SIZE_CHOICES) {
    threshold = Math.max(threshold, WIDE_RATIO_DIFF);
  }

  return candidates
    .filter((s) => s.diff <= threshold)
    .sort((x, y) => x.shortIn * x.longIn - y.shortIn * y.longIn)
    .map((s) => {
      const widthIn = landscape ? s.longIn : s.shortIn;
      const heightIn = landscape ? s.shortIn : s.longIn;
      return { code: s.code, widthIn, heightIn, label: sizeLabel(widthIn, heightIn) };
    });
}

/** The Prodigi SKU + attributes for a size/frame choice (sent to the Orders API). */
export function prodigiItemFor(code: string, frame: FrameKey): { sku: string; attributes: Record<string, string> } {
  if (frame === "canvas") return { sku: `GLOBAL-CAN-${code}`, attributes: { wrap: "ImageWrap" } };
  return { sku: `GLOBAL-FRA-CAN-${code}`, attributes: { wrap: "ImageWrap", color: frame } };
}
