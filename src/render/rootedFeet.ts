/**
 * As raízes que prendem os pés do herói enraizado (ADR 0094): cinco raízes que brotam do chão em volta dos pés, sobem em espiral até as botas, com casca em dois tons,
 * radículas finas, musgo, folhinhas e um respingo de terra. Crescem nos primeiros instantes e murcham nos últimos (`seconds` é o que falta do efeito), e balançam de leve.
 * Só desenho: quem prende é o status `root` do `Player`.
 */
import { ellipse, rgba } from "./draw.ts";

const BARK = "#6b4a2e", BARK_LIGHT = "#b08552", BARK_DARK = "#271a0d", MOSS = "#6fa84a", LEAF = "#a8d078", SOIL = "#3b2a1c", GLOW = "#c8f06a";

export function renderRootedFeet(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, seconds: number): void {
  if (!(seconds > 0) || !Number.isFinite(seconds) || !Number.isFinite(time)) return;
  const grow = Math.min(1, (2.6 - Math.min(2.6, seconds)) * 5 + .25), fade = Math.min(1, seconds * 2.4), a = Math.max(0, Math.min(1, grow)) * fade;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a;
  const soil = ctx.createRadialGradient(0, 2, 1, 0, 2, 17); soil.addColorStop(0, rgba(SOIL, .7)); soil.addColorStop(1, rgba(SOIL, 0));
  ellipse(ctx, 0, 2, 17, 6, soil);
  for (let k = 0; k < 5; k++) {
    const side = k % 2 ? 1 : -1, ang = (k - 2) * .62, sway = Math.sin(time * 2.2 + k * 1.7) * 1.1;
    const bx = Math.sin(ang) * 15, by = 2 + Math.cos(ang) * 3.4, tx = Math.sin(ang) * 5 + sway, ty = -9 - (k % 2) * 3;
    for (const [w, color] of [[3.6, BARK_DARK], [2.4, BARK]] as const) {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.bezierCurveTo(bx - side * 5, by - 8 * grow, tx + side * 6, ty + 5, tx, ty * Math.max(.4, grow)); ctx.stroke();
    }
    ctx.strokeStyle = rgba(BARK_LIGHT, .7); ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(bx, by - .8); ctx.bezierCurveTo(bx - side * 5, by - 8.8 * grow, tx + side * 6, ty + 4.2, tx, ty * Math.max(.4, grow) - .8); ctx.stroke();
    ellipse(ctx, tx, ty * Math.max(.4, grow), 1.3, 1, k % 2 ? MOSS : LEAF);
    ctx.strokeStyle = rgba(BARK_DARK, .8); ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + side * 3, by + 2, bx + side * 6, by + 1.6); ctx.stroke();
  }
  for (let k = 0; k < 3; k++) ellipse(ctx, -9 + k * 9 + Math.sin(time * 5 + k) * .6, -1 - k % 2, 1.1, .8, rgba(GLOW, .55));
  ctx.restore();
}
