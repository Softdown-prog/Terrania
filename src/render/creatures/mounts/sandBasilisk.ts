/**
 * Lagarto das Areias — montaria reptiliana, NÃO um cavalo re-colorido (ADR 0091). Corpo baixo e longo sobre quatro pernas dobradas (articuladas como as das outras
 * montarias, com garras), carapaça de escamas com direção, crista de espinhos, golas, cabeça de lagarto de mandíbula móvel e a sela comum.
 */
import type { Palette } from "./geometry.ts";
import { drawLeg, legPose, type LegSpec } from "../shared/anatomy/limbs.ts";
import type { MountGaitState } from "../shared/anatomy/gait.ts";
import { drawSaddle } from "./saddle.ts";
import { drawTorso, torsoPath, type TorsoSpec } from "../shared/anatomy/torso.ts";
import { ellipse, rgba } from "../../draw.ts";

export const SAND_BASILISK_TORSO: TorsoSpec = { front: 25, rear: -29, withers: -33, back: -31, croup: -28, bellyFront: -15, bellyRear: -16, shoulderX: 14, haunchX: -17, muscle: 8 };
const C = {
  deep: "#2c4238", base: "#83995f", lit: "#c3d7a1", gold: "#d6aa6d", copper: "#b87942", leather: "#774c36", bone: "#efe0b5", black: "#202c2b", lime: "#b6d15b", mud: "#776b50", glint: "#fff3d6",
} as const;
const PALETTE: Palette = { base: C.base, dark: C.deep, light: C.lit, accent: C.gold, tack: C.leather };

/** Quatro pernas dobradas de réptil, em diagonais. */
function legs(ctx: CanvasRenderingContext2D, time: number, far: boolean, gait?: MountGaitState): void {
  for (const [hipX, front, offset] of [[15, true, far ? Math.PI : 0], [-18, false, far ? 0 : Math.PI]] as const) {
    const spec: LegSpec = { hipX: hipX + (far ? -2 : 0), hipY: -19, upper: 9, lower: 10.5, widthTop: front ? 8 : 10, widthKnee: 5, widthAnkle: 3.8, front, far, foot: "paw", stride: 5 * (gait?.moving ?? 1), lift: 4.2 * (gait?.moving ?? 1) };
    drawLeg(ctx, PALETTE, spec, legPose(spec, (gait ? gait.phase : time * 3.3) + offset));
  }
}
function scales(ctx: CanvasRenderingContext2D): void {
  ctx.save(); torsoPath(ctx, SAND_BASILISK_TORSO); ctx.clip();
  for (let row = 0; row < 6; row++) for (let col = 0; col < 13; col++) {
    const x = -30 + col * 4.7 + row % 2 * 2.2, y = -38 + row * 4.2;
    ctx.fillStyle = (row + col) % 4 === 0 ? C.lit : (row + col) % 3 === 0 ? C.gold : C.base;
    ctx.strokeStyle = rgba(C.deep, .6); ctx.lineWidth = .6;
    ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 1, y - 4); ctx.lineTo(x + 3.4, y - 1); ctx.lineTo(x, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(C.glint, .4); ctx.lineWidth = .4; ctx.beginPath(); ctx.moveTo(x - 1.3, y - 1.5); ctx.lineTo(x + .6, y - 2.5); ctx.stroke();
  }
  ctx.restore();
}
function crest(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < 13; i++) {
    const t = i / 12, x = -26 + t * 48, y = -32 - Math.sin(t * Math.PI) * 1.8 + (t < .15 ? 1.5 : 0);
    ctx.fillStyle = i % 3 === 0 ? C.gold : C.lit; ctx.strokeStyle = C.deep; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(x - 3, y + 1); ctx.lineTo(x, y - 6.4 - Math.sin(time * .8 + i) * .3); ctx.lineTo(x + 3.6, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(C.glint, .6); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x - .4, y - 4); ctx.lineTo(x + 1.6, y); ctx.stroke();
  }
}
function tail(ctx: CanvasRenderingContext2D, time: number): void {
  const sway = Math.sin(time * 1.6) * 2.4;
  const g = ctx.createLinearGradient(-30, -26, -62, -14); g.addColorStop(0, C.base); g.addColorStop(1, C.deep);
  ctx.fillStyle = g; ctx.strokeStyle = C.black; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-27, -29); ctx.bezierCurveTo(-42, -31, -54, -24 + sway, -66, -14 + sway); ctx.bezierCurveTo(-54, -17 + sway, -42, -17, -27, -19); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 6; i++) { const x = -34 - i * 5.4, y = -26.4 + i * .8 + sway * i / 6; ctx.fillStyle = i % 2 ? C.lit : C.gold; ctx.beginPath(); ctx.moveTo(x - 2.4, y + .6); ctx.lineTo(x, y - 4 + i * .3); ctx.lineTo(x + 2.4, y + .6); ctx.closePath(); ctx.fill(); }
}
function head(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save(); ctx.translate(6, 9);
  const g = ctx.createLinearGradient(14, -64, 39, -33); g.addColorStop(0, C.lit); g.addColorStop(.6, C.base); g.addColorStop(1, C.deep);
  ctx.fillStyle = g; ctx.strokeStyle = C.black; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(14, -39); ctx.quadraticCurveTo(10, -55, 21, -60); ctx.quadraticCurveTo(34, -62, 33, -52); ctx.lineTo(43, -45); ctx.lineTo(38, -38); ctx.quadraticCurveTo(22, -34, 14, -39); ctx.closePath(); ctx.fill(); ctx.stroke();
  const jaw = Math.sin(time * 1.2) * .4;
  ctx.fillStyle = C.deep; ctx.beginPath(); ctx.moveTo(27, -42); ctx.lineTo(39, -42 + jaw); ctx.lineTo(36, -38); ctx.lineTo(27, -39); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 4; i++) { ctx.fillStyle = C.bone; ctx.beginPath(); ctx.moveTo(27 + i * 3, -41); ctx.lineTo(28 + i * 3, -37); ctx.lineTo(30 + i * 3, -41); ctx.closePath(); ctx.fill(); }
  ellipse(ctx, 28, -52, 4.1, 3.1, C.black); ellipse(ctx, 28.4, -52.4, 2.2, 1.9, C.gold); ellipse(ctx, 29, -52.6, .5, 1.65, C.black); ellipse(ctx, 27.7, -53.4, .8, .7, C.glint);
  ctx.strokeStyle = C.deep; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(23, -57); ctx.quadraticCurveTo(29, -60, 33, -56); ctx.stroke();
  ellipse(ctx, 40, -47, 1.4, .8, C.black); ellipse(ctx, 39.6, -47.3, .4, .3, C.glint);
  for (const side of [-1, 1]) {
    const flutter = Math.sin(time * 2.2 + side * .7) * .6;
    for (let i = 0; i < 6; i++) { const t = i / 5, x = 14 + t * 12, y = -40 - t * 13 + flutter; ctx.fillStyle = i % 2 ? C.lime : C.gold; ctx.strokeStyle = C.deep; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(x - 3, y + 5); ctx.lineTo(x + side * 4, y - 8); ctx.lineTo(x + 4, y + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  ctx.restore();
}
function sandTrail(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < 16; i++) ellipse(ctx, -36 + i * 3.8, Math.sin(time * 1.2 + i) * 2 + 2, 1.7 + i % 3 * .4, .7, rgba(i % 2 ? C.mud : C.gold, (1 - i / 16) * .25));
}
export function renderSandBasiliskDetail(ctx: CanvasRenderingContext2D, time: number, gait?: MountGaitState): void {
  legs(ctx, time, true, gait);
  tail(ctx, time);
  drawTorso(ctx, PALETTE, SAND_BASILISK_TORSO);
  scales(ctx);
  crest(ctx, time);
  legs(ctx, time, false, gait);
  head(ctx, time);
  drawSaddle(ctx, PALETTE, SAND_BASILISK_TORSO);
  sandTrail(ctx, time);
}
