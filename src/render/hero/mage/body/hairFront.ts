import { MAGE_BODY as B } from "./palette.ts";
import type { HeroDrawContext } from "../../context.ts";

/**
 * O cabelo do Mago por cima do rosto (lote M1): a franja repartida de lado, que cai sobre a testa, e as mechas soltas que emolduram o rosto até a altura
 * do queixo. De costas, o couro cabeludo com o redemoinho e os fios que caem. Desenha-se depois do rosto. Recebe o quadro primeiro, como `hairBack`.
 */
export function hairFront(c: HeroDrawContext, ctx: CanvasRenderingContext2D): void {
  const { tone, headX: hx, headY: hy, side, back, tailSway } = c;
  if (back) {
    ctx.strokeStyle = tone(B.hair.light); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(hx - 5, hy - 6); ctx.quadraticCurveTo(hx, hy - 9, hx + 4, hy - 6.4); ctx.stroke();
    ctx.strokeStyle = tone(B.hair.dark); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(hx, hy - 2); ctx.lineTo(hx + 0.4, hy + 8); ctx.moveTo(hx - 4, hy - 1); ctx.quadraticCurveTo(hx - 4.6, hy + 4, hx - 3.6, hy + 9); ctx.stroke();
    return;
  }
  const sway = tailSway * 0.2;
  ctx.fillStyle = tone(B.hair.mid);
  // franja de lado, caída sobre a testa
  ctx.beginPath();
  ctx.moveTo(hx - 9, hy - 0.4);
  ctx.quadraticCurveTo(hx - 9.8, hy - 10, hx - 0.6, hy - 10.4);
  ctx.quadraticCurveTo(hx + 8.6, hy - 10, hx + 9, hy - 0.4);
  ctx.quadraticCurveTo(hx + 7.2, hy - 4, hx + 3.6 + side, hy - 4.6);
  ctx.quadraticCurveTo(hx - 0.6 + side, hy - 1.8, hx - 4 + side, hy - 4.2);
  ctx.quadraticCurveTo(hx - 6.6, hy - 2.4, hx - 9, hy - 0.4);
  ctx.closePath(); ctx.fill();
  // mechas soltas dos dois lados do rosto (de perfil, só a do lado de trás)
  const locks = side === 0 ? [-1, 1] : [-side];
  for (const s of locks) {
    const x = hx + s * 7.4 + side * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - s * 1.4, hy - 3);
    ctx.quadraticCurveTo(x + s * 1.5, hy, x + s * 0.5 + sway, hy + 5.4);
    ctx.quadraticCurveTo(x - s * 0.9 + sway, hy + 4.2, x - s * 2, hy + 0.8);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = tone(B.hair.light); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(hx - 6.5, hy - 7.6); ctx.quadraticCurveTo(hx - 2, hy - 9.8, hx + 3, hy - 8.6); ctx.stroke();
  ctx.strokeStyle = tone(B.hair.dark); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(hx + 1 + side, hy - 9.4); ctx.quadraticCurveTo(hx + 0.4 + side, hy - 6.6, hx - 1.6 + side, hy - 4.8); ctx.stroke();
}
