import { ellipse, rgba } from "../../draw.ts";
import type { HeroDrawContext } from "../context.ts";
import { ARCHER_PAL as P } from "./palette.ts";

/**
 * Os detalhes do tronco do Arqueiro (ADR 0114), no mesmo referencial inclinado do gibão: a gola em V fechada por cordões cruzados, a correia da aljava que
 * cruza o peito do ombro de trás ao quadril, e o cinto com a fivela e a bolsinha. De costas, só a correia e o cinto.
 */
export function drawArcherTorso(ctx: CanvasRenderingContext2D, c: HeroDrawContext): void {
  const { tone, wf, side, back } = c;
  if (!back) {
    // gola em V com cordões cruzados
    ctx.fillStyle = tone(P.jerkin.dark);
    ctx.beginPath(); ctx.moveTo(-4 * wf, -25.2); ctx.lineTo(4 * wf, -25.2); ctx.lineTo(side * 0.6, -19.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = tone(P.lace); ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) { const y = -23.6 + i * 1.8, w = 3 - i * 0.8; ctx.moveTo(side * 0.6 - w * wf, y); ctx.lineTo(side * 0.6 + w * wf, y + 1.4); ctx.moveTo(side * 0.6 + w * wf, y); ctx.lineTo(side * 0.6 - w * wf, y + 1.4); }
    ctx.stroke();
  }
  // correia da aljava: do ombro de trás ao quadril do lado oposto
  const sx = -6.2 * wf, ex = 7.4 * wf;
  const strap = ctx.createLinearGradient(sx, -25, ex, -9.4);
  strap.addColorStop(0, tone(P.leather.mid)); strap.addColorStop(1, tone(P.strap));
  ctx.strokeStyle = strap; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(sx, -25); ctx.lineTo(ex, -9.4); ctx.stroke();
  ctx.strokeStyle = rgba(P.strapLight, 0.8); ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(sx + 0.8, -24.6); ctx.lineTo(ex + 0.8, -9.2); ctx.stroke();
  ctx.lineCap = "butt";
  ellipse(ctx, sx + (ex - sx) * 0.42, -25 + 15.6 * 0.42, 1.2, 1.2, tone(P.buckle));
  ellipse(ctx, sx + (ex - sx) * 0.42 - 0.3, -25 + 15.6 * 0.42 - 0.3, 0.4, 0.4, rgba("#fffbe0", 0.95));
  if (back) {
    // de costas: a costura da coluna, a canga dos ombros e os rebites da correia
    ctx.strokeStyle = tone(P.lace); ctx.lineWidth = 0.5; ctx.setLineDash([1.4, 1.1]);
    ctx.beginPath(); ctx.moveTo(0.4, -23); ctx.quadraticCurveTo(-0.4, -17, 0.2, -11); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = tone(P.jerkin.dark); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-8 * wf, -22.4); ctx.quadraticCurveTo(0, -19.6, 8 * wf, -22.4); ctx.stroke();
    for (const t of [0.15, 0.7]) ellipse(ctx, sx + (ex - sx) * t, -25 + 15.6 * t, 0.6, 0.6, tone(P.buckle));
    // remendo de couro na omoplata e o brilho do gibão
    ellipse(ctx, 4.4 * wf, -19.4, 2.4, 1.8, tone(P.leather.mid));
    ctx.strokeStyle = tone(P.lace); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(4.4 * wf, -19.4, 1.8, 1.3, 0, 0, Math.PI * 2); ctx.stroke();
    ellipse(ctx, -3.6 * wf, -21.6, 2.6, 1, rgba(P.jerkin.light, 0.7));
  }
  // cinto, fivela e bolsinha de couro no quadril
  const belt = ctx.createLinearGradient(0, -10, 0, -7.6);
  belt.addColorStop(0, tone(P.leather.mid)); belt.addColorStop(1, tone(P.leather.dark));
  ctx.fillStyle = belt; ctx.fillRect(-8.9 * wf, -10, 17.8 * wf, 2.4);
  ctx.strokeStyle = rgba("#1f1510", 0.6); ctx.lineWidth = 0.6; ctx.strokeRect(-8.9 * wf, -10, 17.8 * wf, 2.4);
  if (!back) {
    ellipse(ctx, side * 0.8, -8.8, 1.7, 1.3, tone(P.buckle));
    ellipse(ctx, side * 0.8, -8.8, 0.8, 0.6, tone(P.buckleDark));
    ellipse(ctx, side * 0.8 - 0.5, -9.2, 0.45, 0.35, rgba("#fffbe0", 0.9));
    ctx.strokeStyle = tone(P.lace); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-2.6 * wf, -22); ctx.quadraticCurveTo(-3 * wf, -16, -2.8 * wf, -11); ctx.moveTo(2.8 * wf, -22); ctx.quadraticCurveTo(3.2 * wf, -16, 3 * wf, -11); ctx.stroke();
    ctx.fillStyle = tone(P.leather.mid);
    ctx.beginPath(); ctx.moveTo(-8 * wf, -8); ctx.quadraticCurveTo(-8.6 * wf, -3.6, -6 * wf, -3.2); ctx.quadraticCurveTo(-3.8 * wf, -3.4, -4.2 * wf, -8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = tone(P.leather.dark); ctx.lineWidth = 0.6; ctx.stroke();
    ellipse(ctx, -6.1 * wf, -6.4, 0.7, 0.7, tone(P.buckle));
  }
}
