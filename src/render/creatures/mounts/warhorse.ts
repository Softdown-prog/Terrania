/** Cavalo de Batalha — anatomia equina: tronco com volume, pernas articuladas, pescoço arqueado, crina e cauda em mechas (ADR 0091). */
import type { Palette } from "./geometry.ts";
import { EDGE } from "./geometry.ts";
import { drawEquineHead } from "./equineHead.ts";
import { drawMane, drawNeck, type NeckSpec } from "./neck.ts";
import type { QuadrupedSpec } from "../shared/anatomy/quadruped.ts";
import { shade } from "../../draw.ts";

export const WARHORSE_BODY: QuadrupedSpec = {
  torso: { front: 22, rear: -25, withers: -45, back: -43, croup: -45, bellyFront: -24, bellyRear: -29, shoulderX: 12, haunchX: -14, muscle: 9 },
  frontLeg: { upper: 15, lower: 15, widthTop: 7.5, widthKnee: 4.6, widthAnkle: 3, foot: "hoof" },
  rearLeg: { upper: 15.5, lower: 15, widthTop: 10, widthKnee: 4.8, widthAnkle: 3, foot: "hoof" },
  frontHipX: 13, rearHipX: -16, hipY: -30, stride: 6, lift: 5.5,
};
const NECK: NeckSpec = { baseX: 14, baseY: -34, baseWidth: 17, topX: 28, topY: -57, topWidth: 8.5, arch: 2.5 };

/** O que fica atrás do tronco: pescoço, crina e cabeça. */
export const drawWarhorseBehind = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  drawNeck(ctx, p, NECK);
  drawEquineHead(ctx, p, { x: 27, y: -58, time });
  drawMane(ctx, p, NECK, time, 17, 10);
};

/** O que fica na frente: a cauda, em mechas independentes que balançam. */
export const drawWarhorse = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  for (let i = 0; i < 12; i++) {
    const sway = Math.sin(time * 2 + i * .35) * 2.2, sx = -24 - (i % 3) * .5, sy = -42 + i * .5;
    for (const [color, width] of [[EDGE, 3.4], [i % 3 ? p.dark : shade(p.dark, .35), 2]] as const) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx - 9, sy + 4, sx - 15 + sway, sy + 14, sx - 11 - (i % 4) + sway * 1.3, sy + 27 + (i % 3) * 2); ctx.stroke();
    }
  }
  ctx.lineCap = "butt";
};
