/**
 * Room photos for the print product page's gallery — real, freely-licensed
 * stock photography (Pexels License / Unsplash License, both free for
 * commercial use, confirmed 23 Sep 2026), not generated or purchased. Each
 * photo was chosen because it already has a blank frame shot front-on, so the
 * artwork composites into `wallRect` with a plain CSS absolute-position — no
 * perspective correction needed.
 *
 * `wallRect` is the frame's inner (paper/canvas) area as a percentage of the
 * photo's own width/height, measured by eye once per photo.
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
    wallRect: { top: 17, left: 44, width: 44, height: 31 },
  },
  {
    id: "bedroom",
    label: "Bedroom",
    imageUrl: "/images/print-mockups/bedroom.jpg",
    wallRect: { top: 13, left: 48, width: 40, height: 41 },
  },
  {
    id: "livingroom",
    label: "Living room",
    imageUrl: "/images/print-mockups/livingroom.jpg",
    wallRect: { top: 6, left: 51, width: 46, height: 53 },
  },
];
