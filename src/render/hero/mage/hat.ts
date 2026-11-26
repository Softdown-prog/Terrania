import { TAU, ellipse, rgba } from "../../draw.ts";
import type { HeroDrawContext } from "../context.ts";
import { MAGE_PAL as P } from "./palette.ts";
import { APPRENTICE_THEME, type MageSetTheme } from "./sets/index.ts";

/** Estrela de cinco pontas, para o chapéu. */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? r : r * 0.42;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

/** Duas penas claras presas à faixa (o Chapéu de Penas da Brisa): a de trás mais alta e inclinada, a da frente curta, com a nervura e o fio escuro do contorno. */
function windPlumes(ctx: CanvasRenderingContext2D, x: number, y: number, bend: number, tone: (c: string) => string, t: MageSetTheme): void {
  for (const [dx, lean, len, lw] of [[-0.8, -0.34, 13.5, 2.5], [1, 0.3, 10, 2.2]] as const) {
    const tx = x + dx + lean * len + bend * 0.2, ty = y - len;
    ctx.fillStyle = tone(t.trim); ctx.strokeStyle = rgba(P.outline, 0.65); ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x + dx, y);
    ctx.quadraticCurveTo(x + dx - lw + lean * len * 0.4, y - len * 0.5, tx, ty);
    ctx.quadraticCurveTo(x + dx + lw + lean * len * 0.7, y - len * 0.45, x + dx, y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = tone(t.trimD); ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.quadraticCurveTo(x + dx + lean * len * 0.3, y - len * 0.5, tx, ty); ctx.stroke();
    ctx.strokeStyle = tone(t.hat.light); ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(x + dx + lean * len * 0.35, y - len * 0.45); ctx.lineTo(x + dx + lean * len * 0.35 - lw * 0.9, y - len * 0.5 + 1.6);
    ctx.moveTo(x + dx + lean * len * 0.55, y - len * 0.65); ctx.lineTo(x + dx + lean * len * 0.55 + lw * 0.8, y - len * 0.7 + 1.5); ctx.stroke();
  }
}

/**
 * O chapéu pontudo de feiticeiro (ADR 0067): aba larga com sombra na testa, cone com a ponta caída que balança com o passo, faixa dourada
 * com fivela de prata (de frente) e uma estrela dourada. De costas mostra a aba e o cone, sem fivela nem estrela.
 */
export function drawWizardHat(ctx: CanvasRenderingContext2D, c: HeroDrawContext, t: MageSetTheme = APPRENTICE_THEME): void {
  const { tone, headX, headY, side, back, tailSway } = c;
  const baseY = headY - 7.4;
  const bend = side * 2.4 + Math.max(-2.2, Math.min(2.2, tailSway * 0.35));
  const tipX = headX + bend, tipY = headY - 27.6;
  // sombra da aba sobre o rosto
  if (!back) ellipse(ctx, headX + side * 0.8, headY - 3.6, 8.8, 2.7, rgba("#000000", 0.28));
  // aba
  const brim = ctx.createLinearGradient(headX - 13, 0, headX + 13, 0);
  brim.addColorStop(0, tone(t.hat.dark)); brim.addColorStop(0.35, tone(t.hat.mid)); brim.addColorStop(0.7, tone(t.hat.light)); brim.addColorStop(1, tone(t.hat.dark));
  ellipse(ctx, headX, baseY + 0.5, 13.2, 3.9, brim, side * 0.05);
  ctx.strokeStyle = rgba(P.outline, 0.55); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(headX, baseY + 0.5, 13.2, 3.9, side * 0.05, 0, TAU); ctx.stroke();
  // cone
  const cone = ctx.createLinearGradient(headX - 8, 0, headX + 8, 0);
  cone.addColorStop(0, tone(t.hat.light)); cone.addColorStop(0.5, tone(t.hat.mid)); cone.addColorStop(1, tone(t.hat.dark));
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(headX - 8.2, baseY);
  ctx.quadraticCurveTo(headX - 6.4 + bend * 0.25, headY - 17, tipX - 0.6, tipY + 1.6);
  ctx.quadraticCurveTo(tipX + 3.4 + bend * 0.3, tipY - 2.4, tipX + 2.5, tipY + 3.6);
  ctx.quadraticCurveTo(headX + 6.8 + bend * 0.35, headY - 16, headX + 8.2, baseY);
  ctx.quadraticCurveTo(headX, baseY + 3.2, headX - 8.2, baseY);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(P.outline, 0.6); ctx.lineWidth = 1; ctx.stroke();
  // dobra e brilho do tecido
  ctx.strokeStyle = rgba("#000000", 0.2); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(headX + 1.4, baseY + 0.6); ctx.quadraticCurveTo(headX + 1 + bend * 0.2, headY - 17, tipX + 0.8, tipY + 4); ctx.stroke();
  ctx.strokeStyle = tone(t.hatSheen); ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(headX - 6.2, baseY - 0.8); ctx.quadraticCurveTo(headX - 5 + bend * 0.2, headY - 16, tipX - 1.2, tipY + 4); ctx.stroke();
  // faixa dourada
  ctx.fillStyle = tone(t.trim);
  ctx.beginPath();
  ctx.moveTo(headX - 8.4, baseY - 1.9);
  ctx.quadraticCurveTo(headX, baseY + 1.6, headX + 8.4, baseY - 1.9);
  ctx.lineTo(headX + 8.5, baseY + 0.1);
  ctx.quadraticCurveTo(headX, baseY + 3.7, headX - 8.5, baseY + 0.1);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tone(t.trimD); ctx.lineWidth = 0.7; ctx.stroke();
  if (!back) {
    // fivela de prata com gema e a estrela do cone
    ctx.fillStyle = tone(P.silver); ctx.fillRect(headX + side * 1.2 - 1.9, baseY - 0.1, 3.8, 2.8);
    ctx.fillStyle = tone(t.gem); ctx.fillRect(headX + side * 1.2 - 0.8, baseY + 0.5, 1.6, 1.4);
    if (t.motif === "wind") windPlumes(ctx, headX + side * 3.4, baseY - 0.6, bend, tone, t);
    else {
      star(ctx, headX + bend * 0.3 + side * 0.4, headY - 15.2, 2.5, tone(t.trim));
      ellipse(ctx, headX + bend * 0.3 - 3.4, headY - 12, 0.6, 0.6, tone(P.spark));
      ellipse(ctx, headX + bend * 0.3 + 3.6, headY - 19.5, 0.5, 0.5, tone(P.spark));
    }
  }
}
