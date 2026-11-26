import { MAGE_BODY as B } from "./palette.ts";
import type { HeroDrawContext } from "../../context.ts";

/**
 * O cabelo do Mago por trás da cabeça (lote M1): solto, nunca amarrado. De frente e de lado, as mechas de trás aparecem de cada lado do pescoço e caem até
 * perto dos ombros; de costas, o cabelo cobre a nuca inteira. Balança com a inércia do passo (`tailSway`), como o manto. Desenha-se antes da cabeça; recebe o
 * quadro primeiro (e não o canvas) porque é um detalhe da cabeça do Mago, não uma peça avulsa do contrato de arte.
 */
export function hairBack(c: HeroDrawContext, ctx: CanvasRenderingContext2D): void {
  const { tone, headX: hx, headY: hy, side, back, tailSway } = c;
  const sway = tailSway * 0.45;
  const g = ctx.createLinearGradient(0, hy - 2, 0, hy + 14);
  g.addColorStop(0, tone(B.hair.mid)); g.addColorStop(1, tone(B.hair.dark));
  ctx.fillStyle = g;
  ctx.beginPath();
  if (back) {
    ctx.moveTo(hx - 9, hy - 2);
    ctx.quadraticCurveTo(hx - 10.4, hy + 7, hx - 7.6 + sway, hy + 13.4);
    ctx.quadraticCurveTo(hx + sway * 1.1, hy + 15.6, hx + 7.6 + sway, hy + 13.4);
    ctx.quadraticCurveTo(hx + 10.4, hy + 7, hx + 9, hy - 2);
  } else {
    // as mechas de trás: de perfil, só a de trás da nuca; de frente, uma de cada lado
    const left = side === 1 ? hx - 9.4 : hx - 8.8, right = side === -1 ? hx + 9.4 : hx + 8.8;
    ctx.moveTo(left, hy - 1);
    ctx.quadraticCurveTo(left - 1, hy + 5, left + 1.4 + sway, hy + 10.4);
    ctx.lineTo(right - 1.4 + sway, hy + 10.4);
    ctx.quadraticCurveTo(right + 1, hy + 5, right, hy - 1);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tone(B.hair.light); ctx.lineWidth = 0.7;
  ctx.beginPath();
  if (back) { ctx.moveTo(hx - 3, hy + 3); ctx.quadraticCurveTo(hx - 3.6 + sway * 0.6, hy + 9, hx - 2.4 + sway, hy + 13); ctx.moveTo(hx + 3.4, hy + 3); ctx.quadraticCurveTo(hx + 4 + sway * 0.6, hy + 9, hx + 3.2 + sway, hy + 12.6); }
  else { ctx.moveTo(hx - 8, hy + 2); ctx.quadraticCurveTo(hx - 8.6 + sway * 0.5, hy + 7, hx - 7.2 + sway, hy + 10.6); ctx.moveTo(hx + 8, hy + 2); ctx.quadraticCurveTo(hx + 8.6 + sway * 0.5, hy + 7, hx + 7.2 + sway, hy + 10.6); }
  ctx.stroke();
}
