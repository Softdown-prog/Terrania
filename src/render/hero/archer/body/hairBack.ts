import { ellipse } from "../../../draw.ts";
import type { HeroDrawContext } from "../../context.ts";
import { ARCHER_BODY as B } from "../palette.ts";

/**
 * O cabelo do Arqueiro por trás da cabeça (ADR 0114): curto e preso. Atrás da nuca, um rabinho curto amarrado com a mesma faixa da testa, que balança com a inércia
 * do passo (`tailSway`). De costas, o cabelo cobre a nuca até a altura das orelhas e o rabinho aparece no meio. Desenha-se antes da cabeça.
 */
export function hairBack(c: HeroDrawContext, ctx: CanvasRenderingContext2D): void {
  const { tone, headX: hx, headY: hy, side, back, tailSway } = c;
  const sway = tailSway * 0.5;
  const g = ctx.createLinearGradient(0, hy - 2, 0, hy + 10);
  g.addColorStop(0, tone(B.hair.mid)); g.addColorStop(1, tone(B.hair.dark));
  ctx.fillStyle = g;
  ctx.beginPath();
  if (back) {
    ctx.moveTo(hx - 8.8, hy - 2); ctx.quadraticCurveTo(hx - 9.4, hy + 4, hx - 6.6, hy + 8.4);
    ctx.quadraticCurveTo(hx, hy + 10, hx + 6.6, hy + 8.4); ctx.quadraticCurveTo(hx + 9.4, hy + 4, hx + 8.8, hy - 2);
  } else {
    const left = side === 1 ? hx - 9.2 : hx - 8.6, right = side === -1 ? hx + 9.2 : hx + 8.6;
    ctx.moveTo(left, hy - 1); ctx.quadraticCurveTo(left - 0.6, hy + 3, left + 1.6, hy + 6);
    ctx.lineTo(right - 1.6, hy + 6); ctx.quadraticCurveTo(right + 0.6, hy + 3, right, hy - 1);
  }
  ctx.closePath(); ctx.fill();
  // o rabinho preso: sai da nuca para o lado contrário ao olhar (de frente, para trás da cabeça, só a ponta)
  const tx = side !== 0 ? hx - side * 8.4 : hx, ty = back ? hy + 5 : hy + 3.6;
  ctx.fillStyle = tone(B.hair.mid);
  ctx.beginPath();
  ctx.moveTo(tx - 1.4, ty - 1); ctx.quadraticCurveTo(tx - 3.6 + sway, ty + 4, tx - 2 + sway * 1.3, ty + 9);
  ctx.quadraticCurveTo(tx + sway * 1.2, ty + 11, tx + 2.2 + sway * 1.3, ty + 9); ctx.quadraticCurveTo(tx + 3.6 + sway, ty + 4, tx + 1.4, ty - 1);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tone(B.hair.light); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(tx - 0.4, ty + 1); ctx.quadraticCurveTo(tx - 1.2 + sway, ty + 5, tx - 0.4 + sway * 1.2, ty + 9); ctx.stroke();
  ellipse(ctx, tx, ty - 0.2, 1.7, 1.2, tone(B.band));
  ellipse(ctx, tx, ty + 0.1, 1.2, 0.5, tone(B.bandDark));
}
