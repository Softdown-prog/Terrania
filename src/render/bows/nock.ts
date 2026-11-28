import { ellipse, rgba } from "../draw.ts";
import { REED_ARROW_LOOK as L } from "../arrows/arrow.ts";

/**
 * A flecha encaixada na corda (ADR 0116), no referencial do arco (a barriga do arco para +x): o fundo, com as penas, fica na corda (`tailX`) e a ponta de pedra
 * passa da barriga do arco (`tipX`). Quanto mais a corda é puxada, mais o fundo recua e mais comprida a flecha parece.
 */
export function drawNockedArrow(ctx: CanvasRenderingContext2D, tailX: number, tipX: number, tone: (color: string) => string): void {
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba("#1f1510", 0.7); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(tailX, 0); ctx.lineTo(tipX - 3, 0); ctx.stroke();
  const shaft = ctx.createLinearGradient(tailX, 0, tipX, 0);
  shaft.addColorStop(0, tone(L.shaftDark)); shaft.addColorStop(1, tone(L.shaft));
  ctx.strokeStyle = shaft; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tailX, 0); ctx.lineTo(tipX - 3, 0); ctx.stroke();
  ctx.strokeStyle = rgba("#fffbe0", 0.85); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(tailX + 3, -0.5); ctx.lineTo(tipX - 4, -0.5); ctx.stroke();
  ctx.lineCap = "butt";
  // ponta de pedra
  ctx.fillStyle = tone(L.headDark); ctx.beginPath(); ctx.moveTo(tipX + 1, 0); ctx.quadraticCurveTo(tipX - 1.4, -1.2, tipX - 4, -2.4); ctx.lineTo(tipX - 3, 0); ctx.lineTo(tipX - 4, 2.4); ctx.quadraticCurveTo(tipX - 1.4, 1.2, tipX + 1, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = tone(L.head); ctx.beginPath(); ctx.moveTo(tipX + 0.4, 0); ctx.quadraticCurveTo(tipX - 1.4, -0.9, tipX - 3.6, -1.7); ctx.lineTo(tipX - 3, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = tone(L.headLight); ctx.beginPath(); ctx.moveTo(tipX - 0.4, -0.2); ctx.lineTo(tipX - 3.2, -1.3); ctx.lineTo(tipX - 3, -0.2); ctx.closePath(); ctx.fill();
  // penas no fundo, uma de cada lado, e a amarração
  for (const side of [-1, 1]) {
    ctx.fillStyle = tone(side < 0 ? L.feather : L.featherDark);
    ctx.beginPath(); ctx.moveTo(tailX + 4.4, 0); ctx.quadraticCurveTo(tailX + 2, side * 0.8, tailX - 0.4, side * 2.4); ctx.lineTo(tailX + 1.8, side * 2.4); ctx.quadraticCurveTo(tailX + 4, side * 1, tailX + 5.4, side * 0.3); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = tone(L.featherDark); ctx.lineWidth = 0.4;
  ctx.beginPath(); for (const side of [-1, 1]) { ctx.moveTo(tailX + 3.4, side * 0.5); ctx.lineTo(tailX + 0.6, side * 2); ctx.moveTo(tailX + 4.4, side * 0.4); ctx.lineTo(tailX + 1.6, side * 1.9); } ctx.stroke();
  ellipse(ctx, tailX + 5.4, 0, 0.6, 0.9, tone(L.binding));
  ellipse(ctx, tailX - 0.2, 0, 0.7, 1.2, rgba("#1f1510", 0.8)); // o encaixe do fundo na corda
}
