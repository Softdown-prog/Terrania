import { ellipse } from "../../draw.ts";
import type { HeroDrawContext } from "../context.ts";
import { face } from "./body/face.ts";
import { hairBack } from "./body/hairBack.ts";
import { hairFront } from "./body/hairFront.ts";
import { ARCHER_BODY as B } from "./palette.ts";

/**
 * A cabeça do personagem Arqueiro (ADR 0114): cabelo de trás (com o rabinho preso), cabeça, rosto anguloso e cabelo da frente com a faixa, na ordem em que se
 * empilham. Substitui o rosto e o cabelo do Cavaleiro; o capuz dos conjuntos altos virá por cima, como o chapéu do Mago.
 */
export function drawArcherHead(ctx: CanvasRenderingContext2D, c: HeroDrawContext): void {
  hairBack(c, ctx);
  const { tone, headX: hx, headY: hy, back } = c;
  const cap = ctx.createRadialGradient(hx - 3, hy - 5, 1, hx, hy, 11);
  cap.addColorStop(0, tone(B.hair.light)); cap.addColorStop(0.5, tone(B.hair.mid)); cap.addColorStop(1, tone(B.hair.dark));
  ellipse(ctx, hx, hy, 8.6, 9.3, cap);
  if (!back) face(c, ctx);
  hairFront(c, ctx);
}
