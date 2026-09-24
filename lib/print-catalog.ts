import prices from "@/lib/framed-print-prices.json";

/**
 * Framed-print catalogue for the print product page: Prodigi's Classic Framed
 * Print (GLOBAL-CFPM-{size}: EMA 200gsm fine art paper, white mount, acrylic
 * glazing). The size code is the FRAME size; the mount window inside it is
 * smaller and has its own shape (printPx at 300 DPI) — the artwork is fitted into
 * that window, never cropped. Data: lib/framed-print-prices.json
 * (regenerate with scripts/refresh-print-prices.mjs).
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

const MARKUP = 2.3;
/** Viewed from a normal distance, 150 DPI is the accepted floor for a reproduction. */
const MIN_DPI = 150;
const PRODIGI_DPI = 300;
/** The artwork is FITTED inside the mount window (Prodigi `fitPrintArea`, never
 *  cropped); a small shape difference just shows as a slightly wider white margin
 *  on two sides, blending into the mount. These cap how big that margin can get:
 *  close shapes first, widened when that leaves too few sizes to choose from. */
const MAX_RATIO_DIFF = 0.12;
const WIDE_RATIO_DIFF = 0.15;
const MIN_SIZE_CHOICES = 4;

type PriceRow = { wholesale: number | null; printPx: number[] | null };
const PRICE_TABLE = prices.sizes as Record<string, PriceRow>;

export type PrintSize = {
  /** Prodigi frame size code, short side first, e.g. "16X20". */
  code: string;
  /** Frame (outer) size in inches, oriented like the artwork. */
  widthIn: number;
  heightIn: number;
  /** The artwork as printed (fitted inside the mount window), in inches, oriented like the artwork. */
  imageWidthIn: number;
  imageHeightIn: number;
  label: string;
};

export function priceUsd(code: string): number | null {
  const wholesale = PRICE_TABLE[code]?.wholesale;
  return wholesale ? Math.ceil((wholesale * MARKUP) / 10) * 10 - 1 : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Frame sizes that suit the artwork: mount window close to its shape (so the
 * extra white margin stays small) and enough resolution at 150 DPI for the
 * artwork as printed. Unusual shapes fall back to the nearest windows available.
 */
export function sizesForArtwork(imgWidth: number | null, imgHeight: number | null): PrintSize[] {
  if (!imgWidth || !imgHeight) return [];
  const landscape = imgWidth > imgHeight;
  const shortPx = Math.min(imgWidth, imgHeight);
  const longPx = Math.max(imgWidth, imgHeight);
  const artRatio = longPx / shortPx;

  const candidates = Object.entries(PRICE_TABLE)
    .filter(([, row]) => row.wholesale !== null && row.printPx !== null)
    .map(([code, row]) => {
      const [a, b] = code.split("X").map(Number);
      const printShort = Math.min(...row.printPx!);
      const printLong = Math.max(...row.printPx!);
      return {
        code,
        frameShort: Math.min(a, b),
        frameLong: Math.max(a, b),
        imageShort: printShort / PRODIGI_DPI,
        imageLong: printLong / PRODIGI_DPI,
        diff: Math.abs(printLong / printShort - artRatio) / artRatio,
      };
    })
    .map((s) => {
      // Fit the artwork inside the window: limited by the long or the short side.
      const fitLong = Math.min(s.imageLong, s.imageShort * artRatio);
      return { ...s, fitLong, fitShort: fitLong / artRatio };
    })
    .filter((s) => s.fitShort * MIN_DPI <= shortPx && s.fitLong * MIN_DPI <= longPx);

  if (candidates.length === 0) return [];
  const closest = Math.min(...candidates.map((s) => s.diff));
  let threshold = Math.max(MAX_RATIO_DIFF, closest + 0.005);
  if (candidates.filter((s) => s.diff <= threshold).length < MIN_SIZE_CHOICES) {
    threshold = Math.max(threshold, WIDE_RATIO_DIFF);
  }

  const cm = (inches: number) => Math.round(inches * 2.54);
  return candidates
    .filter((s) => s.diff <= threshold)
    .sort((x, y) => x.frameShort * x.frameLong - y.frameShort * y.frameLong)
    .map((s) => {
      const widthIn = landscape ? s.frameLong : s.frameShort;
      const heightIn = landscape ? s.frameShort : s.frameLong;
      return {
        code: s.code,
        widthIn,
        heightIn,
        imageWidthIn: round1(landscape ? s.fitLong : s.fitShort),
        imageHeightIn: round1(landscape ? s.fitShort : s.fitLong),
        label: `${cm(widthIn)}x${cm(heightIn)}cm – ${widthIn}"x${heightIn}"`,
      };
    });
}

/** The Prodigi SKU + attributes for a size/frame choice (sent to the Orders API). */
export function prodigiItemFor(
  code: string,
  frame: FrameKey
): { sku: string; attributes: Record<string, string>; sizing: "fitPrintArea" } {
  const color = FRAME_OPTIONS.find((f) => f.key === frame)!.prodigiColor;
  return { sku: `GLOBAL-CFPM-${code}`, attributes: { color }, sizing: "fitPrintArea" };
}
