import { ellipse, mix, rgba, shade, softShadow } from "../../../draw.ts";
import type { TowerInteriorStyle } from "./types.ts";

/**
 * Fresta de janela na parede do fundo de uma torre (ADR 0021), peça física auditada como `prop`:
 * moldura de tijolo, vão escuro e a luz da torre (`style.glow`) descendo pelo vidro. Origem em
 * (sx, sy) = centro da fresta. Só enfeita a parede; nada muda na passabilidade.
 */
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

export function drawTowerWindow(ctx: CanvasRenderingContext2D, style: TowerInteriorStyle,
  sx: number, sy: number, variation = .5): void {
  const b = style.brick;
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : .5));
  const slit = (grow: number): void => {
    ctx.beginPath();
    ctx.moveTo(-4.4 - grow, 8 + grow);
    ctx.lineTo(-4.4 - grow, -4);
    ctx.quadraticCurveTo(-4.4 - grow, -9.5 - grow, 0, -10.5 - grow);
    ctx.quadraticCurveTo(4.4 + grow, -9.5 - grow, 4.4 + grow, -4);
    ctx.lineTo(4.4 + grow, 8 + grow);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(sx, sy);
  // 1. Contato: a moldura projeta sombra na parede.
  softShadow(ctx, 1, 9, 8, 2.2, .3);
  // 2-3. Moldura de tijolo em arco, com volume em três tons.
  const frame = ctx.createLinearGradient(-8, -12, 8, 10);
  frame.addColorStop(0, mix(b.light, GLINT, .2));
  frame.addColorStop(.45, b.base);
  frame.addColorStop(1, b.dark);
  slit(2.8);
  ctx.fillStyle = frame;
  ctx.fill();
  // 4. Material na moldura: juntas de tijolo recortadas pelo arco.
  ctx.save();
  slit(2.8);
  ctx.clip();
  ctx.strokeStyle = rgba(b.mortar, .85); ctx.lineWidth = .9;
  for (const y of [-7, -2, 3, 8]) { ctx.beginPath(); ctx.moveTo(-9, y); ctx.lineTo(9, y); ctx.stroke(); }
  ctx.restore();
  // 5. O vão: escuro nas bordas, luz da torre no meio, em degradê vertical.
  const glass = ctx.createLinearGradient(0, -10, 0, 8);
  glass.addColorStop(0, mix(style.glow, GLINT, .4));
  glass.addColorStop(.5, style.glow);
  glass.addColorStop(1, shade(style.glow, -.45));
  slit(0);
  ctx.fillStyle = glass;
  ctx.fill();
  // 6. Oclusão: a parede projeta sombra no vão, mais forte à direita.
  const side = ctx.createLinearGradient(-4.4, 0, 4.4, 0);
  side.addColorStop(0, rgba(OUTLINE, .05));
  side.addColorStop(1, rgba(OUTLINE, .5));
  slit(0);
  ctx.fillStyle = side;
  ctx.fill();
  // 7. Travessa de ferro em cruz e contorno único.
  ctx.strokeStyle = rgba(OUTLINE, .9); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 8); ctx.moveTo(-4.4, -1 + v * 2); ctx.lineTo(4.4, -1 + v * 2); ctx.stroke();
  slit(0);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
  // 8. Peitoril e poeira de luz embaixo.
  ctx.fillStyle = b.light;
  ctx.fillRect(-6.2, 8.4, 12.4, 2);
  ellipse(ctx, 0, 11.6, 6.5, 1.6, rgba(style.glow, .35));
  // 9. Brilho no vidro, por último.
  ctx.strokeStyle = rgba(GLINT, .8); ctx.lineWidth = .9;
  ctx.beginPath(); ctx.moveTo(-2.6, -6); ctx.lineTo(-2.6, 3); ctx.stroke();
  ctx.restore();
}
