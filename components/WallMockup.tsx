import type { CSSProperties } from "react";

import type { FrameKey } from "@/lib/canvas-catalog";
import { sceneImageUrl, type WallScene } from "@/lib/wall-scenes";

/** Float frame (moulding face + shadow gap) as a fraction of the piece's long side —
 *  ≈ 0.75" + 0.3" on a 30" piece. */
const FRAME_FACE = 0.025;
const FRAME_GAP = 0.01;

const FRAME_FINISH: Record<Exclude<FrameKey, "canvas">, string> = {
  black: "linear-gradient(135deg,#2c2c2c,#111 55%,#232323)",
  white: "linear-gradient(135deg,#fbfaf7,#e6e4df)",
  natural: "linear-gradient(135deg,#dcc196,#c6a26e 50%,#d8b988)",
  brown: "linear-gradient(135deg,#6e4c32,#4d3220 55%,#684630)",
  gold: "linear-gradient(135deg,#a47e2c,#e8d27f 40%,#b58f3a 62%,#d6ba60)",
  silver: "linear-gradient(135deg,#9ba0a6,#eceef0 40%,#a5aab0 62%,#d2d5d8)",
};

type Box = { x: number; y: number; w: number; h: number };

/**
 * Size of the whole piece (frame included) fitted inside a box, such that the
 * printed image inside the frame keeps the artwork's exact aspect ratio.
 */
function fitPiece(boxW: number, boxH: number, aspect: number, border: number): { w: number; h: number } {
  if (aspect >= 1) {
    const hOverW = (1 - 2 * border) / aspect + 2 * border;
    const w = Math.min(boxW, boxH / hOverW);
    return { w, h: w * hOverW };
  }
  const wOverH = (1 - 2 * border) * aspect + 2 * border;
  const h = Math.min(boxH, boxW / wOverH);
  return { w: h * wOverH, h };
}

/**
 * The product itself, filling its parent: stretched canvas (drop shadow for the
 * 1.5" depth) or float-framed canvas (moulding + dark gap). `piece` is its size in
 * the parent square's units (0–100) so shadows scale with the picture via cqw.
 */
function Piece({ piece, frame, artUrl }: { piece: Box; frame: FrameKey; artUrl: string }) {
  const long = Math.max(piece.w, piece.h);
  const face = frame === "canvas" ? 0 : FRAME_FACE * long;
  const border = frame === "canvas" ? 0 : (FRAME_FACE + FRAME_GAP) * long;
  const pctX = (v: number) => `${(v / piece.w) * 100}%`;
  const pctY = (v: number) => `${(v / piece.h) * 100}%`;
  const cq = (fractionOfLong: number) => `${fractionOfLong * long}cqw`;
  const shadow =
    frame === "canvas"
      ? `${cq(0.004)} ${cq(0.012)} ${cq(0.035)} rgba(0,0,0,0.30), 0 ${cq(0.002)} ${cq(0.006)} rgba(0,0,0,0.30)`
      : `${cq(0.003)} ${cq(0.01)} ${cq(0.03)} rgba(0,0,0,0.30), 0 ${cq(0.0015)} ${cq(0.004)} rgba(0,0,0,0.35)`;

  const art: CSSProperties = {
    position: "absolute",
    left: pctX(border),
    right: pctX(border),
    top: pctY(border),
    bottom: pctY(border),
    backgroundImage: `url("${artUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, boxShadow: shadow }}>
      {frame !== "canvas" ? (
        <>
          <div style={{ position: "absolute", inset: 0, background: FRAME_FINISH[frame] }} />
          <div
            style={{
              position: "absolute",
              left: pctX(face),
              right: pctX(face),
              top: pctY(face),
              bottom: pctY(face),
              background: "#141414",
              boxShadow: `inset 0 0 ${cq(0.008)} rgba(0,0,0,0.9)`,
            }}
          />
        </>
      ) : null}
      <div style={art} />
      {/* Soft room light falling across the surface. */}
      <div style={{ ...art, backgroundImage: "linear-gradient(160deg, rgba(255,255,255,0.07), rgba(0,0,0,0.07))" }} />
    </div>
  );
}

function placed(box: { left: number; top: number; right: number; bottom: number }, aspect: number, frame: FrameKey): Box {
  const border = frame === "canvas" ? 0 : FRAME_FACE + FRAME_GAP;
  const boxW = (box.right - box.left) * 100;
  const boxH = (box.bottom - box.top) * 100;
  const { w, h } = fitPiece(boxW, boxH, aspect, border);
  return { x: box.left * 100 + (boxW - w) / 2, y: box.bottom * 100 - h, w, h };
}

function Square({ background, children }: { background?: string; children: React.ReactNode }) {
  return (
    <div
      className="relative aspect-square w-full overflow-hidden"
      style={{ containerType: "inline-size", background }}
    >
      {children}
    </div>
  );
}

function PieceAt({ piece, frame, artUrl }: { piece: Box; frame: FrameKey; artUrl: string }) {
  return (
    <div style={{ position: "absolute", left: `${piece.x}%`, top: `${piece.y}%`, width: `${piece.w}%`, height: `${piece.h}%` }}>
      <Piece piece={piece} frame={frame} artUrl={artUrl} />
    </div>
  );
}

/** The artwork hanging in a room. `aspect` is the artwork's width / height. */
export function WallMockup({
  scene,
  artUrl,
  aspect,
  frame,
  eager = false,
}: {
  scene: WallScene;
  artUrl: string;
  aspect: number;
  frame: FrameKey;
  eager?: boolean;
}) {
  return (
    <Square>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sceneImageUrl(scene)}
        alt=""
        aria-hidden
        draggable={false}
        loading={eager ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <PieceAt piece={placed(scene.artBox, aspect, frame)} frame={frame} artUrl={artUrl} />
    </Square>
  );
}

/** Product shot on a plain backdrop: the whole piece, no room. */
export function ProductShot({ artUrl, aspect, frame }: { artUrl: string; aspect: number; frame: FrameKey }) {
  const box = { left: 0.14, top: 0.14, right: 0.86, bottom: 0.86 };
  const piece = placed(box, aspect, frame);
  // Centre vertically too (rooms rest the piece on the bottom edge).
  const centred = { ...piece, y: 50 - piece.h / 2 };
  return (
    <Square background="#efece6">
      <PieceAt piece={centred} frame={frame} artUrl={artUrl} />
    </Square>
  );
}
