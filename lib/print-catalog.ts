import prices from "@/lib/framed-print-prices.json";

/**
 * Framed-print catalogue for the print product page: Prodigi's Classic Framed
 * Print without mount (GLOBAL-CFP-{size}: EMA 200gsm fine art paper, acrylic
 * glazing, no mount). The listed size is the glass; the artwork is printed edge
 * to edge to fill it (`fillPrintArea`), so sizes are only offered when their
 * shape is close to the artwork's and any trim stays tiny. Data:
 * lib/framed-print-prices.json (regenerate with scripts/refresh-print-prices.mjs).
 */

export type FrameKey = "black" | "white" | "natural" | "brown" | "gold" | "silver" | "darkgrey" | "lightgrey";

export const FRAME_OPTIONS: { key: FrameKey; label: string; prodigiColor: string }[] = [
  { key: "black", label: "Black frame", prodigiColor: "black" },
  { key: "white", label: "White frame", prodigiColor: "white" },
  { key: "natural", label: "Natural wood frame", prodigiColor: "natural" },
  { key: "brown", label: "Walnut frame", prodigiColor: "brown" },
  { key: "gold", label: "Gold frame", prodigiColor: "gold" },
  { key: "silver", label: "Silver frame", prodigiColor: "silver" },
  { key: "darkgrey", label: "Dark grey frame", prodigiColor: "dark grey" },
  { key: "lightgrey", label: "Light grey frame", prodigiColor: "light grey" },
];

export function isFrameKey(value: unknown): value is FrameKey {
  return FRAME_OPTIONS.some((f) => f.key === value);
}

/** Classic frame (Prodigi spec sheet): 20mm moulding face whose 5mm rebate
 *  overlaps the glass, so the frame adds 15mm per side beyond the listed size. */
export const FRAME_FACE_IN = 20 / 25.4;
export const FRAME_REBATE_IN = 5 / 25.4;

const MARKUP = 2.3;
/** Above this wholesale cost Prodigi's oversize shipping kicks in (30x45 = $347). */
const MAX_WHOLESALE_USD = 200;
/** Viewed from a normal distance, 150 DPI is the accepted floor for a reproduction. */
const MIN_DPI = 150;
const PRODIGI_DPI = 300;
/** The artwork fills the glass, so a size's shape must be close to the artwork's:
 *  close matches first, widened when that leaves too few sizes to choose from. */
const MAX_RATIO_DIFF = 0.05;
const WIDE_RATIO_DIFF = 0.08;
const MIN_SIZE_CHOICES = 4;

type PriceRow = { wholesale: number | null; printPx: number[] | null };
const PRICE_TABLE = prices.sizes as Record<string, PriceRow>;

export type PrintSize = {
  /** Prodigi size code, short side first, e.g. "16X20". */
  code: string;
  /** Printed (glass) size in inches, oriented like the artwork — excludes the moulding. */
  widthIn: number;
  heightIn: number;
  label: string;
};

export function priceUsd(code: string): number | null {
  const wholesale = PRICE_TABLE[code]?.wholesale;
  return wholesale ? Math.ceil((wholesale * MARKUP) / 10) * 10 - 1 : null;
}

/** Overall size on the wall, including the moulding. */
export function overallInches(glassIn: number): number {
  return Math.round((glassIn + 2 * (FRAME_FACE_IN - FRAME_REBATE_IN)) * 10) / 10;
}

/**
 * Sizes that suit the artwork: shape close to it (so the edge-to-edge print is
 * barely trimmed), enough resolution at 150 DPI, below oversize shipping.
 * Unusual shapes fall back to the nearest shape Prodigi offers.
 */
export function sizesForArtwork(imgWidth: number | null, imgHeight: number | null): PrintSize[] {
  if (!imgWidth || !imgHeight) return [];
  const landscape = imgWidth > imgHeight;
  const shortPx = Math.min(imgWidth, imgHeight);
  const longPx = Math.max(imgWidth, imgHeight);
  const artRatio = longPx / shortPx;

  const candidates = Object.entries(PRICE_TABLE)
    .filter(([, row]) => row.wholesale !== null && row.wholesale <= MAX_WHOLESALE_USD && row.printPx !== null)
    .map(([code, row]) => {
      const printShort = Math.min(...row.printPx!) / PRODIGI_DPI;
      const printLong = Math.max(...row.printPx!) / PRODIGI_DPI;
      const [a, b] = code.split("X").map(Number);
      return {
        code,
        shortIn: Math.min(a, b),
        longIn: Math.max(a, b),
        printShort,
        printLong,
        diff: Math.abs(printLong / printShort - artRatio) / artRatio,
      };
    })
    .filter((s) => s.printShort * MIN_DPI <= shortPx && s.printLong * MIN_DPI <= longPx);

  if (candidates.length === 0) return [];
  const closest = Math.min(...candidates.map((s) => s.diff));
  let threshold = Math.max(MAX_RATIO_DIFF, closest + 0.005);
  if (candidates.filter((s) => s.diff <= threshold).length < MIN_SIZE_CHOICES) {
    threshold = Math.max(threshold, WIDE_RATIO_DIFF);
  }

  const cm = (inches: number) => Math.round(inches * 2.54);
  return candidates
    .filter((s) => s.diff <= threshold)
    .sort((x, y) => x.shortIn * x.longIn - y.shortIn * y.longIn)
    .map((s) => {
      const widthIn = landscape ? s.longIn : s.shortIn;
      const heightIn = landscape ? s.shortIn : s.longIn;
      return { code: s.code, widthIn, heightIn, label: `${cm(widthIn)}x${cm(heightIn)}cm – ${widthIn}"x${heightIn}"` };
    });
}

/** The Prodigi SKU, attributes and sizing for a size/frame choice (sent to the Orders API). */
export function prodigiItemFor(
  code: string,
  frame: FrameKey
): { sku: string; attributes: Record<string, string>; sizing: "fillPrintArea" } {
  const color = FRAME_OPTIONS.find((f) => f.key === frame)!.prodigiColor;
  return { sku: `GLOBAL-CFP-${code}`, attributes: { color }, sizing: "fillPrintArea" };
}

/** Print sales are a Van Gogh-only test for now. */
const PRINT_ARTISTS = new Set(["Vincent van Gogh"]);

/** Whether the artwork can be sold as a framed print: a print artist, and enough
 *  resolution for at least one size. Used by the artwork page, the print page and
 *  checkout, so the button, the page and the payment always agree. */
export function canSellPrint(artwork: {
  artist_display: string | null;
  img_width: number | null;
  img_height: number | null;
}): boolean {
  return (
    !!artwork.artist_display &&
    PRINT_ARTISTS.has(artwork.artist_display) &&
    sizesForArtwork(artwork.img_width, artwork.img_height).length > 0
  );
}
