import { ellipse } from "../../draw.ts";
import type { MageSetTheme } from "./sets/index.ts";

/**
 * A marca bordada de um conjunto, em tamanho `r` no ponto `x, y` (a barra da túnica e do manto): a cruzinha de estrela do Aprendiz ou o redemoinho de
 * vento da Brisa (ADR 0080), com o pontinho de brilho no meio. É um detalhe de dentro da túnica e do manto (peças registradas no contrato de arte), não uma peça
 * isolada; por isso recebe a ficha do conjunto primeiro. `stroke` é a cor do fio e `dot` a do pontinho.
 */
export function stitchMark(t: MageSetTheme, ctx: CanvasRenderingContext2D, x: number, y: number, r: number, tone: (c: string) => string, stroke: string, dot: string): void {
  ctx.strokeStyle = tone(stroke); ctx.lineWidth = 0.6;
  ctx.beginPath();
  if (t.motif === "wind") {
    ctx.moveTo(x - r, y + r * 0.45);
    ctx.bezierCurveTo(x - r * 0.2, y - r * 0.95, x + r * 1.05, y - r * 0.65, x + r * 0.75, y + r * 0.1);
    ctx.bezierCurveTo(x + r * 0.45, y + r * 0.65, x - r * 0.2, y + r * 0.35, x + r * 0.12, y - r * 0.12);
    ctx.stroke();
    ellipse(ctx, x + r * 0.12, y - r * 0.12, r * 0.3, r * 0.3, tone(dot));
    return;
  }
  ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
  ellipse(ctx, x, y, r * 0.38, r * 0.38, tone(dot));
}
