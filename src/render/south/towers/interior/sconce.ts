import { ellipse, mix, rgba, shade, softShadow } from "../../../draw.ts";
import type { TowerInteriorStyle } from "./types.ts";

/**
 * Lampião de parede de uma torre (ADR 0021), peça física auditada como `prop`: suporte de ferro
 * preso ao tijolo, copa com brasa e uma chama (`style.flame`) que lança luz. Origem em (sx, sy) =
 * base da copa. A luz no piso é desenhada pelo pintor do andar, não por esta peça.
 */
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";
const IRON = "#3b3f46";

export function drawTowerSconce(ctx: CanvasRenderingContext2D, style: TowerInteriorStyle,
  sx: number, sy: number, variation = .5): void {
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : .5));
  const lean = (v - .5) * 3;
  ctx.save();
  ctx.translate(sx, sy);
  // 1. Contato: o suporte projeta sombra no tijolo.
  softShadow(ctx, 1.5, 3, 9, 2.6, .34);
  // 2. Halo da chama sobre a parede (volume de luz, antes das formas sólidas).
  const halo = ctx.createRadialGradient(0, -11, 1, 0, -11, 17);
  halo.addColorStop(0, rgba(style.glow, .55));
  halo.addColorStop(1, rgba(style.glow, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(-18, -29, 36, 36);
  // 3. Suporte de ferro: placa na parede e braço curvo, com volume em gradiente.
  const iron = ctx.createLinearGradient(-6, -6, 6, 4);
  iron.addColorStop(0, mix(IRON, GLINT, .3));
  iron.addColorStop(.5, IRON);
  iron.addColorStop(1, shade(IRON, -.4));
  ctx.beginPath();
  ctx.moveTo(-3.6, 5); ctx.lineTo(-3.6, -3);
  ctx.quadraticCurveTo(-3.6, -6, 0, -6);
  ctx.quadraticCurveTo(3.6, -6, 3.6, -3);
  ctx.lineTo(3.6, 5);
  ctx.closePath();
  ctx.fillStyle = iron; ctx.fill();
  // 4. Copa de ferro, mais larga que o braço, com brasa dentro.
  ctx.beginPath();
  ctx.moveTo(-6.4, -8.4);
  ctx.quadraticCurveTo(-5.4, -3.6, 0, -3.2);
  ctx.quadraticCurveTo(5.4, -3.6, 6.4, -8.4);
  ctx.closePath();
  ctx.fillStyle = iron; ctx.fill();
  ellipse(ctx, 0, -8.4, 6.2, 1.9, shade(style.flame, -.5));
  ellipse(ctx, 0, -8.5, 4.6, 1.2, style.flame);
  // 5. A chama em duas camadas (externa e núcleo), inclinada pela variação.
  ctx.beginPath();
  ctx.moveTo(-4.4, -8.6);
  ctx.quadraticCurveTo(-5.6 + lean, -15, lean, -22);
  ctx.quadraticCurveTo(5.6 + lean, -15, 4.4, -8.6);
  ctx.closePath();
  ctx.fillStyle = style.flame; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2.4, -8.8);
  ctx.quadraticCurveTo(-3 + lean * .6, -13, lean * .6, -17.4);
  ctx.quadraticCurveTo(3 + lean * .6, -13, 2.4, -8.8);
  ctx.closePath();
  ctx.fillStyle = mix(style.flame, GLINT, .72); ctx.fill();
  // 6. Oclusão: a copa escurece sob a borda e no lado da sombra.
  const under = ctx.createLinearGradient(0, -8, 0, -3);
  under.addColorStop(0, rgba(OUTLINE, 0));
  under.addColorStop(1, rgba(OUTLINE, .5));
  ctx.fillStyle = under;
  ctx.fillRect(-6, -8, 12, 5);
  // 7. Contorno único do ferro.
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3.6, 5); ctx.lineTo(-3.6, -3);
  ctx.quadraticCurveTo(-3.6, -6, 0, -6);
  ctx.quadraticCurveTo(3.6, -6, 3.6, -3);
  ctx.lineTo(3.6, 5);
  ctx.moveTo(-6.4, -8.4);
  ctx.quadraticCurveTo(-5.4, -3.6, 0, -3.2);
  ctx.quadraticCurveTo(5.4, -3.6, 6.4, -8.4);
  ctx.stroke();
  // 8. Parafusos e fagulhas.
  ellipse(ctx, 0, 2.6, 1, 1, rgba(OUTLINE, .8));
  ellipse(ctx, 3 + lean, -24, .8, .8, rgba(style.flame, .85));
  ellipse(ctx, -3, -20.5, .6, .6, rgba(style.flame, .7));
  // 9. Brilho do ferro e da ponta da chama, por último.
  ctx.strokeStyle = rgba(GLINT, .7); ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(-5.2, -7.4); ctx.quadraticCurveTo(-4.6, -5, -2.4, -4.2); ctx.stroke();
  ellipse(ctx, lean * .5, -15.5, .9, 1.6, rgba(GLINT, .9));
  ctx.restore();
}
