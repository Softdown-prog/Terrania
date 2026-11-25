import { ellipse, rgba } from "../../../draw.ts";
import { MAGE_PAL as P } from "../palette.ts";

/**
 * O anel de latão do Aprendiz (ADR 0078): um aro de metal em volta da mão que segura o cajado, com contorno, sombra por dentro, brilho por fora e uma
 * pedra azul facetada num engaste de ouro, com um clarão. `x, y` é a mão.
 */
export function drawMageRing(ctx: CanvasRenderingContext2D, x: number, y: number, tone: (c: string) => string): void {
  // o aro: contorno escuro, sombra por dentro, latão no meio e brilho por fora
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba("#3a2a10", 0.8); ctx.lineWidth = 1.9;
  ctx.beginPath(); ctx.arc(x, y + 0.4, 2.55, 0.15, Math.PI - 0.15); ctx.stroke();
  ctx.strokeStyle = tone("#8a6a22"); ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(x, y + 0.5, 2.5, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.strokeStyle = tone("#c9a24e"); ctx.lineWidth = 0.95;
  ctx.beginPath(); ctx.arc(x, y + 0.4, 2.55, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.strokeStyle = tone("#f3d98a"); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.arc(x, y + 0.2, 2.6, 0.6, 1.6); ctx.stroke(); ctx.lineCap = "butt";
  // uma runa gravada no aro
  ctx.strokeStyle = rgba("#5a4214", 0.8); ctx.lineWidth = 0.35;
  ctx.beginPath(); ctx.moveTo(x - 0.9, y + 2.7); ctx.lineTo(x - 0.2, y + 3); ctx.lineTo(x + 0.2, y + 2.8); ctx.stroke();
  // o engaste de ouro e a pedra facetada
  const gx = x + 1.7, gy = y + 2.2;
  ellipse(ctx, gx, gy, 1.55, 1.3, rgba("#3a2a10", 0.85));
  ellipse(ctx, gx, gy, 1.35, 1.1, tone("#e6c46a"));
  const gem = ctx.createRadialGradient(gx - 0.3, gy - 0.3, 0.1, gx, gy, 1.2);
  gem.addColorStop(0, tone("#d8f6ff")); gem.addColorStop(0.55, tone("#6fb8e8")); gem.addColorStop(1, tone("#2a5f9c"));
  ctx.fillStyle = gem; ctx.beginPath(); ctx.moveTo(gx, gy - 1); ctx.lineTo(gx + 1, gy); ctx.lineTo(gx, gy + 1); ctx.lineTo(gx - 1, gy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#ffffff", 0.7); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(gx - 1, gy); ctx.lineTo(gx + 1, gy); ctx.moveTo(gx, gy - 1); ctx.lineTo(gx, gy + 1); ctx.stroke();
  ellipse(ctx, gx - 0.35, gy - 0.4, 0.35, 0.3, rgba(P.spark, 0.95));
  ellipse(ctx, gx, gy, 2.2, 2.2, rgba(P.gem, 0.16));
}
