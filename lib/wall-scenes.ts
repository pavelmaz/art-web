/**
 * Room scenes for the print mockups. Each photo is a straight-on shot of an EMPTY
 * wall, pre-cropped to a fixed square view (public/images/print-mockups/rooms,
 * built from Pexels photos, free for commercial use). The frame and artwork are
 * drawn by the site (components/WallMockup), so any artwork shape fits and nothing
 * moves when the customer changes size — only the frame style follows their choice.
 *
 * artBox: where the artwork (incl. frame) is fitted, as fractions of the square.
 * The piece keeps its own shape inside it, centred horizontally and resting on the
 * box's bottom edge (a hand's width above the furniture).
 */
export type WallScene = {
  id: string;
  label: string;
  artBox: { left: number; top: number; right: number; bottom: number };
};

export const WALL_SCENES: WallScene[] = [
  { id: "living-sofa", label: "Living room", artBox: { left: 0.1523, top: 0.087, right: 0.7318, bottom: 0.4022 } }, // Pexels 12278560
  { id: "bedroom-wood", label: "Bedroom", artBox: { left: 0.2752, top: 0.12, right: 0.7248, bottom: 0.49 } }, // Pexels 7045993
  { id: "dining-green", label: "Dining room", artBox: { left: 0.2694, top: 0.1, right: 0.7306, bottom: 0.47 } }, // Pexels 9120948
  { id: "living-loveseat", label: "Sitting room", artBox: { left: 0.1408, top: 0.0957, right: 0.6134, bottom: 0.3989 } }, // Pexels 12277410
  { id: "hallway-console", label: "Hallway", artBox: { left: 0.2113, top: 0.0833, right: 0.7887, bottom: 0.4167 } }, // Pexels 7103621
  { id: "office-desk", label: "Home office", artBox: { left: 0.2799, top: 0.087, right: 0.7201, bottom: 0.3587 } }, // Pexels 10567351
  { id: "bedroom-slat", label: "Bedroom, slatted wall", artBox: { left: 0.2157, top: 0.08, right: 0.7843, bottom: 0.4 } }, // Pexels 12289358
  { id: "kitchen-stools", label: "Kitchen table", artBox: { left: 0.3223, top: 0.12, right: 0.8198, bottom: 0.52 } }, // Pexels 12277251
  { id: "entrance-console", label: "Entrance", artBox: { left: 0.2394, top: 0.0438, right: 0.7606, bottom: 0.3563 } }, // Pexels 8135288
  { id: "reading-armchair", label: "Reading corner", artBox: { left: 0.3756, top: 0.07, right: 0.8731, bottom: 0.35 } }, // Pexels 12277350
];

export function sceneImageUrl(scene: WallScene): string {
  return `/images/print-mockups/rooms/${scene.id}.jpg`;
}
