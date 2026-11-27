import { rgba, shade, softShadow } from "../../../draw.ts";
import { GLINT, IRON, OUTLINE } from "../../kit/index.ts";

const WOOD = "#8a5a33";

/**
 * Banco de praça da capital (ADR 0106): assento de tábuas, encosto, pés de ferro fundido com volutas e as tábuas com veio e pregos. A variação 0 é o banco visto de frente (o
 * encosto fica atrás, ao norte) e a 1 o mesmo banco espelhado (para ele não repetir igual ao lado do outro). Origem no meio do pé, no chão; luz de noroeste.
 */
export function paintCapitalBench(c: CanvasRenderingContext2D, variant: number): void {
  const flip = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 2 === 1;
  c.save();
  if (flip) c.scale(-1, 1);
  softShadow(c, 0, 2, 22, 5, .4);
  // 1. Os pés de ferro: duas volutas com perna e pé, em cada ponta.
  for (const x of [-16, 16]) {
    c.strokeStyle = OUTLINE; c.lineWidth = 4.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(x, -9); c.lineTo(x, 0); c.stroke();
    c.strokeStyle = IRON; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(x, -9); c.lineTo(x, 0); c.stroke();
    c.strokeStyle = OUTLINE; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(x, -3); c.quadraticCurveTo(x + (x < 0 ? 5 : -5), -9, x + (x < 0 ? 1 : -1), -14); c.stroke();
    c.strokeStyle = IRON; c.lineWidth = 1.7;
    c.beginPath(); c.moveTo(x, -3); c.quadraticCurveTo(x + (x < 0 ? 5 : -5), -9, x + (x < 0 ? 1 : -1), -14); c.stroke();
    c.fillStyle = OUTLINE; c.fillRect(x - 3.4, -1.2, 6.8, 3); c.fillStyle = IRON; c.fillRect(x - 2.6, -.6, 5.2, 1.8);
  }
  // 2. O encosto: duas tábuas altas entre os pés, mais escuras por estarem na sombra do assento.
  for (const [y, h] of [[-26, 5], [-20, 5]] as const) {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, shade(WOOD, .05)); g.addColorStop(1, shade(WOOD, -.35));
    c.fillStyle = OUTLINE; c.fillRect(-19.4, y - .8, 38.8, h + 1.6);
    c.fillStyle = g; c.fillRect(-18.4, y, 36.8, h);
    c.fillStyle = rgba(GLINT, .22); c.fillRect(-18.4, y, 36.8, .9);
  }
  // 3. O assento, em duas tábuas, com veio claro, sombra de baixo e pregos nas pontas.
  for (const [y, h] of [[-13, 4.2], [-8.6, 4.2]] as const) {
    const g = c.createLinearGradient(-20, y, 20, y + h);
    g.addColorStop(0, shade(WOOD, .22)); g.addColorStop(.55, WOOD); g.addColorStop(1, shade(WOOD, -.4));
    c.fillStyle = OUTLINE; c.fillRect(-21.4, y - .8, 42.8, h + 1.6);
    c.fillStyle = g; c.fillRect(-20.4, y, 40.8, h);
    c.strokeStyle = rgba(shade(WOOD, -.5), .5); c.lineWidth = .6;
    for (const dx of [-12, -3, 8, 15]) { c.beginPath(); c.moveTo(dx, y + .6); c.quadraticCurveTo(dx + 4, y + h / 2, dx + 1, y + h - .6); c.stroke(); }
    c.fillStyle = rgba(GLINT, .3); c.fillRect(-20.4, y, 40.8, .8);
    for (const x of [-17.5, 17.5]) { c.fillStyle = rgba("#2a2118", .9); c.fillRect(x - .5, y + h / 2 - .5, 1.1, 1.1); }
  }
  // 4. Braços de ferro nas pontas e o brilho no ferro, por último.
  for (const x of [-20.6, 20.6]) { c.fillStyle = OUTLINE; c.fillRect(x - 1.6, -19, 3.2, 8); c.fillStyle = IRON; c.fillRect(x - .9, -18.4, 1.8, 6.8); }
  c.fillStyle = rgba(GLINT, .5); c.fillRect(-16.8, -8, .9, 6);
  c.restore();
}
