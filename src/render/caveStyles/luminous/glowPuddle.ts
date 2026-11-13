import { ellipse, mix, rgba, shade, softShadow } from "../../draw.ts";
import type { CaveTheme } from "../../../world/caves.ts";
import { luminousPalette } from "./palette.ts";
import { blobPath, poolParams } from "./poolShape.ts";
import { poolHalo } from "./poolHalo.ts";

const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

/**
 * Poça de água que reflete a luz da gruta (ADR 0052): espelho de água com fundo escuro nas bordas e claro no miolo, ondas
 * concêntricas, um risco de reflexo, margem molhada e três seixos na beirada. Tamanho e contorno saem da variação.
 */
export function drawGlowPuddle(ctx: CanvasRenderingContext2D, theme: CaveTheme,
  sx: number, sy: number, variation = 0.5): void {
  const p = luminousPalette(theme), shape = poolParams(variation);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(shape.size, shape.size);
  softShadow(ctx, 0, 2, 14, 5, 0.18);
  poolHalo(p.accent, 0.55, ctx);
  // margem molhada: um contorno um pouco maior e escuro em volta da água
  blobPath(shape, ctx, 1.1);
  ctx.fillStyle = rgba(shade(p.ground, -0.45), 0.7);
  ctx.fill();
  const water = ctx.createRadialGradient(-2, -1.5, 1, 0, 0, 14);
  water.addColorStop(0, mix(p.water, p.accent, 0.6));
  water.addColorStop(0.45, mix(p.water, p.accent, 0.18));
  water.addColorStop(1, shade(p.water, -0.4));
  blobPath(shape, ctx);
  ctx.fillStyle = water;
  ctx.fill();
  // ondas concêntricas e o reflexo, recortados na água
  ctx.save();
  blobPath(shape, ctx);
  ctx.clip();
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = rgba(mix(p.accent, GLINT, 0.4), 0.5 - i * 0.15);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(1, -0.5, 3 + i * 4, 1.6 + i * 2.1, shape.rotation, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(GLINT, 0.6);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-8, -3);
  ctx.quadraticCurveTo(-4, -5.4, 1, -4.6);
  ctx.stroke();
  ctx.restore();
  blobPath(shape, ctx);
  ctx.strokeStyle = rgba(OUTLINE, 0.5);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // seixos na beirada, com sombra a sudeste e a quina clara a noroeste
  for (const [x, y, r] of [[-10, 3.4, 1.9], [9.5, 3.8, 1.5], [3, 7.2, 1.2]] as const) {
    ellipse(ctx, x + 0.7, y + 0.7, r, r * 0.6, rgba(OUTLINE, 0.35));
    ellipse(ctx, x, y, r, r * 0.65, mix(p.ground, p.light, 0.35));
    ellipse(ctx, x - r * 0.3, y - r * 0.2, r * 0.4, r * 0.2, rgba(GLINT, 0.5));
  }
  ellipse(ctx, 5, 1.5, 1, 0.55, rgba(GLINT, 0.75));
  ctx.restore();
}
