/**
 * Room photos for the print product page's gallery — real, freely-licensed
 * stock photography (Pexels License, free for commercial use, confirmed
 * 23 Sep 2026), not generated or purchased. Each photo was chosen because it
 * already has a blank frame shot front-on, so the artwork composites into
 * `wallRect` with a plain CSS absolute-position — no perspective correction
 * needed.
 *
 * `wallRect` is the frame's inner (paper/canvas) area as a percentage of the
 * photo's own width/height. Measured precisely, not eyeballed: scanned each
 * photo pixel-by-pixel for the frame's dark border, then confirmed by
 * cropping the image to the resulting rect and visually checking the crop
 * lands exactly on the frame's inner edge (see /tmp/mockups/measure_frame.py
 * from the session that built this — a rough eyeball estimate was tried
 * first and shipped, then reported back as visibly wrong: artwork
 * overflowing the frame in two of three photos, badly in one). A third
 * "living room" candidate was dropped rather than force a bad fit — its
 * frame area was one continuous, borderless bright rectangle, so there was
 * no dark edge to measure against, and a same-photographer replacement
 * turned out to duplicate the bedroom photo's furniture. Two precisely
 * measured templates beat three where one is a rough guess.
 */
export type MockupTemplate = {
  id: string;
  label: string;
  imageUrl: string;
  wallRect: { top: number; left: number; width: number; height: number };
};

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  {
    id: "office",
    label: "Home office",
    imageUrl: "/images/print-mockups/office.jpg",
    wallRect: { top: 17.47, left: 44.79, width: 42.65, height: 32.8 },
  },
  {
    id: "bedroom",
    label: "Bedroom",
    imageUrl: "/images/print-mockups/bedroom.jpg",
    wallRect: { top: 16.4, left: 49.76, width: 36.02, height: 38.0 },
  },
];
