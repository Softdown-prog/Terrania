/** Leão do Fogo — felino baixo e musculoso, juba em chamas em camadas, focinho largo e cauda de fogo (ADR 0091). */
import type { Palette } from "./geometry.ts";
import { EDGE, GLINT } from "./geometry.ts";
import type { QuadrupedSpec } from "../shared/anatomy/quadruped.ts";
import { ellipse, rgba, shade, TAU } from "../../draw.ts";

export const FIRE_LION_BODY: QuadrupedSpec = {
  torso: { front: 24, rear: -27, withers: -36, back: -33, croup: -35, bellyFront: -19, bellyRear: -25, shoulderX: 14, haunchX: -16, muscle: 9.5 },
  frontLeg: { upper: 11, lower: 11.5, widthTop: 9, widthKnee: 6.4, widthAnkle: 4.8, foot: "paw" },
  rearLeg: { upper: 11.5, lower: 11.5, widthTop: 11.5, widthKnee: 6.6, widthAnkle: 4.8, foot: "paw" },
  frontHipX: 15, rearHipX: -17, hipY: -24, stride: 5.2, lift: 4.6,
};

/** A juba e a cabeça ficam atrás do tronco: nascem nos ombros. */
export const drawFireLionBehind = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  const flame = (cx: number, cy: number, ring: number): void => {
    for (let i = 0; i < 22; i++) {
      const a = i * TAU / 22 + ring * .12, s = ring ? 12 : 17, rx = cx + Math.cos(a) * s, ry = cy + Math.sin(a) * s * .95, sway = Math.sin(time * 4 + i * 1.1 + ring) * 1.6, len = 8 + ring * 3 + sway;
      const g = ctx.createLinearGradient(rx, ry, rx + Math.cos(a) * len, ry + Math.sin(a) * len); g.addColorStop(0, ring ? p.accent : p.dark); g.addColorStop(1, ring ? p.light : p.accent);
      ctx.save(); ctx.translate(rx, ry); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, -3.4 + ring); ctx.quadraticCurveTo(len * .6, -2.4, len, 0); ctx.quadraticCurveTo(len * .6, 2.4, 0, 3.4 - ring); ctx.closePath();
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = ring ? rgba(EDGE, .5) : EDGE; ctx.lineWidth = .9; ctx.stroke(); ctx.restore();
    }
  };
  flame(20, -41, 0); flame(21, -41, 1);
  // cabeça: bochechas largas e focinho que sai da juba
  const face = ctx.createRadialGradient(18, -46, 2, 22, -40, 15); face.addColorStop(0, p.light); face.addColorStop(.6, p.base); face.addColorStop(1, shade(p.dark, .1));
  ctx.fillStyle = face; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(22, -40, 12, 10.5, .05, 0, TAU); ctx.fill(); ctx.stroke();
  for (const s of [-1, 1]) { ctx.fillStyle = shade(p.base, -.1); ctx.beginPath(); ctx.ellipse(22 + s * 8.2, -49.5, 3.6, 3.9, s * .2, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = rgba(p.accent, .8); ctx.beginPath(); ctx.ellipse(22 + s * 8.2, -49.4, 1.6, 2.1, s * .2, 0, TAU); ctx.fill(); }
  const muzzle = ctx.createLinearGradient(16, -39, 30, -32); muzzle.addColorStop(0, shade(p.light, .15)); muzzle.addColorStop(1, p.light);
  ctx.fillStyle = muzzle; ctx.beginPath(); ctx.ellipse(27, -36, 8.4, 5.4, .1, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = EDGE; ctx.beginPath(); ctx.moveTo(30.5, -39.6); ctx.lineTo(35.5, -39); ctx.lineTo(33.4, -35.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = EDGE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(33.4, -35.2); ctx.quadraticCurveTo(31, -32, 27, -32.6); ctx.stroke();
  for (let k = 0; k < 3; k++) { ctx.strokeStyle = rgba(GLINT, .7); ctx.lineWidth = .55; ctx.beginPath(); ctx.moveTo(30, -35.4); ctx.quadraticCurveTo(36, -36.4 + k * 1.8, 41, -38 + k * 3); ctx.stroke(); }
  // olhos de brasa
  for (const [x, y] of [[21, -44], [29, -43.4]] as const) { ellipse(ctx, x, y, 3, 2.2, EDGE); ellipse(ctx, x, y, 2.2, 1.5, "#ffd24a"); ellipse(ctx, x + .2, y, .7, 1.3, EDGE); ellipse(ctx, x - .6, y - .6, .5, .4, GLINT); }
};

export const drawFireLion = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  const flicker = Math.sin(time * 4.7) * .8;
  // cauda: corda de pelo que termina num tufo de fogo
  ctx.strokeStyle = EDGE; ctx.lineWidth = 5.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-26, -29); ctx.bezierCurveTo(-39, -36, -45, -22, -38, -12); ctx.stroke();
  ctx.strokeStyle = p.base; ctx.lineWidth = 3.4; ctx.stroke(); ctx.lineCap = "butt";
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12, r = 4 + (i % 3) * 1.5, x = -38 + Math.cos(a) * r, y = -12 + Math.sin(a) * r + flicker;
    const g = ctx.createLinearGradient(x, y - 5, x, y + 5); g.addColorStop(0, p.light); g.addColorStop(1, p.accent);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, 3, 5.4, 0, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(EDGE, .6); ctx.lineWidth = .7; ctx.stroke(); ctx.restore(); }
  for (let i = 0; i < 7; i++) { const x = -40 + i * 5, y = -19 - Math.sin(time * 2 + i) * 5; ellipse(ctx, x, y, 1.2, .7, rgba(p.accent, .5)); }
};
