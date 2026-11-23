import type { StaffVisualProfile } from "../../engine/character/Staves.ts";
import { ellipse, rgba } from "../draw.ts";
import { STAFF_TOP_Y, type StaffTone } from "./shaft.ts";

/**
 * O engaste do cajado (ADR 0068), no mesmo referencial da haste: garras de madeira em volta de uma gema facetada que pulsa com uma
 * auréola de luz, e a fita atada abaixo dela que balança. O pulso e o balanço vêm do relógio (`time`); com 0, a pose fica parada.
 */
export function paintStaffHead(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number): void {
  const gemY = STAFF_TOP_Y - 7.4;
  const pulse = 0.78 + 0.22 * Math.sin(time * 3);
  // fita atada abaixo do engaste
  const flutter = Math.sin(time * 2.2) * 1.3;
  ctx.fillStyle = tone(v.ribbon);
  ctx.beginPath();
  ctx.moveTo(-1.6, STAFF_TOP_Y + 1.6);
  ctx.quadraticCurveTo(-4 + flutter * 0.5, STAFF_TOP_Y + 4, -5.2 + flutter, STAFF_TOP_Y + 8.4);
  ctx.lineTo(-3.2 + flutter, STAFF_TOP_Y + 7.4);
  ctx.quadraticCurveTo(-2.2, STAFF_TOP_Y + 4.4, 0, STAFF_TOP_Y + 2.4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = tone(v.ribbonDark);
  ctx.beginPath();
  ctx.moveTo(1.6, STAFF_TOP_Y + 1.6);
  ctx.quadraticCurveTo(4 + flutter * 0.4, STAFF_TOP_Y + 4.4, 4.6 + flutter, STAFF_TOP_Y + 9.6);
  ctx.lineTo(2.8 + flutter, STAFF_TOP_Y + 8.2);
  ctx.quadraticCurveTo(2.2, STAFF_TOP_Y + 4.6, 0, STAFF_TOP_Y + 2.4);
  ctx.closePath(); ctx.fill();
  ellipse(ctx, 0, STAFF_TOP_Y + 2, 1.6, 1.2, tone(v.ribbon));
  // auréola de luz atrás da gema
  const halo = ctx.createRadialGradient(0, gemY, 0.5, 0, gemY, 9.5);
  halo.addColorStop(0, rgba(v.gem.glow, 0.55 * pulse)); halo.addColorStop(1, rgba(v.gem.glow, 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, gemY, 9.5, 0, Math.PI * 2); ctx.fill();
  // garras de madeira (a do meio fica atrás da gema)
  const claws = [-1, 1, 0].slice(0, Math.max(2, v.prongs));
  for (const s of claws) {
    ctx.fillStyle = tone(s === 0 ? v.shaft.dark : v.shaft.mid);
    ctx.beginPath();
    if (s === 0) {
      ctx.moveTo(-1, STAFF_TOP_Y); ctx.quadraticCurveTo(-1.6, gemY, 0, gemY - 5.4); ctx.quadraticCurveTo(1.6, gemY, 1, STAFF_TOP_Y);
    } else {
      ctx.moveTo(s * 1.2, STAFF_TOP_Y + 0.4);
      ctx.quadraticCurveTo(s * 5.4, STAFF_TOP_Y - 3, s * 3.8, gemY - 1.4);
      ctx.quadraticCurveTo(s * 3.2, gemY - 4, s * 2.2, gemY - 3.6);
      ctx.quadraticCurveTo(s * 3.6, gemY - 1.6, s * 2.6, STAFF_TOP_Y - 1.6);
      ctx.quadraticCurveTo(s * 1.8, STAFF_TOP_Y - 0.4, s * 0.4, STAFF_TOP_Y + 0.4);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba("#1c1208", 0.55); ctx.lineWidth = 0.7; ctx.stroke();
  }
  // a gema facetada
  const gem = ctx.createRadialGradient(-1, gemY - 1.4, 0.4, 0, gemY, 4.4);
  gem.addColorStop(0, tone(v.gem.light)); gem.addColorStop(0.55, tone(v.gem.mid)); gem.addColorStop(1, tone(v.gem.dark));
  ctx.fillStyle = gem;
  ctx.beginPath();
  ctx.moveTo(0, gemY - 4.6); ctx.lineTo(3, gemY - 1.2); ctx.lineTo(2.2, gemY + 3); ctx.lineTo(0, gemY + 4.4); ctx.lineTo(-2.2, gemY + 3); ctx.lineTo(-3, gemY - 1.2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tone(v.gem.dark); ctx.lineWidth = 0.6; ctx.stroke();
  ctx.strokeStyle = rgba(v.gem.light, 0.8); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, gemY - 4.6); ctx.lineTo(0.4, gemY + 4.2); ctx.moveTo(-3, gemY - 1.2); ctx.lineTo(3, gemY - 1.2); ctx.stroke();
  ellipse(ctx, -1.2, gemY - 2, 0.7, 1.1, "#f4f8ff", -0.4);
}
