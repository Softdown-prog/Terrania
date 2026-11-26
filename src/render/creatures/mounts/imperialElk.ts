/** Alce Imperial — pernas longas, pescoço de cervídeo com papo de pelo e galhada dourada em ramos (ADR 0091). */
import type { Palette } from "./geometry.ts";
import { EDGE, GLINT } from "./geometry.ts";
import { drawNeck, neckTop, type NeckSpec } from "./neck.ts";
import type { QuadrupedSpec } from "./quadruped.ts";
import { ellipse, rgba, shade } from "../../draw.ts";

export const IMPERIAL_ELK_BODY: QuadrupedSpec = {
  torso: { front: 24, rear: -26, withers: -50, back: -47, croup: -48, bellyFront: -27, bellyRear: -32, shoulderX: 13, haunchX: -15, muscle: 8.5 },
  frontLeg: { upper: 17, lower: 17.5, widthTop: 6.8, widthKnee: 3.9, widthAnkle: 2.5, foot: "cloven" },
  rearLeg: { upper: 17.5, lower: 17.5, widthTop: 9, widthKnee: 4.1, widthAnkle: 2.6, foot: "cloven" },
  frontHipX: 14, rearHipX: -17, hipY: -33, stride: 6.5, lift: 6,
};
const NECK: NeckSpec = { baseX: 15, baseY: -38, baseWidth: 14, topX: 31, topY: -66, topWidth: 7, arch: 3 };

export const drawImperialElkBehind = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  drawNeck(ctx, p, NECK);
  // papo de pelo sob o pescoço
  for (let i = 0; i < 9; i++) { const t = .15 + i * .08, [x, y] = neckTop(NECK, t); ctx.strokeStyle = i % 2 ? p.light : shade(p.base, -.2); ctx.lineWidth = 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + 2.5, y + 8 + (1 - t) * 6); ctx.quadraticCurveTo(x + 4, y + 11 + (1 - t) * 6, x + 2 + Math.sin(time * 1.6 + i) * .6, y + 15 + (1 - t) * 6); ctx.stroke(); }
  ctx.lineCap = "butt";
  ctx.save(); ctx.translate(30, -68);
  // galhada: duas hastes com pontas, a de trás mais escura
  for (const [dx, k] of [[-3, -.3], [1, 0]] as const) {
    ctx.strokeStyle = EDGE; ctx.lineWidth = 3.2; ctx.lineCap = "round";
    const beam = (): void => { ctx.beginPath(); ctx.moveTo(dx, -1); ctx.quadraticCurveTo(dx - 8, -14, dx - 4, -26); ctx.stroke(); };
    beam();
    for (const [bx, by, tx, ty] of [[dx - 4, -8, dx + 3, -13], [dx - 5.5, -15, dx + 1, -22], [dx - 4.8, -21, dx - 11, -25]] as const) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + tx) / 2, (by + ty) / 2 - 3, tx, ty); ctx.stroke(); }
    ctx.strokeStyle = shade(p.accent, k); ctx.lineWidth = 1.7;
    beam();
    for (const [bx, by, tx, ty] of [[dx - 4, -8, dx + 3, -13], [dx - 5.5, -15, dx + 1, -22], [dx - 4.8, -21, dx - 11, -25]] as const) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + tx) / 2, (by + ty) / 2 - 3, tx, ty); ctx.stroke(); }
  }
  ctx.lineCap = "butt";
  // orelha larga
  ctx.fillStyle = shade(p.base, -.1); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-12, -3, -13, 3); ctx.quadraticCurveTo(-8, 5, -3, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = rgba(p.accent, .55); ctx.beginPath(); ctx.moveTo(-4, 1); ctx.quadraticCurveTo(-9.6, -.6, -10, 2.4); ctx.quadraticCurveTo(-7, 3.4, -4, 2.4); ctx.closePath(); ctx.fill();
  const head = ctx.createLinearGradient(-4, -3, 18, 12); head.addColorStop(0, p.light); head.addColorStop(.5, p.base); head.addColorStop(1, shade(p.dark, .1));
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.bezierCurveTo(1, -4, 8, -3, 17, 6); ctx.bezierCurveTo(20, 8.5, 19.5, 12.5, 16, 13); ctx.bezierCurveTo(11, 13.5, 6, 11, 2, 9); ctx.bezierCurveTo(-3, 9, -7, 5, -5, 0); ctx.closePath();
  ctx.fillStyle = head; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.3; ctx.stroke();
  ellipse(ctx, 17, 8.8, 2.7, 2.7, shade(p.dark, -.45)); ellipse(ctx, 16.4, 8.1, .8, .6, rgba(GLINT, .6));
  ellipse(ctx, 3.6, 3, 2.5, 2.1, EDGE); ellipse(ctx, 3.5, 2.9, 1.8, 1.5, p.accent); ellipse(ctx, 3.5, 2.9, .8, 1.1, EDGE); ellipse(ctx, 3, 2.3, .5, .45, GLINT);
  ctx.strokeStyle = rgba(GLINT, .5); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-1, -1.5); ctx.bezierCurveTo(5, -2, 11, 0, 16, 5.6); ctx.stroke();
  ctx.restore();
};

export const drawImperialElk = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  ctx.fillStyle = p.light; ctx.strokeStyle = EDGE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-26, -46); ctx.quadraticCurveTo(-31 + Math.sin(time * 2) * .6, -49, -30, -41); ctx.quadraticCurveTo(-28, -40, -25, -42); ctx.closePath(); ctx.fill(); ctx.stroke();
};
