import type { CSSProperties } from "react";

import type { FrameKey } from "@/lib/print-catalog";
import { sceneImageUrl, type WallScene } from "@/lib/wall-scenes";

/** Classic framed print proportions, as fractions of the piece's long side:
 *  wooden moulding + white mount around the printed image (≈ 2" mount on 24"). */
const FRAME_FACE = 0.03;
const MOUNT = 0.085;
const BORDER = FRAME_FACE + MOUNT;

const FRAME_FINISH: Record<FrameKey, string> = {
  black: "linear-gradient(135deg,#2c2c2c,#101010 55%,#222)",
  white: "linear-gradient(135deg,#fbfaf7,#e4e2dc)",
  natural: "linear-gradient(135deg,#dcc196,#c29d68 50%,#d6b784)",
  brown: "linear-gradient(135deg,#6e4c32,#4a301f 55%,#654430)",
  gold: "linear-gradient(135deg,#a47e2c,#e8d27f 40%,#b58f3a 62%,#d6ba60)",
  silver: "linear-gradient(135deg,#9ba0a6,#eceef0 40%,#a5aab0 62%,#d2d5d8)",
  darkgrey: "linear-gradient(135deg,#55585c,#393b3e 55%,#4b4e52)",
  lightgrey: "linear-gradient(135deg,#c9cbcd,#aeb1b4 55%,#c2c4c6)",
};

type Box = { x: number; y: number; w: number; h: number };

/** Outer size of the framed piece fitted in a box, with the printed image
 *  inside the mount keeping the artwork's exact aspect ratio. */
function fitPiece(boxW: number, boxH: number, aspect: number): { w: number; h: number } {
  if (aspect >= 1) {
    const hOverW = (1 - 2 * BORDER) / aspect + 2 * BORDER;
    const w = Math.min(boxW, boxH / hOverW);
    return { w, h: w * hOverW };
  }
  const wOverH = (1 - 2 * BORDER) * aspect + 2 * BORDER;
  const h = Math.min(boxH, boxW / wOverH);
  return { w: h * wOverH, h };
}

/** The framed print, filling its parent. `piece` is in the square's 0–100 units,
 *  so `cqw` shadows scale with the picture. */
function FramedPrint({ piece, frame, artUrl }: { piece: Box; frame: FrameKey; artUrl: string }) {
  const long = Math.max(piece.w, piece.h);
  const pctX = (v: number) => `${(v / piece.w) * 100}%`;
  const pctY = (v: number) => `${(v / piece.h) * 100}%`;
  const cq = (fractionOfLong: number) => `${fractionOfLong * long}cqw`;
  const inset = (v: number): CSSProperties => ({
    position: "absolute",
    left: pctX(v),
    right: pctX(v),
    top: pctY(v),
    bottom: pctY(v),
  });

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background: FRAME_FINISH[frame],
        boxShadow: `${cq(0.006)} ${cq(0.02)} ${cq(0.05)} rgba(0,0,0,0.32), 0 ${cq(0.003)} ${cq(0.008)} rgba(0,0,0,0.3)`,
      }}
    >
      {/* White mount, slightly shaded by the frame's inner edge. */}
      <div
        style={{
          ...inset(FRAME_FACE * long),
          background: "#f6f4ef",
          boxShadow: `inset ${cq(0.003)} ${cq(0.004)} ${cq(0.008)} rgba(0,0,0,0.28)`,
        }}
      />
      {/* The printed image, with the mount's bevel cut around it. */}
      <div
        style={{
          ...inset(BORDER * long),
          backgroundImage: `url("${artUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: `0 0 0 ${cq(0.002)} #e2ded5`,
        }}
      />
      {/* Acrylic glazing: a faint diagonal sheen across the whole frame. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(118deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.09) 48%, rgba(255,255,255,0) 58%)",
        }}
      />
    </div>
  );
}

function placed(box: WallScene["artBox"], aspect: number): Box {
  const boxW = (box.right - box.left) * 100;
  const boxH = (box.bottom - box.top) * 100;
  const { w, h } = fitPiece(boxW, boxH, aspect);
  return { x: box.left * 100 + (boxW - w) / 2, y: box.bottom * 100 - h, w, h };
}

function PieceAt({ piece, frame, artUrl }: { piece: Box; frame: FrameKey; artUrl: string }) {
  return (
    <div
      style={{ position: "absolute", left: `${piece.x}%`, top: `${piece.y}%`, width: `${piece.w}%`, height: `${piece.h}%` }}
    >
      <FramedPrint piece={piece} frame={frame} artUrl={artUrl} />
    </div>
  );
}

/** The framed print hanging in a room. `aspect` is the artwork's width / height. */
export function WallMockup({
  scene,
  artUrl,
  aspect,
  frame,
  thumb = false,
}: {
  scene: WallScene;
  artUrl: string;
  aspect: number;
  frame: FrameKey;
  thumb?: boolean;
}) {
  return (
    <div className="relative aspect-square w-full overflow-hidden" style={{ containerType: "inline-size" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sceneImageUrl(scene, thumb ? "thumb" : "full")}
        alt=""
        aria-hidden
        draggable={false}
        loading={thumb ? "lazy" : "eager"}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <PieceAt piece={placed(scene.artBox, aspect)} frame={frame} artUrl={artUrl} />
    </div>
  );
}

/** Product shot on a plain backdrop: the whole framed print, no room. */
export function ProductShot({ artUrl, aspect, frame }: { artUrl: string; aspect: number; frame: FrameKey }) {
  const piece = placed({ left: 0.14, top: 0.14, right: 0.86, bottom: 0.86 }, aspect);
  return (
    <div
      className="relative aspect-square w-full overflow-hidden bg-[#efece6]"
      style={{ containerType: "inline-size" }}
    >
      <PieceAt piece={{ ...piece, y: 50 - piece.h / 2 }} frame={frame} artUrl={artUrl} />
    </div>
  );
}
