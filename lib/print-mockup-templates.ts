import type { ProductCategory } from "@/lib/prodigi";

/**
 * Room/product photos for the print product page's gallery — real,
 * freely-licensed stock photography (Pexels License, free for commercial
 * use, confirmed per-photo), not generated or purchased. Each photo was
 * chosen because it already has a blank frame/paper/card shot front-on, so
 * the artwork composites into `wallRect` with a plain CSS absolute-position
 * — no perspective correction needed.
 *
 * `wallRect` is the frame's inner (paper/canvas) area as a percentage of the
 * photo's own width/height. Measured precisely, not eyeballed: scanned each
 * photo for the frame/paper's true edge (a dark-border scan for black-framed
 * photos, a bright-paper-vs-wall scan for borderless ones, a pure-white-vs-
 * off-white scan for thin light-wood borders — whichever channel actually
 * gives contrast in that specific photo), then cropped to the resulting
 * rect and visually confirmed the crop lands on the edge before accepting
 * the numbers. An earlier pass shipped eyeballed coordinates and got it
 * visibly wrong (artwork overflowing the frame); this discipline is why the
 * numbers below can be trusted without re-verifying by eye every time.
 *
 * `orientation` is the shape of the frame itself (not the photo) — what
 * lets the gallery show a composite that actually matches the source
 * artwork's own aspect ratio instead of always cropping into the same
 * portrait-shaped window. See `artworkOrientation()` in lib/utils.ts.
 */
export type MockupTemplate = {
  id: string;
  label: string;
  category: ProductCategory;
  orientation: "portrait" | "landscape";
  imageUrl: string;
  wallRect: { top: number; left: number; width: number; height: number };
};

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  // Wall Art — living spaces, not workspaces: a canvas print's natural home.
  {
    id: "office",
    label: "Home office",
    category: "wall-art",
    orientation: "portrait",
    imageUrl: "/images/print-mockups/office.jpg",
    wallRect: { top: 17.47, left: 44.79, width: 42.65, height: 32.8 },
  },
  {
    id: "bedroom",
    label: "Bedroom",
    category: "wall-art",
    orientation: "portrait",
    imageUrl: "/images/print-mockups/bedroom.jpg",
    wallRect: { top: 16.4, left: 49.76, width: 36.02, height: 38.0 },
  },
  {
    id: "livingroom-sofa",
    label: "Living room",
    category: "wall-art",
    orientation: "portrait",
    imageUrl: "/images/print-mockups/livingroom-sofa.jpg",
    wallRect: { top: 28.97, left: 38.57, width: 11.07, height: 27.57 },
  },
  {
    id: "wall-landscape",
    label: "Living room",
    category: "wall-art",
    orientation: "landscape",
    imageUrl: "/images/print-mockups/wall-landscape.jpg",
    wallRect: { top: 31.4, left: 36.93, width: 36.93, height: 45.98 },
  },
  // Prints & Posters — unframed/thin-framed, styled flatter and more casual
  // than a canvas hung in a living room, so the category actually reads as
  // a different product rather than the same wall photo with a mat added.
  {
    id: "entryway",
    label: "Entryway",
    category: "prints-posters",
    orientation: "portrait",
    imageUrl: "/images/print-mockups/entryway.jpg",
    wallRect: { top: 28.13, left: 33.9, width: 47.9, height: 44.53 },
  },
  {
    id: "poster-desk",
    label: "Studio desk",
    category: "prints-posters",
    orientation: "portrait",
    imageUrl: "/images/print-mockups/poster-desk.jpg",
    wallRect: { top: 17.6, left: 36.89, width: 24.71, height: 46.0 },
  },
  // Cards & Stationery — a tabletop product shot, not a wall photo. The card
  // has its own fixed shape regardless of the source artwork's aspect
  // ratio, so there's no orientation variant to source here.
  {
    id: "card-rose",
    label: "Card",
    category: "cards-stationery",
    orientation: "portrait",
    imageUrl: "/images/print-mockups/card-rose.jpg",
    wallRect: { top: 73.92, left: 33.6, width: 35.1, height: 12.81 },
  },
];
