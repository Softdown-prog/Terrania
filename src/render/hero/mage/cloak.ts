import { ellipse, rgba } from "../../draw.ts";
import type { HeroDrawContext } from "../context.ts";
import { MAGE_PAL as P } from "./palette.ts";
import { APPRENTICE_THEME, type MageSetTheme } from "./sets/index.ts";
import { stitchMark } from "./motif.ts";

/**
 * O manto escuro do Mago (ADR 0067): azul-noite, longo, com forro violeta na barra e fio de prata nas bordas, que a inércia do passo
 * arrasta para trás. De costas mostra também o capuz caído sobre os ombros.
 */
export function drawMageCloak(ctx: CanvasRenderingContext2D, c: HeroDrawContext, t: MageSetTheme = APPRENTICE_THEME): void {
  const { tone, wf, trailX, trailY, walkTime, moving, back } = c;
  const wave = Math.sin(walkTime * 2) * moving;
  const cloak = ctx.createLinearGradient(0, -25, 0, -1);
  cloak.addColorStop(0, tone(t.cloak.light)); cloak.addColorStop(0.45, tone(t.cloak.mid)); cloak.addColorStop(1, tone(t.cloak.dark));
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(-9.6 * wf, -24.6);
  ctx.lineTo(9.6 * wf, -24.6);
  ctx.quadraticCurveTo(13.8 * wf + trailX * 0.5, -12, 15.4 * wf + trailX, -1.2 + trailY);
  ctx.quadraticCurveTo(trailX * 0.9, 0.6 + trailY + wave, -15.4 * wf + trailX, -1.2 + trailY);
  ctx.quadraticCurveTo(-13.8 * wf + trailX * 0.5, -12, -9.6 * wf, -24.6);
  ctx.closePath(); ctx.fill();
  // forro violeta na barra
  ctx.strokeStyle = tone(t.lining); ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.moveTo(-15.4 * wf + trailX, -1.2 + trailY);
  ctx.quadraticCurveTo(trailX * 0.9, 0.6 + trailY + wave, 15.4 * wf + trailX, -1.2 + trailY);
  ctx.stroke();
  // dobras
  ctx.strokeStyle = rgba("#000000", 0.24); ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-3.4, -22); ctx.quadraticCurveTo(-4.4 + trailX * 0.4, -12, -5.2 + trailX * 0.9, -2.6 + trailY);
  ctx.moveTo(4, -22); ctx.quadraticCurveTo(5 + trailX * 0.4, -12, 5.8 + trailX * 0.9, -2.6 + trailY);
  ctx.stroke();
  // fio de prata nas bordas
  ctx.strokeStyle = rgba(P.silver, 0.85); ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-9.6 * wf, -24.6); ctx.quadraticCurveTo(-13.8 * wf + trailX * 0.5, -12, -15.4 * wf + trailX, -1.2 + trailY);
  ctx.moveTo(9.6 * wf, -24.6); ctx.quadraticCurveTo(13.8 * wf + trailX * 0.5, -12, 15.4 * wf + trailX, -1.2 + trailY);
  ctx.stroke();
  // sombra de prata sob o forro e estrelinhas douradas bordadas perto da barra
  ctx.strokeStyle = tone(P.silverD); ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-15.4 * wf + trailX, -0.4 + trailY);
  ctx.quadraticCurveTo(trailX * 0.9, 1.4 + trailY + wave, 15.4 * wf + trailX, -0.4 + trailY);
  ctx.stroke();
  for (const [fx, fy, r] of [[-0.6, -6.6, 1.5], [0.1, -4.4, 1.9], [0.68, -7.4, 1.4]] as const) {
    const x = fx * 12 * wf + trailX * 0.9, y = fy + trailY * 0.9 + wave * 0.3;
    stitchMark(t, ctx, x, y, r, tone, t.trim, P.spark);
  }
  if (back) {
    // capuz caído sobre os ombros, com o forro à mostra
    const hood = ctx.createRadialGradient(-2, -27, 1, 0, -25, 9);
    hood.addColorStop(0, tone(t.cloak.light)); hood.addColorStop(0.6, tone(t.cloak.mid)); hood.addColorStop(1, tone(t.cloak.dark));
    ellipse(ctx, 0, -25.4, 7.8 * wf, 4.3, hood);
    ctx.strokeStyle = tone(t.lining); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(0, -25.6, 6.2 * wf, 3, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.strokeStyle = rgba(P.silver, 0.7); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.ellipse(0, -25.4, 7.8 * wf, 4.3, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    // gema bordada no meio do capuz
    ellipse(ctx, 0, -23.2, 0.9, 1.1, tone(t.gem));
  }
}
