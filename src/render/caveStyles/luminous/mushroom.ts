import { ellipse, mix, rgba, shade, softShadow, TAU } from "../../draw.ts";
import type { CaveTheme } from "../../../world/caves.ts";
import { luminousPalette } from "./palette.ts";

const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

/** Um cogumelo: haste, chapéu em cúpula, lamelas por baixo, pintas claras e um fio de luz no alto à esquerda. */
function cap(ctx: CanvasRenderingContext2D, x: number, h: number, w: number, glow: string, body: string, deep: string): void {
  // Haste.
  const stem = ctx.createLinearGradient(x - w * .3, -h, x + w * .3, 0);
  stem.addColorStop(0, mix(body, GLINT, .5));
  stem.addColorStop(1, shade(body, -.28));
  ctx.beginPath();
  ctx.moveTo(x - w * .22, 0);
  ctx.quadraticCurveTo(x - w * .16, -h * .5, x - w * .12, -h);
  ctx.lineTo(x + w * .12, -h);
  ctx.quadraticCurveTo(x + w * .17, -h * .5, x + w * .24, 0);
  ctx.closePath();
  ctx.fillStyle = stem;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = .9;
  ctx.stroke();
  // Chapéu: cúpula com luz superior esquerda.
  const dome = ctx.createRadialGradient(x - w * .22, -h - w * .3, 1, x, -h, w * .75);
  dome.addColorStop(0, mix(glow, GLINT, .55));
  dome.addColorStop(.45, glow);
  dome.addColorStop(1, deep);
  ctx.beginPath();
  ctx.moveTo(x - w * .62, -h + 1);
  ctx.quadraticCurveTo(x - w * .6, -h - w * .62, x, -h - w * .6);
  ctx.quadraticCurveTo(x + w * .6, -h - w * .62, x + w * .62, -h + 1);
  ctx.quadraticCurveTo(x, -h + w * .24, x - w * .62, -h + 1);
  ctx.closePath();
  ctx.fillStyle = dome;
  ctx.fill();
  // Lamelas sob a borda do chapéu.
  ctx.strokeStyle = rgba(shade(deep, -.3), .6);
  ctx.lineWidth = .6;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * w * .17, -h + w * .03);
    ctx.quadraticCurveTo(x + i * w * .12, -h + w * .12, x + i * w * .06, -h + w * .17);
    ctx.stroke();
  }
  // Pintas claras e contorno.
  ellipse(ctx, x + w * .18, -h - w * .26, w * .1, w * .06, rgba(GLINT, .55));
  ellipse(ctx, x - w * .05, -h - w * .4, w * .07, w * .045, rgba(mix(glow, GLINT, .7), .75));
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w * .62, -h + 1);
  ctx.quadraticCurveTo(x - w * .6, -h - w * .62, x, -h - w * .6);
  ctx.quadraticCurveTo(x + w * .6, -h - w * .62, x + w * .62, -h + 1);
  ctx.stroke();
  // Reflexo no quadrante superior esquerdo.
  ctx.strokeStyle = rgba(GLINT, .7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w * .46, -h - w * .2);
  ctx.quadraticCurveTo(x - w * .36, -h - w * .48, x - w * .14, -h - w * .53);
  ctx.stroke();
}

/**
 * Touceira de cogumelos que brilham, o "formação subterrânea" da Gruta Luminosa (ADR 0032): halo de luz,
 * três cogumelos de alturas diferentes, volume, lamelas, contorno e reflexo. Ocupa o mesmo espaço da
 * formação comum (junto às paredes) e não muda a passabilidade.
 */
export function drawGlowMushroom(ctx: CanvasRenderingContext2D, theme: CaveTheme,
  sx: number, sy: number, variation = 0.5): void {
  const p = luminousPalette(theme);
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : .5));
  ctx.save();
  ctx.translate(sx, sy);
  // 1. Contato com o chão.
  softShadow(ctx, 1, 1.5, 12, 3.2, .3);
  // 2. Halo de luz do brilho, atrás dos cogumelos: gradiente radial misturado em "screen" para clarear o chão.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const halo = ctx.createRadialGradient(0, -11, 1, 0, -11, 30);
  halo.addColorStop(0, rgba(p.accent, .55));
  halo.addColorStop(.45, rgba(p.accent, .2));
  halo.addColorStop(1, rgba(p.accent, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(0, -9, 30, 26, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 3. Três cogumelos: o grande ao fundo, o médio e o pequeno à frente.
  const body = mix(p.light, GLINT, .25);
  const deep = shade(mix(p.wall, p.accent, .25), -.1);
  cap(ctx, -2 + v * 3, 9 + v * 2, 11, mix(p.accent, p.light, .2), body, deep);
  cap(ctx, -8, 5, 7.2, p.accent, body, deep);
  cap(ctx, 6.5 - v * 2, 4, 6, mix(p.accent, GLINT, .12), body, deep);
  // 4. Oclusão no contato, sem cobrir a silhueta.
  ellipse(ctx, 0, .4, 9, 1.4, rgba(OUTLINE, .3));
  // 5. Esporos flutuando, claros e pequenos.
  for (let i = 0; i < 4; i++)
    ellipse(ctx, -9 + i * 6 + v * 2, -20 - (i % 2) * 3, .9, .9, rgba(mix(p.accent, GLINT, .6), .5));
  ctx.restore();
}
