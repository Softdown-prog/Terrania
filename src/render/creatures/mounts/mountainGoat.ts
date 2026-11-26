/** Cabra-da-Montanha — corpo compacto e peludo, casco fendido, chifres em anéis, barba e olho de pupila horizontal (ADR 0091). */
import type { Palette } from "./geometry.ts";
import { EDGE, GLINT } from "./geometry.ts";
import { drawNeck, type NeckSpec } from "./neck.ts";
import type { QuadrupedSpec } from "../shared/anatomy/quadruped.ts";
import { ellipse, rgba, shade } from "../../draw.ts";

export const MOUNTAIN_GOAT_BODY: QuadrupedSpec = {
  torso: { front: 20, rear: -20, withers: -35, back: -34, croup: -35, bellyFront: -18, bellyRear: -22, shoulderX: 10, haunchX: -11, muscle: 8, shaggy: true },
  frontLeg: { upper: 10, lower: 10.5, widthTop: 7, widthKnee: 4.2, widthAnkle: 2.9, foot: "cloven" },
  rearLeg: { upper: 10.5, lower: 10.5, widthTop: 9, widthKnee: 4.4, widthAnkle: 2.9, foot: "cloven" },
  frontHipX: 11, rearHipX: -12, hipY: -23, stride: 4.6, lift: 4.2,
};
const NECK: NeckSpec = { baseX: 13, baseY: -27, baseWidth: 15, topX: 23, topY: -44, topWidth: 10, arch: 1 };

export const drawMountainGoatBehind = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  drawNeck(ctx, p, NECK);
  // pelo do pescoço: tufos escuros e claros que caem para trás
  for (let i = 0; i < 12; i++) { const t = i / 11, x = 14 + t * 9, y = -29 - t * 14 - 4 + Math.sin(i) * .6, sway = Math.sin(time * 1.6 + i) * .8;
    ctx.strokeStyle = i % 2 ? p.dark : p.light; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3.6 + sway, y + 4.4); ctx.stroke(); }
  ctx.lineCap = "butt";
  ctx.save(); ctx.translate(23, -45);
  // chifres: dois arcos para trás com anéis de crescimento
  for (const [dx, shadeK] of [[-2.5, -.3], [1.5, 0]] as const) {
    for (let k = 0; k < 9; k++) { const t = k / 8, x = dx - t * 9 - Math.sin(t * 2.2) * 1.6, y = -2 - t * 9 + t * t * 5, w = 3.4 - t * 2.2;
      ctx.fillStyle = shade(p.accent, shadeK + t * .15); ctx.strokeStyle = EDGE; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(x, y, w * .9, w, -.5 + t, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
  const head = ctx.createLinearGradient(-4, -3, 12, 12); head.addColorStop(0, p.light); head.addColorStop(.5, p.base); head.addColorStop(1, shade(p.dark, .1));
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.bezierCurveTo(-1, -4, 5, -3, 12, 5); ctx.bezierCurveTo(14.5, 7.5, 13.5, 11, 10, 11.5); ctx.bezierCurveTo(6, 12, 3, 10, 0, 8); ctx.bezierCurveTo(-4, 8, -7, 4, -5, 0); ctx.closePath();
  ctx.fillStyle = head; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.3; ctx.stroke();
  ellipse(ctx, 11.3, 7.4, 2, 1.6, shade(p.light, .05)); ellipse(ctx, 12.4, 6.6, 1, .7, EDGE);
  // orelha de lado
  ctx.fillStyle = shade(p.base, -.2); ctx.beginPath(); ctx.moveTo(-3, 1); ctx.quadraticCurveTo(-9, -1, -10, 3); ctx.quadraticCurveTo(-6, 4, -3, 3.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  // olho de pupila horizontal
  ellipse(ctx, 3.8, 2.6, 2.3, 1.9, EDGE); ellipse(ctx, 3.7, 2.5, 1.7, 1.4, "#d8c46a"); ctx.fillStyle = EDGE; ctx.beginPath(); ctx.ellipse(3.7, 2.5, 1.3, .45, 0, 0, Math.PI * 2); ctx.fill(); ellipse(ctx, 3.1, 2, .45, .4, GLINT);
  // barba
  for (let i = 0; i < 6; i++) { ctx.strokeStyle = i % 2 ? p.light : p.dark; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(7 + i * .6, 10.6); ctx.quadraticCurveTo(6.4 + i * .5, 13.5, 5.6 + i * .6 + Math.sin(time * 2 + i) * .5, 16.4 + (i % 3)); ctx.stroke(); }
  ctx.strokeStyle = rgba(GLINT, .5); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-1, -1.4); ctx.bezierCurveTo(3, -2, 8, 0, 11, 4.5); ctx.stroke();
  ctx.restore();
};

export const drawMountainGoat = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  // rabinho curto e empinado
  const flick = Math.sin(time * 3) * .8;
  ctx.fillStyle = p.light; ctx.strokeStyle = EDGE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-20, -33); ctx.quadraticCurveTo(-25, -37 + flick, -26, -32); ctx.quadraticCurveTo(-23, -31, -20, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
};
