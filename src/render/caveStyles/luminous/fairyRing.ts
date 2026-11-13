import { ellipse, mix, rgba, shade, softShadow } from "../../draw.ts";
import { hash2 } from "../../../world/random.ts";
import type { CaveTheme } from "../../../world/caves.ts";
import { luminousPalette } from "./palette.ts";
import { blobPath, poolParams } from "./poolShape.ts";
import { poolHalo } from "./poolHalo.ts";

const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

/**
 * Círculo de cogumelos (ADR 0052): uma roda de cogumelinhos brilhantes em volta de um chão de musgo apagado, com esporos
 * no ar no meio. Quantidade (8 a 11), tamanho e posição de cada um saem da variação; os de trás são pintados primeiro.
 */
export function drawFairyRing(ctx: CanvasRenderingContext2D, theme: CaveTheme,
  sx: number, sy: number, variation = 0.5): void {
  const p = luminousPalette(theme), shape = poolParams(variation);
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : 0.5)), key = Math.floor(v * 100000);
  const r = (i: number): number => hash2(key, i, 9203);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(1.15 + shape.size * 0.35, 1.15 + shape.size * 0.35);
  softShadow(ctx, 0, 2, 13, 5, 0.18);
  poolHalo(p.accent, 0.7, ctx);
  // chão de musgo apagado, mais claro no centro
  const moss = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
  moss.addColorStop(0, rgba(mix(p.accent, p.ground, 0.55), 0.55));
  moss.addColorStop(1, rgba(shade(p.ground, -0.3), 0.45));
  blobPath(shape, ctx, 0.95);
  ctx.fillStyle = moss;
  ctx.fill();
  // a roda de cogumelos, de trás para a frente
  const count = 8 + Math.floor(r(0) * 4);
  const ring = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + r(1) * 6.28;
    return { x: Math.cos(a) * (9.5 + r(20 + i) * 2.5), y: Math.sin(a) * (5.2 + r(40 + i) * 1.4), s: 0.7 + r(60 + i) * 0.6 };
  }).sort((a, b) => a.y - b.y);
  for (const m of ring) {
    const h = 4.4 * m.s, w = 5 * m.s;
    ctx.fillStyle = mix(p.light, GLINT, 0.4);
    ctx.fillRect(m.x - w * 0.12, m.y - h, w * 0.24, h);
    const cap = ctx.createRadialGradient(m.x - w * 0.2, m.y - h - w * 0.2, 0.5, m.x, m.y - h, w * 0.7);
    cap.addColorStop(0, mix(p.accent, GLINT, 0.55));
    cap.addColorStop(1, shade(p.accent, -0.35));
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y - h, w * 0.55, w * 0.38, 0, Math.PI, Math.PI * 2);
    ctx.quadraticCurveTo(m.x, m.y - h + w * 0.2, m.x - w * 0.55, m.y - h);
    ctx.fill();
    ctx.strokeStyle = rgba(OUTLINE, 0.6);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ellipse(ctx, m.x - w * 0.15, m.y - h - w * 0.22, w * 0.12, w * 0.07, rgba(GLINT, 0.7));
  }
  // folhas de musgo secas e uma pedrinha no meio da roda: mais materiais, para o chão do círculo não ser só um disco
  for (const [dx, dy, tone] of [[-6, 2.6, p.rim], [5.5, 3, shade(p.ground, -0.15)], [-1, -1.6, mix(p.ground, p.light, 0.45)]] as const) {
    ellipse(ctx, dx + 0.6, dy + 0.6, 1.8, 1, rgba(OUTLINE, 0.3));
    ellipse(ctx, dx, dy, 1.8, 1, tone);
  }
  // esporos no ar
  for (let i = 0; i < 4; i++) ellipse(ctx, -4 + r(80 + i) * 8, -3 + r(90 + i) * 6, 0.7, 0.5, rgba(GLINT, 0.4 + r(100 + i) * 0.4));
  ctx.restore();
}
