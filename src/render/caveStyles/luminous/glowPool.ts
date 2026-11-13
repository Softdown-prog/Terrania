import { ellipse, mix, rgba, shade, softShadow } from "../../draw.ts";
import type { CaveTheme } from "../../../world/caves.ts";
import { luminousPalette } from "./palette.ts";
import { blobPath, poolParams } from "./poolShape.ts";
import { poolHalo } from "./poolHalo.ts";

const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

/**
 * Tapete de musgo luminoso no chão da Gruta Luminosa (ADR 0032 e 0052): brilha de dentro para fora, com anéis de luz,
 * tufos curvos e esporos. Tamanho, achatamento, giro e contorno saem da variação (`poolParams`), então os tapetes não se
 * repetem. É decoração do chão e não muda a colisão.
 */
export function drawGlowPool(ctx: CanvasRenderingContext2D, theme: CaveTheme,
  sx: number, sy: number, variation = 0.5): void {
  const p = luminousPalette(theme), shape = poolParams(variation);
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : 0.5));
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(shape.size, shape.size);
  softShadow(ctx, 0, 2, 14, 5, 0.22);
  poolHalo(p.accent, 1, ctx);
  // corpo: escuro nas bordas, claro no miolo
  const bed = ctx.createRadialGradient(-2, -1, 1, 0, 0, 14);
  bed.addColorStop(0, rgba(mix(p.accent, GLINT, 0.35), 0.95));
  bed.addColorStop(0.5, rgba(mix(p.accent, p.ground, 0.4), 0.8));
  bed.addColorStop(1, rgba(shade(mix(p.ground, p.accent, 0.2), -0.25), 0.5));
  blobPath(shape, ctx);
  ctx.fillStyle = bed;
  ctx.fill();
  // anéis de luz recortados pelo tapete
  ctx.save();
  blobPath(shape, ctx);
  ctx.clip();
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = rgba(mix(p.accent, GLINT, 0.3 + i * 0.15), 0.5 - i * 0.1);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(-1 + v, 0, 4 + i * 3.4, 2.2 + i * 1.5, shape.rotation, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // tufos de musgo em curva, mais deles nos tapetes grandes
  ctx.strokeStyle = rgba(shade(p.ground, -0.35), 0.7);
  ctx.lineWidth = 1;
  const tufts = 3 + Math.round(shape.size * 2);
  for (let i = 0; i < tufts; i++) {
    const x = -9 + (i / (tufts - 1)) * 18 * (0.7 + v * 0.3), y = 3.5 - Math.abs(i - tufts / 2) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 1, y - 3, x + 1.5, y - 5.5);
    ctx.stroke();
  }
  // contorno único e reflexo no quadrante superior esquerdo
  blobPath(shape, ctx);
  ctx.strokeStyle = rgba(OUTLINE, 0.38);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.strokeStyle = rgba(GLINT, 0.5);
  ctx.beginPath();
  ctx.moveTo(-9, -3.5);
  ctx.quadraticCurveTo(-5, -6.5, -1, -6);
  ctx.stroke();
  // esporos e pontos de brilho
  ellipse(ctx, 5, -2, 1.2, 0.7, rgba(GLINT, 0.7));
  ellipse(ctx, -5, 2, 0.9, 0.6, rgba(mix(p.accent, GLINT, 0.6), 0.8));
  ellipse(ctx, 1, 3, 0.7, 0.5, rgba(p.light, 0.7));
  ctx.restore();
}
