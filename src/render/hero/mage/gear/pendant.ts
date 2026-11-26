import { ellipse, rgba } from "../../../draw.ts";
import { MAGE_PAL as P } from "../palette.ts";
import { APPRENTICE_THEME, type MageSetTheme } from "../sets/index.ts";

/**
 * O pingente de cristal baço do Aprendiz (ADR 0078), no referencial inclinado do tronco: uma corrente de prata (elos à mostra), garras de prata e um
 * cristal lapidado em degradê, ainda sem brilho forte. Só de frente; de costas fica só a corrente no pescoço.
 */
export function drawMagePendant(ctx: CanvasRenderingContext2D, side: number, back: boolean, tone: (c: string) => string, t: MageSetTheme = APPRENTICE_THEME): void {
  ctx.lineCap = "round";
  if (back) {
    ctx.strokeStyle = rgba(P.outline, 0.6); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-3.4, -25.2); ctx.quadraticCurveTo(0, -24, 3.4, -25.2); ctx.stroke();
    ctx.strokeStyle = tone(P.silver); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-3.4, -25.2); ctx.quadraticCurveTo(0, -24, 3.4, -25.2); ctx.stroke(); ctx.lineCap = "butt"; return;
  }
  const cx = side * 0.6;
  // a corrente: sombra, prata e elos de relance
  ctx.strokeStyle = rgba(P.outline, 0.6); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-3.5, -25); ctx.quadraticCurveTo(cx, -19.6, 3.5, -25); ctx.stroke();
  ctx.strokeStyle = tone(P.silver); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-3.5, -25); ctx.quadraticCurveTo(cx, -19.6, 3.5, -25); ctx.stroke(); ctx.lineCap = "butt";
  for (const [lx, ly] of [[-2.6, -23.4], [-1.2, -21.9], [cx, -21.4], [2.4, -22.4]] as const) ellipse(ctx, lx, ly, 0.55, 0.4, tone(P.silverD));
  ellipse(ctx, cx, -22.3, 0.8, 0.55, tone(t.trim)); // o anel de ouro que prende o cristal à corrente
  // as garras de prata e o cristal em degradê, com as facetas
  ctx.strokeStyle = tone(P.silver); ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(cx - 1.1, -21.9); ctx.lineTo(cx - 1.8, -20.6); ctx.moveTo(cx + 1.1, -21.9); ctx.lineTo(cx + 1.8, -20.6); ctx.stroke();
  const body = ctx.createLinearGradient(cx - 1.8, -21.8, cx + 1.8, -17.4);
  body.addColorStop(0, tone(t.pendant.stone.light)); body.addColorStop(0.5, tone(t.pendant.stone.mid)); body.addColorStop(1, tone(t.pendant.stone.dark));
  ctx.fillStyle = body; ctx.strokeStyle = rgba(P.outline, 0.75); ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(cx, -22); ctx.lineTo(cx + 1.8, -19.9); ctx.lineTo(cx, -17.2); ctx.lineTo(cx - 1.8, -19.9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba("#e8f2fb", 0.7); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(cx - 1.8, -19.9); ctx.lineTo(cx + 1.8, -19.9); ctx.moveTo(cx, -22); ctx.lineTo(cx, -17.2); ctx.stroke();
  ellipse(ctx, cx - 0.5, -20.4, 0.45, 0.8, rgba(P.spark, 0.8));
  ellipse(ctx, cx, -19.9, 2.6, 2.8, rgba(t.gem, 0.1));
}
