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

/** Scenes that read as a living room — the pool the print page draws from. */
const LIVING_ROOM_IDS = new Set([
  "living-sectional",
  "living-linen",
  "living-leather",
  "living-boucle",
  "living-velvet-olive",
  "living-armchairs",
  "living-terracotta",
  "reading-nook",
  "fireplace-mantel",
  "sideboard-japandi",
]);

/**
 * `count` living rooms for an artwork, a different mix per artwork. Seeded by the
 * slug rather than Math.random so the server render and the browser agree (no
 * hydration mismatch) and a given artwork always shows the same rooms.
 */
export function livingRoomsFor(seed: string, count = 3): WallScene[] {
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  const rand = () => {
    // mulberry32
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pool = WALL_SCENES.filter((s) => LIVING_ROOM_IDS.has(s.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function sceneImageUrl(scene: WallScene, variant: "full" | "thumb"): string {
  return `/images/print-mockups/rooms/${scene.id}${variant === "thumb" ? "-thumb" : ""}.jpg`;
}
