import { ellipse } from "../../draw.ts";
import type { HeroDrawContext } from "../context.ts";
import { face } from "./body/face.ts";
import { hairBack } from "./body/hairBack.ts";
import { hairFront } from "./body/hairFront.ts";
import { MAGE_BODY as B } from "./body/palette.ts";

/**
 * A cabeça do personagem Mago (docs/MAGO_APARENCIA.md, lote M1): cabelo de trás, cabeça, rosto e cabelo da frente, na ordem em que se empilham. Substitui o
 * rosto, o cabelo e o rabo de cavalo do Cavaleiro; o chapéu e a faixa vêm depois, por cima. O cabelo é solto, nunca amarrado.
 */
export function drawMageHead(ctx: CanvasRenderingContext2D, c: HeroDrawContext): void {
  hairBack(c, ctx);
  const { tone, headX: hx, headY: hy, back } = c;
  const cap = ctx.createRadialGradient(hx - 3, hy - 5, 1, hx, hy, 11);
  cap.addColorStop(0, tone(B.hair.light)); cap.addColorStop(0.5, tone(B.hair.mid)); cap.addColorStop(1, tone(B.hair.dark));
  ellipse(ctx, hx, hy, 8.6, 9.3, cap);
  if (!back) face(c, ctx);
  hairFront(c, ctx);
}
