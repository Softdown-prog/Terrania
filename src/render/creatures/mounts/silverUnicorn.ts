/** Unicórnio de Prata — porte esguio de cavalo, crina de seda clara, chifre espiralado e brilhos de luz (ADR 0091). */
import type { Palette } from "./geometry.ts";
import { EDGE, GLINT } from "./geometry.ts";
import { drawEquineHead } from "./equineHead.ts";
import { drawMane, drawNeck, type NeckSpec } from "./neck.ts";
import type { QuadrupedSpec } from "../shared/anatomy/quadruped.ts";
import { ellipse, rgba, shade } from "../../draw.ts";

export const SILVER_UNICORN_BODY: QuadrupedSpec = {
  torso: { front: 21, rear: -24, withers: -43, back: -41, croup: -43, bellyFront: -23, bellyRear: -28, shoulderX: 11, haunchX: -13, muscle: 8 },
  frontLeg: { upper: 14.5, lower: 14.5, widthTop: 6.6, widthKnee: 4, widthAnkle: 2.6, foot: "hoof" },
  rearLeg: { upper: 15, lower: 14.5, widthTop: 8.6, widthKnee: 4.2, widthAnkle: 2.6, foot: "hoof" },
  frontHipX: 12, rearHipX: -15, hipY: -28.5, stride: 5.6, lift: 5.4,
};
const NECK: NeckSpec = { baseX: 13, baseY: -33, baseWidth: 15, topX: 26, topY: -55, topWidth: 8, arch: 3 };
const SILK: (p: Palette) => Palette = p => ({ ...p, base: shade(p.light, .1), dark: p.accent, light: "#ffffff" });

export const drawSilverUnicornBehind = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  drawNeck(ctx, p, NECK);
  drawEquineHead(ctx, p, { x: 25, y: -56, time, bridle: false });
  // chifre espiralado saindo da testa
  ctx.save(); ctx.translate(30, -62); ctx.rotate(-.35);
  const horn = ctx.createLinearGradient(-2, 0, 2, -22); horn.addColorStop(0, "#f4f0ff"); horn.addColorStop(.5, "#ffffff"); horn.addColorStop(1, "#cfe0ff");
  ctx.fillStyle = horn; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-2.6, 0); ctx.lineTo(0, -23); ctx.lineTo(2.6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba(p.dark, .5); ctx.lineWidth = .8; for (let i = 0; i < 6; i++) { const y = -3 - i * 3.4, w = 2.4 - i * .3; ctx.beginPath(); ctx.moveTo(-w, y + 1.2); ctx.lineTo(w, y - 1.2); ctx.stroke(); }
  ctx.restore();
  drawMane(ctx, SILK(p), NECK, time, 18, 12);
};

export const drawSilverUnicorn = (ctx: CanvasRenderingContext2D, p: Palette, time: number): void => {
  const silk = SILK(p);
  for (let i = 0; i < 12; i++) { const sway = Math.sin(time * 1.8 + i * .4) * 2.4, sx = -24 - (i % 3) * .5, sy = -41 + i * .5;
    for (const [color, width] of [[EDGE, 3.2], [i % 3 ? silk.dark : "#ffffff", 1.8]] as const) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx - 9, sy + 3, sx - 16 + sway, sy + 13, sx - 12 - (i % 4) + sway * 1.3, sy + 26 + (i % 3) * 2); ctx.stroke(); } }
  ctx.lineCap = "butt";
  for (let i = 0; i < 9; i++) { const a = time * .8 + i * 1.4, x = 6 + Math.cos(a) * 34, y = -42 + Math.sin(a * 1.3) * 16, tw = (Math.sin(time * 3 + i) + 1) / 2;
    ellipse(ctx, x, y, 1.4 + tw, .6 + tw * .6, rgba("#ffffff", .5 + tw * .4)); ctx.strokeStyle = rgba("#ffffff", .3 + tw * .4); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x - 2.4 - tw, y); ctx.lineTo(x + 2.4 + tw, y); ctx.moveTo(x, y - 2.4 - tw); ctx.lineTo(x, y + 2.4 + tw); ctx.stroke(); }
  void GLINT;
};
