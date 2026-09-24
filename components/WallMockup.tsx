import type { CSSProperties } from "react";

import { FRAME_FACE_IN, FRAME_REBATE_IN, type FrameKey, type PrintSize } from "@/lib/print-catalog";
import { sceneImageUrl, type WallScene } from "@/lib/wall-scenes";

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

/** The physical product in inches, straight from the selected Prodigi size: the
 *  artwork printed edge to edge at the glass size, moulding around the outside. */
export type PrintGeometry = Pick<PrintSize, "widthIn" | "heightIn">;

type Box = { x: number; y: number; w: number; h: number };

function outerInches(g: PrintGeometry) {
  const extra = 2 * (FRAME_FACE_IN - FRAME_REBATE_IN);
  return { w: g.widthIn + extra, h: g.heightIn + extra };
}

/** The framed print drawn at its real proportions, filling its parent. `piece`
 *  is in the square's 0–100 units, so `cqw` shadows scale with the picture. */
function FramedPrint({ piece, g, frame, artUrl }: { piece: Box; g: PrintGeometry; frame: FrameKey; artUrl: string }) {
  const outer = outerInches(g);
  const unit = piece.w / outer.w; // square units per inch
  const pctX = (inches: number) => `${(inches / outer.w) * 100}%`;
  const pctY = (inches: number) => `${(inches / outer.h) * 100}%`;
  const cq = (inches: number) => `${inches * unit}cqw`;
  const rect = (w: number, h: number): CSSProperties => ({
    position: "absolute",
    left: pctX((outer.w - w) / 2),
    top: pctY((outer.h - h) / 2),
    width: pctX(w),
    height: pctY(h),
  });
  const visible = { w: outer.w - 2 * FRAME_FACE_IN, h: outer.h - 2 * FRAME_FACE_IN };

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background: FRAME_FINISH[frame],
        boxShadow: `${cq(0.15)} ${cq(0.5)} ${cq(1.2)} rgba(0,0,0,0.32), 0 ${cq(0.08)} ${cq(0.2)} rgba(0,0,0,0.3)`,
      }}
    >
      {/* The artwork, printed to fill the glass (the moulding's rebate hides the
          outer 5mm), shaded by the moulding's inner edge. */}
      <div
        style={{
          ...rect(visible.w, visible.h),
          backgroundImage: `url("${artUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: `inset ${cq(0.06)} ${cq(0.1)} ${cq(0.2)} rgba(0,0,0,0.3)`,
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

/** Fits the framed piece (its real outer shape) inside a box, resting on the bottom edge. */
function placed(box: WallScene["artBox"], g: PrintGeometry, centreVertically = false): Box {
  const outer = outerInches(g);
  const boxW = (box.right - box.left) * 100;
  const boxH = (box.bottom - box.top) * 100;
  const scale = Math.min(boxW / outer.w, boxH / outer.h);
  const w = outer.w * scale;
  const h = outer.h * scale;
  const y = centreVertically ? box.top * 100 + (boxH - h) / 2 : box.bottom * 100 - h;
  return { x: box.left * 100 + (boxW - w) / 2, y, w, h };
}

function PieceAt({ piece, g, frame, artUrl }: { piece: Box; g: PrintGeometry; frame: FrameKey; artUrl: string }) {
  return (
    <div
      style={{ position: "absolute", left: `${piece.x}%`, top: `${piece.y}%`, width: `${piece.w}%`, height: `${piece.h}%` }}
    >
      <FramedPrint piece={piece} g={g} frame={frame} artUrl={artUrl} />
    </div>
  );
}

/** The framed print hanging in a room. */
export function WallMockup({
  scene,
  artUrl,
  geometry,
  frame,
  thumb = false,
}: {
  scene: WallScene;
  artUrl: string;
  geometry: PrintGeometry;
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
      <PieceAt piece={placed(scene.artBox, geometry)} g={geometry} frame={frame} artUrl={artUrl} />
    </div>
  );
}

/** Product shot on a plain backdrop: the whole framed print, no room. */
export function ProductShot({ artUrl, geometry, frame }: { artUrl: string; geometry: PrintGeometry; frame: FrameKey }) {
  const piece = placed({ left: 0.14, top: 0.14, right: 0.86, bottom: 0.86 }, geometry, true);
  return (
    <div
      className="relative aspect-square w-full overflow-hidden bg-[#efece6]"
      style={{ containerType: "inline-size" }}
    >
      <PieceAt piece={piece} g={geometry} frame={frame} artUrl={artUrl} />
    </div>
  );
}
