import type { StaffVisualProfile } from "../../../engine/character/Staves.ts";
import { ellipse, mix, rgba } from "../../draw.ts";
import { STAFF_GEM_Y, STAFF_TOP_Y, type StaffTone } from "../shaft.ts";

/** Uma estrela de quatro pontas que pisca. */
function star(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, size: number, alpha: number): void {
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size * 0.24, y - size * 0.24); ctx.lineTo(x + size, y); ctx.lineTo(x + size * 0.24, y + size * 0.24); ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.24, y + size * 0.24); ctx.lineTo(x - size, y); ctx.lineTo(x - size * 0.24, y - size * 0.24); ctx.closePath(); ctx.fill();
}

/** Uma runa gravada na haste: três traços que brilham na cor da gema. */
function rune(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, y: number, variant: number): void {
  ctx.lineCap = "round";
  ctx.strokeStyle = tone(v.shaft.dark); ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-1.2, y - 1.8); ctx.lineTo(0.9, y); ctx.lineTo(-0.9 + variant * 0.6, y + 1.9); ctx.stroke();
  ctx.strokeStyle = rgba(v.gem.glow, 0.9); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(-1.2, y - 1.8); ctx.lineTo(0.9, y); ctx.lineTo(-0.9 + variant * 0.6, y + 1.9); ctx.stroke(); ctx.lineCap = "butt";
}

/**
 * O que faz o Cajado da Lua Negra (ADR 0076) parecer de sombra: uma lua crescente de ébano roxo que abraça a gema por baixo, com a borda clara,
 * runas que brilham na haste e anéis de ébano; e (na frente) um halo violeta, duas fitas de sombra que sobem retorcendo-se e três estrelas que piscam.
 * `time` faz as fitas ondularem e as estrelas piscarem.
 */
export function paintMoonMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  if (layer === "back") {
    // a lua crescente: o arco de fora (grande) e o de dentro (menor e mais alto) deixam só a foice, com a borda clara
    const body = ctx.createLinearGradient(-9, STAFF_GEM_Y, 9, STAFF_GEM_Y + 9);
    body.addColorStop(0, tone(v.shaft.light)); body.addColorStop(0.5, tone(v.shaft.mid)); body.addColorStop(1, tone(v.shaft.dark));
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y + 1.2, 10.4, Math.PI * 0.06, Math.PI * 0.94); ctx.arc(0, STAFF_GEM_Y - 2.6, 8.4, Math.PI * 0.94, Math.PI * 0.06, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba("#0a0612", 0.8); ctx.lineWidth = 0.7; ctx.stroke();
    ctx.strokeStyle = tone(v.collar); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y + 1.2, 9.8, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
    ellipse(ctx, -9.6, STAFF_GEM_Y + 3.4, 1.1, 1.1, tone(v.shaft.light)); ellipse(ctx, 9.6, STAFF_GEM_Y + 3.4, 1.1, 1.1, tone(v.shaft.light)); // as pontas da foice
    // runas gravadas na haste e anéis de ébano
    rune(ctx, v, tone, -19.5, 0); rune(ctx, v, tone, -12.5, 1); rune(ctx, v, tone, -5.5, 0);
    ctx.fillStyle = tone(v.wrapDark); ctx.fillRect(-2.2, STAFF_TOP_Y + 2.6, 4.4, 1.4); ctx.fillRect(-2.1, -9.4, 4.2, 1.1);
    ctx.fillStyle = tone(v.collar); ctx.fillRect(-2.2, STAFF_TOP_Y + 2.6, 4.4, 0.4);
    ellipse(ctx, 0.4, 3.8, 0.8, 1, tone(mix(v.shaft.mid, v.gem.dark, 0.4)));
    return;
  }
  const halo = ctx.createRadialGradient(0, STAFF_GEM_Y, 1, 0, STAFF_GEM_Y, 11);
  halo.addColorStop(0, rgba(v.gem.light, 0.4)); halo.addColorStop(0.55, rgba(v.gem.glow, 0.24)); halo.addColorStop(1, rgba(v.gem.dark, 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 11, 0, Math.PI * 2); ctx.fill();
  // fitas de sombra: sobem da gema retorcendo-se, escuras com o fio violeta
  ctx.lineCap = "round";
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1, sway = Math.sin(time * 2.1 + i * 2.4) * 2.4, rise = 4.4 + 1.4 * Math.sin(time * 1.7 + i);
    const x0 = side * 3.2, y0 = STAFF_GEM_Y - 3;
    ctx.strokeStyle = rgba("#0a0612", 0.75); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + side * 4 + sway, y0 - rise * 0.5, x0 - side * 1.2 + sway, y0 - rise); ctx.quadraticCurveTo(x0 + side * 3 + sway, y0 - rise * 1.2, x0 + side * 0.8 + sway * 1.4, y0 - rise * 1.5); ctx.stroke();
    ctx.strokeStyle = rgba(v.gem.mid, 0.8); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + side * 4 + sway, y0 - rise * 0.5, x0 - side * 1.2 + sway, y0 - rise); ctx.stroke();
  }
  ctx.lineCap = "butt";
  for (let i = 0; i < 3; i++) {
    const a = i * 2.3 + 0.5, pulse = 0.5 + 0.5 * Math.sin(time * 2.8 + i * 2.1);
    star(ctx, i % 2 ? v.gem.light : "#ffffff", Math.cos(a) * 9.4, STAFF_GEM_Y - 1 + Math.sin(a) * 7, 1 + pulse * 1.6, 0.3 + pulse * 0.65);
  }
}
