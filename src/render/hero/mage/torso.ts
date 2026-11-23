import { ellipse, rgba } from "../../draw.ts";
import type { HeroDrawContext } from "../context.ts";
import { MAGE_PAL as P } from "./palette.ts";

/**
 * Os detalhes do tronco do Mago (ADR 0067), no mesmo referencial inclinado da túnica: o decote em V com debrum dourado e a abotoadura,
 * o capuz do manto caído em volta dos ombros e o fecho de prata com a gema no pescoço.
 */
export function drawMageTorso(ctx: CanvasRenderingContext2D, c: HeroDrawContext): void {
  const { tone, wf, side, back } = c;
  if (!back) {
    // decote em V com debrum dourado e abotoadura
    ctx.fillStyle = tone(P.tunic.dark);
    ctx.beginPath(); ctx.moveTo(-4.6 * wf, -25.2); ctx.lineTo(4.6 * wf, -25.2); ctx.lineTo(side * 0.8, -20.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = tone(P.gold); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-4.6 * wf, -25.2); ctx.lineTo(side * 0.8, -20.4); ctx.lineTo(4.6 * wf, -25.2); ctx.stroke();
    ctx.strokeStyle = rgba(P.gold, 0.8); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(side * 0.8, -20.4); ctx.lineTo(side * 1.4, -13.6); ctx.stroke();
    ellipse(ctx, side * 1.1, -17.6, 0.7, 0.7, tone(P.gold));
  } else {
    ctx.fillStyle = rgba("#000000", 0.18); ctx.fillRect(-0.6, -24, 1.2, 12);
  }
  // capuz do manto caído em volta dos ombros
  for (const s of [-1, 1]) {
    const lobe = ctx.createRadialGradient(s * 7.4 * wf - s * 1.2, -25.2, 0.5, s * 7.4 * wf, -24.2, 4.8);
    lobe.addColorStop(0, tone(P.cloak.light)); lobe.addColorStop(0.55, tone(P.cloak.mid)); lobe.addColorStop(1, tone(P.cloak.dark));
    ellipse(ctx, s * 7.4 * wf, -24.2, 4.5, 3.2, lobe);
    ellipse(ctx, s * 7.4 * wf - s * 0.6, -25, 2.6, 1.2, rgba(P.silver, 0.55));
    ellipse(ctx, s * 7.4 * wf + s * 1, -23.2, 2, 0.9, tone(P.lining));
  }
  if (!back) {
    // fecho de prata com gema, e a correntinha até os ombros
    ctx.strokeStyle = rgba(P.silver, 0.85); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-6.4 * wf, -24); ctx.quadraticCurveTo(0, -21.4, 6.4 * wf, -24); ctx.stroke();
    ellipse(ctx, 0, -22.6, 1.8, 1.8, tone(P.silver));
    ctx.strokeStyle = tone(P.silverD); ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(0, -22.6, 1.8, 0, Math.PI * 2); ctx.stroke();
    ellipse(ctx, 0, -22.6, 0.9, 0.9, tone(P.gem));
    ellipse(ctx, -0.3, -22.9, 0.35, 0.35, tone(P.spark));
  }
}
