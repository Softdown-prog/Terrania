import { ellipse, rgba } from "../../draw.ts";
import type { HeroDrawContext } from "../context.ts";
import { ARCHER_PAL as P } from "./palette.ts";

/**
 * A aljava do Arqueiro às costas (ADR 0114), no lugar do manto dos outros heróis: um cilindro de couro inclinado, preso por uma correia que cruza o peito
 * (ver `torso.ts`), com as flechas à mostra pela boca. De frente, o corpo esconde a parte de baixo e só a boca com as penas aparece acima do ombro de trás;
 * de costas, a aljava inteira cruza as costas. Balança de leve com o passo.
 */
export function drawArcherQuiver(ctx: CanvasRenderingContext2D, c: HeroDrawContext): void {
  const { tone, wf, back, trailX, walkTime, moving } = c;
  const sway = Math.sin(walkTime * 2) * moving * 0.7 + trailX * 0.12;
  const mx = -6.4 * wf + sway, my = -29.6, bx = 5.2 * wf + sway * 0.4, by = -8.4;
  const len = Math.hypot(bx - mx, by - my), half = 2.9;
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(Math.atan2(-(bx - mx), by - my));
  // as flechas pela boca: hastes de junco e penas
  ctx.strokeStyle = tone(P.shaft); ctx.lineWidth = 0.9; ctx.lineCap = "round";
  ctx.beginPath();
  for (const [x, top] of [[-1.7, -8.2], [0.1, -9.4], [1.8, -7.6]] as const) { ctx.moveTo(x, 0.4); ctx.lineTo(x * 1.25, top); }
  ctx.stroke(); ctx.lineCap = "butt";
  for (const [x, top, tilt] of [[-1.7, -8.2, -0.12], [0.1, -9.4, 0], [1.8, -7.6, 0.12]] as const) {
    ctx.save(); ctx.translate(x * 1.25, top + 2.4); ctx.rotate(tilt);
    ellipse(ctx, 0, 0, 1.15, 2.7, tone(P.feather));
    ellipse(ctx, 0.35, 0.4, 0.55, 2, tone(P.featherDark));
    ctx.restore();
  }
  // o corpo de couro: um cilindro que afina para o fundo
  const body = ctx.createLinearGradient(-half, 0, half, 0);
  body.addColorStop(0, tone(P.leather.light)); body.addColorStop(0.5, tone(P.leather.mid)); body.addColorStop(1, tone(P.leather.dark));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-half, 0); ctx.lineTo(-half * 0.8, len);
  ctx.quadraticCurveTo(0, len + 2.4, half * 0.8, len);
  ctx.lineTo(half, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#1f1510", 0.7); ctx.lineWidth = 0.8; ctx.stroke();
  // a boca aberta, por dentro escura
  ellipse(ctx, 0, 0, half, 1.5, rgba("#1f1510", 0.85));
  ellipse(ctx, 0, 0.2, half - 0.9, 0.8, tone(P.leather.dark));
  // cintas de couro, costura e a argola da correia
  ctx.strokeStyle = tone(P.strap); ctx.lineWidth = 1.5;
  ctx.beginPath(); for (const f of [0.28, 0.62]) { ctx.moveTo(-half * (1 - 0.2 * f), len * f); ctx.lineTo(half * (1 - 0.2 * f), len * f); } ctx.stroke();
  ctx.strokeStyle = rgba(P.lace, 0.7); ctx.lineWidth = 0.5; ctx.setLineDash([1.2, 1]);
  ctx.beginPath(); ctx.moveTo(half * 0.45, 1.4); ctx.lineTo(half * 0.4, len - 1); ctx.stroke(); ctx.setLineDash([]);
  ellipse(ctx, 0, len * 0.28, 1, 1, tone(P.buckle));
  if (back) ellipse(ctx, 0, len * 0.62, 1, 1, tone(P.buckle));
  ctx.restore();
}
