import type { StaffVisualProfile } from "../../../engine/character/Staves.ts";
import { ellipse, rgba } from "../../draw.ts";
import { STAFF_GEM_Y, STAFF_TOP_Y, type StaffTone } from "../shaft.ts";

/** Uma pena: o cálamo à esquerda de `side`, a vexilo em gota e as barbas riscadas. `side` -1 abre para a esquerda, 1 para a direita. */
function feather(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, x: number, y: number, length: number, width: number, side: number, lift: number): void {
  const tipX = x + side * width * 1.9, tipY = y - length;
  const vane = ctx.createLinearGradient(x, y, tipX, tipY);
  vane.addColorStop(0, tone(v.shaft.dark)); vane.addColorStop(0.45, tone(v.shaft.mid)); vane.addColorStop(1, tone(v.shaft.light));
  ctx.fillStyle = vane;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + side * width * 2.3, y - length * 0.3 + lift, tipX, tipY);
  ctx.quadraticCurveTo(x + side * width * 0.2, y - length * 0.62, x, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#2b2418", 0.55); ctx.lineWidth = 0.55; ctx.stroke();
  // ponta da pena com brilho de vento
  ctx.strokeStyle = rgba(v.gem.light, 0.8); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(tipX - side * width * 0.6, tipY + length * 0.12); ctx.quadraticCurveTo(tipX - side * width * 0.1, tipY + length * 0.04, tipX, tipY); ctx.stroke();
  // cálamo claro e barbas
  ctx.strokeStyle = tone(v.sheen); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + side * width * 0.9, y - length * 0.5, tipX, tipY); ctx.stroke();
  ctx.strokeStyle = rgba(v.gem.mid, 0.75); ctx.lineWidth = 0.4;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) { const t = i / 4; ctx.moveTo(x + side * width * 0.9 * t, y - length * 0.5 * t); ctx.lineTo(x + side * width * (0.9 * t + 1.1), y - length * (0.5 * t + 0.12)); }
  ctx.stroke();
}

/**
 * O que faz o Cajado da Brisa (ADR 0073) parecer de vento: duas penas grandes abertas de cada lado da gema (atrás dela), duas penas
 * atadas na haste que balançam, e (na frente) riscos de vento que giram em volta da gema. `layer` escolhe o que fica atrás ou na frente
 * da gema; `time` faz as penas balançarem e o vento girar.
 */
export function paintFeatherMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  const sway = Math.sin(time * 2.4);
  if (layer === "back") {
    feather(ctx, v, tone, -2.2, STAFF_TOP_Y + 1, 14, 3.4, -1, sway * 0.8);
    feather(ctx, v, tone, 2.2, STAFF_TOP_Y + 1, 14, 3.4, 1, -sway * 0.8);
    // duas penas atadas na haste, pendendo, e o fio que as prende
    for (const [y, side] of [[-17, -1], [-9, 1]] as const) {
      ctx.save(); ctx.translate(side * 1.6, y); ctx.rotate(side * (0.5 + sway * 0.12));
      feather(ctx, v, tone, 0, 0, 7.5, 2.2, side, 0); ctx.restore();
      ctx.fillStyle = tone(v.wrap); ctx.fillRect(-2.1, y - 0.7, 4.2, 1.5);
      ctx.strokeStyle = tone(v.wrapDark); ctx.lineWidth = 0.4; ctx.strokeRect(-2.1, y - 0.7, 4.2, 1.5);
    }
    return;
  }
  // riscos de vento em volta da gema: dois arcos que giram
  ctx.lineCap = "round";
  for (let i = 0; i < 2; i++) {
    const a = time * 2.2 + i * Math.PI;
    ctx.strokeStyle = rgba(i ? v.gem.light : v.gem.glow, 0.75); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 7.4, a, a + 1.2); ctx.stroke();
  }
  ctx.lineCap = "butt";
  ellipse(ctx, Math.cos(time * 2.2) * 7.4, STAFF_GEM_Y + Math.sin(time * 2.2) * 7.4, 0.8, 0.8, rgba("#ffffff", 0.85));
}
