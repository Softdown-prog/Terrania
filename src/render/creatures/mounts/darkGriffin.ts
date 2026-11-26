/** Grifo-Sombrio — corpo de leão, patas dianteiras de ave de rapina com garras, asas de penas articuladas, cabeça de águia e cauda felina (ADR 0091). */
import type { Palette } from "./geometry.ts";
import { EDGE, GLINT } from "./geometry.ts";
import type { QuadrupedSpec } from "./quadruped.ts";
import { ellipse, rgba, shade, TAU } from "../../draw.ts";

export const DARK_GRIFFIN_BODY: QuadrupedSpec = {
  torso: { front: 23, rear: -26, withers: -40, back: -37, croup: -37, bellyFront: -20, bellyRear: -25, shoulderX: 13, haunchX: -15, muscle: 9 },
  frontLeg: { upper: 12, lower: 12, widthTop: 8.4, widthKnee: 5.2, widthAnkle: 3.8, foot: "paw" },
  rearLeg: { upper: 12, lower: 11.5, widthTop: 11, widthKnee: 6, widthAnkle: 4.4, foot: "paw" },
  frontHipX: 14, rearHipX: -17, hipY: -26, stride: 5, lift: 4.8,
};

/** Asas atrás do tronco, no dorso, e a cabeça de águia no pescoço de penas. */
/** Uma asa vista de lado: braço do dorso ao pulso, e as penas primárias saindo em leque do pulso para trás, com as coberteiras por cima. A asa distante vem mais escura e deslocada. */
function wing(ctx: CanvasRenderingContext2D, p: Palette, flap: number, near: boolean): void {
  const k = near ? 0 : -.32, ox = near ? 0 : -9, oy = near ? 0 : -4;
  const root = [-6 + ox, -40 + oy] as const, wrist = [8 + ox, -60 + oy + flap * .5] as const;
  for (let i = 0; i < 9; i++) {
    const t = i / 8, bx = wrist[0] - t * 9, by = wrist[1] + t * 17, len = 34 - t * 12, ang = -3.0 + t * .6 + flap * .012;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, shade(p.accent, k)); g.addColorStop(.5, shade(p.base, k)); g.addColorStop(1, shade(p.dark, k));
    ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.quadraticCurveTo(len * .6, -3.6, len, 0); ctx.quadraticCurveTo(len * .6, 3.6, 0, 2.6); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = .9; ctx.stroke();
    ctx.strokeStyle = rgba(GLINT, .4); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(2, -.4); ctx.lineTo(len - 2, -.2); ctx.stroke(); ctx.restore();
  }
  for (let i = 0; i < 7; i++) {
    const t = i / 6, bx = wrist[0] - t * 9 + 1, by = wrist[1] + t * 17 + 1, len = 15 - t * 4, ang = -2.9 + t * .55;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(ang); ctx.beginPath(); ctx.ellipse(len / 2, 0, len / 2, 3.2, 0, 0, TAU); ctx.fillStyle = shade(p.light, k - .05 * (i % 2)); ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = .8; ctx.stroke(); ctx.restore();
  }
  ctx.strokeStyle = EDGE; ctx.lineWidth = 5.4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(root[0], root[1]); ctx.quadraticCurveTo(root[0] + 9, root[1] - 10, wrist[0], wrist[1]); ctx.stroke();
  ctx.strokeStyle = shade(p.base, k); ctx.lineWidth = 3.4; ctx.stroke(); ctx.lineCap = "butt";
  ellipse(ctx, wrist[0], wrist[1], 3, 3, shade(p.light, k)); ctx.strokeStyle = EDGE; ctx.lineWidth = .9; ctx.beginPath(); ctx.arc(wrist[0], wrist[1], 3, 0, TAU); ctx.stroke();
}

/** Asas atrás do tronco, no dorso, e a cabeça de águia no pescoço de penas. */
export const drawDarkGriffinBehind = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  const flap = Math.sin(time * 2.8) * 3;
  wing(ctx, p, flap, false);
  wing(ctx, p, flap, true);
  // pescoço de penas e cabeça de águia
  for (let i = 0; i < 11; i++) { const t = i / 10, x = 15 + t * 11, y = -33 - t * 15 + Math.sin(i) * .6;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.5); ctx.beginPath(); ctx.ellipse(0, 0, 5.4, 3.2, 0, 0, TAU); ctx.fillStyle = i % 2 ? p.light : shade(p.light, -.12); ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = .9; ctx.stroke(); ctx.restore(); }
  const head = ctx.createRadialGradient(24, -52, 2, 27, -48, 12); head.addColorStop(0, "#ffffff"); head.addColorStop(.5, shade(p.light, .1)); head.addColorStop(1, p.base);
  ctx.fillStyle = head; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(26, -49, 9, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? p.dark : p.accent; ctx.beginPath(); ctx.moveTo(20 + i * 2, -56); ctx.lineTo(16 + i * 2.4 - 1, -63 - (i % 2) * 2); ctx.lineTo(23 + i * 2, -56.6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  const beak = ctx.createLinearGradient(30, -52, 44, -38); beak.addColorStop(0, "#ffe9a8"); beak.addColorStop(1, p.accent);
  ctx.fillStyle = beak; ctx.beginPath(); ctx.moveTo(30, -53); ctx.quadraticCurveTo(40, -55, 45, -44); ctx.quadraticCurveTo(46, -41, 43.6, -39.6); ctx.quadraticCurveTo(41, -43, 36, -44); ctx.lineTo(31, -42.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = shade(p.dark, -.2); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(31, -45.4); ctx.quadraticCurveTo(38, -46.4, 42, -41.6); ctx.stroke(); ellipse(ctx, 35.6, -50, 1.1, .7, EDGE);
  ellipse(ctx, 28, -52, 3.1, 2.7, EDGE); ellipse(ctx, 28, -52, 2.3, 2, "#ffcf3a"); ellipse(ctx, 28.2, -52, .9, 1.6, EDGE); ellipse(ctx, 27.4, -52.8, .6, .5, GLINT);
  ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(24.4, -55.6); ctx.quadraticCurveTo(28, -57.6, 31.4, -55); ctx.stroke();
};

export const drawDarkGriffin = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  // cauda felina com leque de penas
  ctx.strokeStyle = EDGE; ctx.lineWidth = 4.4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-26, -32); ctx.bezierCurveTo(-37, -38, -43, -22, -39, -12); ctx.stroke();
  ctx.strokeStyle = p.base; ctx.lineWidth = 2.6; ctx.stroke(); ctx.lineCap = "butt";
  for (let i = 0; i < 7; i++) { const a = -1.9 + i * .5 + Math.sin(time * 1.6) * .06; ctx.save(); ctx.translate(-39, -12); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 6.6, 2.4, 6.6, 0, 0, TAU); ctx.fillStyle = i % 2 ? p.dark : p.accent; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = .8; ctx.stroke(); ctx.restore(); }
};
