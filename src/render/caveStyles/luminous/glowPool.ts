import { ellipse, mix, rgba, shade, softShadow, TAU } from "../../draw.ts";
import type { CaveTheme } from "../../../world/caves.ts";
import { luminousPalette } from "./palette.ts";

const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

/** Contorno irregular da poça: o mesmo caminho serve para o recorte, o preenchimento e a borda. */
function pool(ctx: CanvasRenderingContext2D, v: number): void {
  ctx.beginPath();
  ctx.moveTo(-12, 1);
  ctx.quadraticCurveTo(-11, -5 - v * 2, -4, -6);
  ctx.quadraticCurveTo(3, -8 + v * 2, 9, -4);
  ctx.quadraticCurveTo(14, -1, 11, 3 + v);
  ctx.quadraticCurveTo(4, 7, -3, 6);
  ctx.quadraticCurveTo(-10, 6, -12, 1);
  ctx.closePath();
}

/**
 * Poça de musgo luminoso no chão da Gruta Luminosa (ADR 0032): tapete irregular que brilha de dentro
 * para fora, com anéis de luz, tufos curvos e esporos. É decoração do chão e não muda a colisão.
 */
export function drawGlowPool(ctx: CanvasRenderingContext2D, theme: CaveTheme,
  sx: number, sy: number, variation = 0.5): void {
  const p = luminousPalette(theme);
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : .5));
  ctx.save();
  ctx.translate(sx, sy);
  // 1. Sombra de contato do tapete.
  softShadow(ctx, 0, 2, 14, 5, .22);
  // 2. Luz que sobe do tapete, em "screen", por cima do chão ao redor.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const light = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
  light.addColorStop(0, rgba(p.accent, .4));
  light.addColorStop(.55, rgba(p.accent, .13));
  light.addColorStop(1, rgba(p.accent, 0));
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 17, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 3. Corpo do tapete: escuro nas bordas, claro no miolo.
  const bed = ctx.createRadialGradient(-2, -1, 1, 0, 0, 14);
  bed.addColorStop(0, rgba(mix(p.accent, GLINT, .35), .95));
  bed.addColorStop(.5, rgba(mix(p.accent, p.ground, .4), .8));
  bed.addColorStop(1, rgba(shade(mix(p.ground, p.accent, .2), -.25), .5));
  pool(ctx, v);
  ctx.fillStyle = bed;
  ctx.fill();
  // 4. Anéis de luz recortados pelo tapete.
  ctx.save();
  pool(ctx, v);
  ctx.clip();
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = rgba(mix(p.accent, GLINT, .3 + i * .15), .5 - i * .1);
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.ellipse(-1 + v, 0, 4 + i * 3.4, 2.2 + i * 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // 5. Tufos de musgo em curva.
  ctx.strokeStyle = rgba(shade(p.ground, -.35), .7);
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const x = -8 + i * 5 + v * 2;
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.quadraticCurveTo(x - 1, 1, x + 1.5, -1.5);
    ctx.stroke();
  }
  // 6. Contorno único e reflexo no quadrante superior esquerdo.
  pool(ctx, v);
  ctx.strokeStyle = rgba(OUTLINE, .38);
  ctx.lineWidth = .9;
  ctx.stroke();
  ctx.strokeStyle = rgba(GLINT, .5);
  ctx.lineWidth = .9;
  ctx.beginPath();
  ctx.moveTo(-9, -3.5);
  ctx.quadraticCurveTo(-5, -6.5, -1, -6);
  ctx.stroke();
  // 7. Esporos e pontos de brilho.
  ellipse(ctx, 5, -2, 1.2, .7, rgba(GLINT, .7));
  ellipse(ctx, -5, 2, .9, .6, rgba(mix(p.accent, GLINT, .6), .8));
  ellipse(ctx, 1, 3, .7, .5, rgba(p.light, .7));
  ctx.restore();
}
