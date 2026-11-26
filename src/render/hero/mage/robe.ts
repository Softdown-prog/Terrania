import type { HeroDrawContext } from "../context.ts";
import { MAGE_PAL as P } from "./palette.ts";
import { rgba } from "../../draw.ts";
import { APPRENTICE_THEME, type MageSetTheme } from "./sets/index.ts";
import { stitchMark } from "./motif.ts";

/**
 * A barra da túnica azul-violeta (ADR 0067): cai da cintura até perto dos tornozelos, balança com o passo (cada lado sobe com o pé) e
 * leva um debrum dourado sobre o forro violeta, estrelinhas bordadas, sombra no pé e dobras que dão volume.
 */
export function drawMageRobe(ctx: CanvasRenderingContext2D, c: HeroDrawContext, t: MageSetTheme = APPRENTICE_THEME): void {
  const { tone, wf, trailX, walkTime, moving, liftA, liftB } = c;
  const sway = trailX * 0.35 + Math.sin(walkTime * 2) * moving * 0.8;
  const hemL = -3.3 - liftA * 0.5, hemR = -3.3 - liftB * 0.5, hemMid = -2.6 - Math.max(liftA, liftB) * 0.2;
  const outline = (): void => {
    ctx.beginPath();
    ctx.moveTo(-9.4 * wf, -10.6);
    ctx.lineTo(9.4 * wf, -10.6);
    ctx.quadraticCurveTo(11.2 * wf + sway, -6.6, 11.8 * wf + sway, hemR);
    ctx.quadraticCurveTo(6 * wf + sway * 0.8, hemR + 1.9, sway * 0.6, hemMid);
    ctx.quadraticCurveTo(-6 * wf + sway * 0.8, hemL + 1.9, -11.8 * wf + sway, hemL);
    ctx.quadraticCurveTo(-11.2 * wf + sway, -6.6, -9.4 * wf, -10.6);
    ctx.closePath();
  };
  const body = ctx.createLinearGradient(-12 * wf, 0, 12 * wf, 0);
  body.addColorStop(0, tone(t.tunic.light)); body.addColorStop(0.5, tone(t.tunic.mid)); body.addColorStop(1, tone(t.tunic.dark));
  ctx.fillStyle = body; outline(); ctx.fill();
  // sombra que escurece o pé da barra
  const shade = ctx.createLinearGradient(0, -9, 0, -2);
  shade.addColorStop(0, rgba("#000000", 0)); shade.addColorStop(1, rgba("#000000", 0.3));
  ctx.fillStyle = shade; outline(); ctx.fill();
  ctx.strokeStyle = rgba(P.outline, 0.5); ctx.lineWidth = 1; outline(); ctx.stroke();
  // dobras
  ctx.strokeStyle = rgba("#000000", 0.2); ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const x of [-5.6, -0.4, 5]) { ctx.moveTo(x * wf, -10); ctx.quadraticCurveTo((x + 0.6) * wf + sway * 0.4, -6, (x * 1.1) * wf + sway * 0.7, -2.7); }
  ctx.stroke();
  // forro violeta à mostra sob o debrum dourado
  ctx.strokeStyle = tone(t.lining); ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11.8 * wf + sway, hemL + 0.7);
  ctx.quadraticCurveTo(-6 * wf + sway * 0.8, hemL + 2.5, sway * 0.6, hemMid + 0.7);
  ctx.quadraticCurveTo(6 * wf + sway * 0.8, hemR + 2.5, 11.8 * wf + sway, hemR + 0.7);
  ctx.stroke();
  // debrum dourado na barra
  ctx.strokeStyle = tone(t.trim); ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-11.8 * wf + sway, hemL - 0.3);
  ctx.quadraticCurveTo(-6 * wf + sway * 0.8, hemL + 1.6, sway * 0.6, hemMid - 0.3);
  ctx.quadraticCurveTo(6 * wf + sway * 0.8, hemR + 1.6, 11.8 * wf + sway, hemR - 0.3);
  ctx.stroke();
  // bordados acima da barra: as estrelinhas do Aprendiz ou os redemoinhos da Brisa
  for (const [fx, r] of [[-0.62, 1.3], [0.04, 1.6], [0.66, 1.3]] as const) {
    const x = fx * 9 * wf + sway * 0.6, y = -6.2 - (fx < 0 ? liftA : liftB) * 0.3;
    stitchMark(t, ctx, x, y, r, tone, t.trimD, fx === 0.04 ? t.gem : P.spark);
  }
}
