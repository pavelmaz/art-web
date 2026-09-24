/**
 * Room scenes for the print mockups: warm, straight-on interiors with a bare
 * wall, generated with FLUX.2 [dev] on Cloudflare Workers AI and saved as squares
 * (public/images/print-mockups/rooms/{id}.jpg + {id}-thumb.jpg). The framed print
 * is drawn by the site (components/WallMockup), so any artwork shape fits and
 * nothing moves when the customer changes size — only the frame colour follows
 * their choice.
 *
 * artBox: where the framed print is fitted, as fractions of the square. The piece
 * keeps its own shape inside it, centred horizontally and resting on the box's
 * bottom edge (a hand's width above the furniture).
 */
export type WallScene = {
  id: string;
  label: string;
  artBox: { left: number; top: number; right: number; bottom: number };
};

export const WALL_SCENES: WallScene[] = [
  { id: "living-sectional", label: "Living room", artBox: { left: 0.26, top: 0.12, right: 0.74, bottom: 0.47 } },
  { id: "living-linen", label: "Living room, linen sofa", artBox: { left: 0.27, top: 0.13, right: 0.73, bottom: 0.51 } },
  { id: "living-leather", label: "Living room, leather sofa", artBox: { left: 0.24, top: 0.12, right: 0.68, bottom: 0.55 } },
  { id: "living-boucle", label: "Living room, bouclé sofa", artBox: { left: 0.27, top: 0.12, right: 0.7, bottom: 0.48 } },
  { id: "living-velvet-olive", label: "Living room, velvet sofa", artBox: { left: 0.19, top: 0.16, right: 0.61, bottom: 0.6 } },
  { id: "living-armchairs", label: "Living room, armchairs", artBox: { left: 0.29, top: 0.12, right: 0.71, bottom: 0.46 } },
  { id: "living-terracotta", label: "Living room, terracotta wall", artBox: { left: 0.08, top: 0.12, right: 0.54, bottom: 0.58 } },
  { id: "reading-nook", label: "Reading corner", artBox: { left: 0.28, top: 0.1, right: 0.68, bottom: 0.58 } },
  { id: "fireplace-mantel", label: "Fireplace", artBox: { left: 0.3, top: 0.12, right: 0.74, bottom: 0.56 } },
  { id: "sideboard-japandi", label: "Sideboard", artBox: { left: 0.33, top: 0.08, right: 0.69, bottom: 0.54 } },
  { id: "dining-rattan", label: "Dining room", artBox: { left: 0.3, top: 0.1, right: 0.7, bottom: 0.5 } },
  { id: "bedroom-linen", label: "Bedroom", artBox: { left: 0.27, top: 0.14, right: 0.73, bottom: 0.61 } },
  { id: "entrance-console", label: "Entrance", artBox: { left: 0.28, top: 0.1, right: 0.7, bottom: 0.48 } },
  { id: "study-desk", label: "Study", artBox: { left: 0.22, top: 0.1, right: 0.66, bottom: 0.58 } },
];

export function sceneImageUrl(scene: WallScene, variant: "full" | "thumb"): string {
  return `/images/print-mockups/rooms/${scene.id}${variant === "thumb" ? "-thumb" : ""}.jpg`;
}
