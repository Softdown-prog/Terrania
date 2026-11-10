import { ellipse, limb, rgba, shade, TAU } from "../../draw.ts";
export type ColorRamp={base:string;light:string;dark:string;accent:string;eye:string};
export const OUTLINE="#142a2a",GLINT="#fff6dc";
/** Material e geometria; identidade da criatura é composta no seu arquivo. */
export const organic = (ctx: CanvasRenderingContext2D, x: number, y: number,
  rx: number, ry: number, ramp: ColorRamp, turn = 0): void => {
  const gradient = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
  gradient.addColorStop(0, ramp.light);
  gradient.addColorStop(.42, ramp.base);
  gradient.addColorStop(1, ramp.dark);
  ellipse(ctx, x, y, rx, ry, gradient, turn);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, turn, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(GLINT, .37);
  ctx.lineWidth = .95;
  ctx.beginPath(); ctx.ellipse(x - 1.2, y - 1.4, Math.max(1, rx - 2), Math.max(1, ry - 2),
    turn, Math.PI * 1.04, Math.PI * 1.89); ctx.stroke();
};

export const shard = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number,
  rise: number, fill: string, glow = GLINT): void => {
  ctx.fillStyle = OUTLINE; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.25;
  ctx.beginPath(); ctx.moveTo(x - rx, y); ctx.lineTo(x - rx * .38, y - rise * .65);
  ctx.lineTo(x + rx * .13, y - rise); ctx.lineTo(x + rx, y - rise * .1);
  ctx.lineTo(x + rx * .42, y + rx * .35); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(x - rx + 1.5, y - 1); ctx.lineTo(x + rx * .13, y - rise + 2);
  ctx.lineTo(x + rx * .04, y - 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(glow, .7); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - rx * .3, y - rise * .5); ctx.lineTo(x + rx * .13, y - rise + 3); ctx.stroke();
};

export const headEyes = (ctx: CanvasRenderingContext2D, points: readonly (readonly [number,number])[],
  c: ColorRamp, size = 2): void => {
  for (const [x, y] of points) {
    ellipse(ctx, x, y, size + .8, size + .25, OUTLINE);
    ellipse(ctx, x, y - .3, size, size * .62, c.eye);
    ellipse(ctx, x - .45, y - .75, .65, .55, GLINT);
  }
};

export const curvedLeg = (ctx: CanvasRenderingContext2D, x1: number, y1: number,
  x2: number, y2: number, x3: number, y3: number, c: ColorRamp, width = 5): void => {
  limb(ctx, x1, y1, x2, y2, width + 2.5, OUTLINE);
  limb(ctx, x1, y1, x2, y2, width, c.dark);
  limb(ctx, x2, y2, x3, y3, width + 1.8, OUTLINE);
  limb(ctx, x2, y2, x3, y3, width - .7, c.base);
  ellipse(ctx, x2, y2, width * .55, width * .6, c.light);
};

export const carapaceDetail = (ctx: CanvasRenderingContext2D, x: number, y: number,
  rx: number, ry: number, c: ColorRamp, count = 8): void => {
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt((i + .5) / count);
    const px = x + Math.cos(a) * rx * r, py = y + Math.sin(a) * ry * r;
    ellipse(ctx, px, py, 1.2 + i % 3, .7 + i % 2, i % 3 === 0 ? c.accent : shade(c.light, -.28), a);
    ellipse(ctx, px - .6, py - .5, .65, .42, rgba(GLINT, .55));
  }
};
