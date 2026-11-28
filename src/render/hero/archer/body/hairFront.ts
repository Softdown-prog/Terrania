import { ellipse, rgba } from "../../../draw.ts";
import { ARCHER_BODY as B, ARCHER_PAL as P } from "../palette.ts";
import type { HeroDrawContext } from "../../context.ts";

/**
 * O cabelo do Arqueiro por cima do rosto e a faixa (ADR 0114): cabelo curto repartido, com uma franja curta, e a faixa de pano vermelho-ferrugem que prende o cabelo,
 * atada na altura da testa com o nó caindo de lado. De costas, o couro cabeludo com a faixa por cima. Desenha-se depois do rosto.
 */
export function hairFront(c: HeroDrawContext, ctx: CanvasRenderingContext2D): void {
  const { tone, headX: hx, headY: hy, side, back, tailSway } = c;
  if (back) {
    ctx.strokeStyle = tone(B.hair.light); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(hx - 5, hy - 6); ctx.quadraticCurveTo(hx, hy - 9, hx + 4, hy - 6.4); ctx.stroke();
    ctx.strokeStyle = tone(B.hair.dark); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(hx, hy - 8); ctx.lineTo(hx + 0.4, hy - 1); ctx.stroke();
    // redemoinho no alto da nuca, mechas mais claras e o brilho do couro cabeludo
    ctx.strokeStyle = tone(B.hair.mid); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(hx + 0.4, hy - 5.6, 2.2, Math.PI * 0.2, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = rgba(B.hair.light, 0.9); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(hx - 7, hy - 3); ctx.quadraticCurveTo(hx - 6.6, hy + 1, hx - 5.4, hy + 4); ctx.moveTo(hx + 6.6, hy - 3); ctx.quadraticCurveTo(hx + 6.8, hy + 1, hx + 5.6, hy + 4); ctx.stroke();
    ellipse(ctx, hx - 3, hy - 7.4, 3.2, 1.2, rgba("#fff1d6", 0.5));
    // a pena de ganso enfiada na faixa e a sombra da nuca
    ellipse(ctx, hx + 6.4, hy - 3.2, 1, 3.4, tone(P.feather));
    ellipse(ctx, hx + 6.7, hy - 2.8, 0.45, 2.6, tone(P.featherDark));
    ellipse(ctx, hx + 5.6, hy - 0.4, 0.8, 0.8, tone(P.buckle));
    ctx.fillStyle = rgba("#000000", 0.2); ctx.fillRect(hx - 6, hy + 1.6, 12, 1.4);
    // a faixa por cima, com a costura
    ctx.strokeStyle = tone(B.band); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(hx - 8.6, hy - 1.2); ctx.quadraticCurveTo(hx, hy + 1.4, hx + 8.6, hy - 1.2); ctx.stroke();
    ctx.strokeStyle = tone(B.bandDark); ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(hx - 8.4, hy - 0.4); ctx.quadraticCurveTo(hx, hy + 2.2, hx + 8.4, hy - 0.4); ctx.stroke();
    return;
  }
  ctx.fillStyle = tone(B.hair.mid);
  ctx.beginPath();
  ctx.moveTo(hx - 8.8, hy - 1.6);
  ctx.quadraticCurveTo(hx - 9.6, hy - 10, hx - 0.6, hy - 10.4);
  ctx.quadraticCurveTo(hx + 8.8, hy - 10, hx + 8.8, hy - 1.6);
  ctx.lineTo(hx + 6.6, hy - 3.6);
  ctx.lineTo(hx + 3.4 + side, hy - 4.8);                 // franja curta em pontas
  ctx.lineTo(hx + 0.6 + side, hy - 3.4);
  ctx.lineTo(hx - 2.8 + side, hy - 4.8);
  ctx.lineTo(hx - 6.2, hy - 3.2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tone(B.hair.light); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(hx - 6.5, hy - 8); ctx.quadraticCurveTo(hx - 2, hy - 10, hx + 3, hy - 8.8); ctx.stroke();
  // a faixa atada na testa, com o nó e a ponta caindo para o lado de trás
  ctx.strokeStyle = tone(B.band); ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(hx - 8.4, hy - 3.8); ctx.quadraticCurveTo(hx + side * 0.8, hy - 5.8, hx + 8.4, hy - 3.8); ctx.stroke();
  ctx.strokeStyle = tone(B.bandDark); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(hx - 8.2, hy - 3); ctx.quadraticCurveTo(hx + side * 0.8, hy - 5, hx + 8.2, hy - 3); ctx.stroke();
  const kx = side !== 0 ? hx - side * 7.6 : hx - 7.4, sway = tailSway * 0.3;
  ctx.fillStyle = tone(B.band);
  ctx.beginPath(); ctx.moveTo(kx, hy - 4.4); ctx.lineTo(kx - 2.4 + sway, hy + 0.4); ctx.lineTo(kx - 0.6 + sway, hy + 1); ctx.lineTo(kx + 0.8, hy - 3.2); ctx.closePath(); ctx.fill();
}
