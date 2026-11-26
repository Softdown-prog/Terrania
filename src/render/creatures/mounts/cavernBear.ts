/** Urso-das-Cavernas — ombros maciços, corcova, pelagem de gelo, patas largas com garras e placas de gelo no dorso (ADR 0091). */
import type { Palette } from "./geometry.ts";
import { EDGE, GLINT } from "./geometry.ts";
import type { QuadrupedSpec } from "../shared/anatomy/quadruped.ts";
import { ellipse, rgba, shade, TAU } from "../../draw.ts";

export const CAVERN_BEAR_BODY: QuadrupedSpec = {
  torso: { front: 27, rear: -29, withers: -43, back: -38, croup: -34, bellyFront: -17, bellyRear: -19, shoulderX: 15, haunchX: -17, muscle: 11.5, shaggy: true },
  frontLeg: { upper: 11, lower: 11.5, widthTop: 13, widthKnee: 9.4, widthAnkle: 7, foot: "paw" },
  rearLeg: { upper: 11, lower: 11.5, widthTop: 14, widthKnee: 9.6, widthAnkle: 7.2, foot: "paw" },
  frontHipX: 16, rearHipX: -19, hipY: -25, stride: 4.6, lift: 4.2,
};

export const drawCavernBearBehind = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  // pescoço grosso fundido na corcova
  const neck = ctx.createLinearGradient(14, -48, 34, -26); neck.addColorStop(0, p.light); neck.addColorStop(1, p.base);
  ctx.fillStyle = neck; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(10, -43); ctx.bezierCurveTo(20, -49, 32, -45, 36, -34); ctx.bezierCurveTo(37, -26, 28, -24, 18, -28); ctx.closePath(); ctx.fill(); ctx.stroke();
  // cabeça baixa de plantígrado: crânio largo, focinho claro
  ctx.save(); ctx.translate(33, -33);
  for (const s of [-1, 1]) { ctx.fillStyle = shade(p.base, -.05); ctx.beginPath(); ctx.ellipse(s * 3 - 1, -10, 4.4, 4.6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = rgba(p.dark, .75); ctx.beginPath(); ctx.ellipse(s * 3 - 1, -9.7, 2.1, 2.9, 0, 0, TAU); ctx.fill(); }
  const skull = ctx.createRadialGradient(-2, -5, 2, 0, 0, 14); skull.addColorStop(0, p.light); skull.addColorStop(.6, p.base); skull.addColorStop(1, shade(p.dark, .1));
  ctx.fillStyle = skull; ctx.beginPath(); ctx.ellipse(0, -2, 10.5, 9.5, .1, 0, TAU); ctx.fill(); ctx.stroke();
  const snout = ctx.createLinearGradient(2, 0, 16, 6); snout.addColorStop(0, shade(p.light, .15)); snout.addColorStop(1, p.light);
  ctx.fillStyle = snout; ctx.beginPath(); ctx.ellipse(8, 3, 8.2, 5.2, .22, 0, TAU); ctx.fill(); ctx.stroke();
  ellipse(ctx, 15, 1.4, 3.4, 2.5, EDGE); ellipse(ctx, 14.2, .6, 1.2, .7, rgba(GLINT, .8));
  ctx.strokeStyle = EDGE; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(8, 7.4); ctx.quadraticCurveTo(12, 9.4 + Math.sin(time * 1.1) * .4, 16, 6); ctx.stroke();
  ctx.fillStyle = "#f4f6f4"; ctx.strokeStyle = EDGE; ctx.lineWidth = .6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(8.5 + i * 2.2, 7.8 - i * .3); ctx.lineTo(9.3 + i * 2.2, 11.2 - i * .3); ctx.lineTo(10.2 + i * 2.2, 7.6 - i * .3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ellipse(ctx, 3.6, -2.6, 2.4, 2, EDGE); ellipse(ctx, 3.5, -2.7, 1.7, 1.4, p.accent); ellipse(ctx, 3.6, -2.7, .8, 1, EDGE); ellipse(ctx, 3, -3.3, .5, .4, GLINT);
  ctx.restore();
};

export const drawCavernBear = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  // placas de gelo cravadas no dorso e no flanco
  for (let i = 0; i < 12; i++) {
    const t = i / 11, x = -22 + t * 36, y = -37 - Math.sin(t * Math.PI) * 3.5 - (t > .55 ? 2.4 : 0) + (i % 2) * 1.2, h = 7 + (i % 3) * 2.2, tilt = -.2 + (i % 3) * .12;
    const g = ctx.createLinearGradient(x, y, x + 4, y - h); g.addColorStop(0, p.accent); g.addColorStop(1, "#ffffff");
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.beginPath(); ctx.moveTo(-2.4, 0); ctx.lineTo(-.8, -h); ctx.lineTo(2.8, -h * .62); ctx.lineTo(3.4, 0); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = shade(p.dark, -.1); ctx.lineWidth = .8; ctx.stroke();
    ctx.strokeStyle = rgba("#ffffff", .8); ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(-.8, -1.2); ctx.lineTo(-.4, -h + 1.4); ctx.stroke(); ctx.restore();
  }
  // cotoco de rabo e bafo gelado
  ellipse(ctx, -29, -31, 3.6, 3.2, p.base); ctx.strokeStyle = EDGE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(-29, -31, 3.6, 3.2, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < 4; i++) { const k = (time * .8 + i * .25) % 1; ellipse(ctx, 50 + k * 8, -28 - k * 7, 1.4 + k * 2.6, 1 + k * 1.8, rgba("#e8f6ff", (1 - k) * .55)); }
};
