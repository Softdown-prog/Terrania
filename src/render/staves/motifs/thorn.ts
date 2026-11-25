import type { StaffVisualProfile } from "../../../engine/character/Staves.ts";
import { ellipse, rgba } from "../../draw.ts";
import { STAFF_GEM_Y, STAFF_TOP_Y, type StaffTone } from "../shaft.ts";

/** Uma folha: do cabo até a ponta, com a nervura clara no meio. `side` -1 abre para a esquerda, 1 para a direita. */
function leaf(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, x: number, y: number, length: number, width: number, side: number, lift: number): void {
  const tipX = x + side * length, tipY = y - length * 0.7 + lift;
  const blade = ctx.createLinearGradient(x, y, tipX, tipY);
  blade.addColorStop(0, tone(v.shaft.dark)); blade.addColorStop(0.55, tone(v.shaft.mid)); blade.addColorStop(1, tone(v.shaft.light));
  ctx.fillStyle = blade;
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + side * length * 0.3, y - width * 1.6 + lift, tipX, tipY);
  ctx.quadraticCurveTo(x + side * length * 0.9, y + width * 0.4 + lift * 0.4, x, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#10240c", 0.6); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.strokeStyle = tone(v.sheen); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + side * length * 0.5, y - width * 0.4 + lift * 0.6, tipX, tipY); ctx.stroke();
}

/** Um espinho: um triângulo curvo na haste, escuro, com a ponta clara. */
function thorn(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, y: number, side: number, size: number): void {
  const x = side * 1.5;
  ctx.fillStyle = tone(v.shaft.dark);
  ctx.beginPath(); ctx.moveTo(x, y - size * 0.55); ctx.quadraticCurveTo(x + side * size * 0.6, y - size * 0.3, x + side * size * 1.5, y - size * 1.1); ctx.quadraticCurveTo(x + side * size * 0.7, y + size * 0.1, x, y + size * 0.45); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#10240c", 0.6); ctx.lineWidth = 0.4; ctx.stroke();
  ellipse(ctx, x + side * size * 1.3, y - size * 1, 0.3, 0.3, tone(v.sheen));
}

/**
 * O que faz o Cajado do Espinheiro (ADR 0075) parecer de natureza: duas folhas grandes que abraçam a gema (atrás dela), uma trepadeira
 * enrolada e espinhos alternados na haste, e (na frente) um botão de flor ao lado da gema e três pétalas e esporos que flutuam. `time` faz as
 * folhas balançarem e os esporos descerem.
 */
export function paintThornMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  if (layer === "back") {
    const sway = Math.sin(time * 1.9) * 0.9;
    leaf(ctx, v, tone, -2.2, STAFF_TOP_Y + 1.4, 11, 4.4, -1, sway);
    leaf(ctx, v, tone, 2.2, STAFF_TOP_Y + 1.4, 11, 4.4, 1, -sway);
    for (const [y, side, size] of [[-20, 1, 2.1], [-14, -1, 2.3], [-8, 1, 2.1], [-2, -1, 2.3], [5, 1, 2]] as const) thorn(ctx, v, tone, y, side, size);
    // a trepadeira, enrolada na haste, com um fio claro por cima
    ctx.lineCap = "round";
    ctx.strokeStyle = tone(v.shaft.dark); ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(-1.8, 8); ctx.quadraticCurveTo(2.4, 3, -1.8, -1); ctx.quadraticCurveTo(-3.2, -4, 0.6, -8); ctx.stroke();
    ctx.strokeStyle = tone(v.shaft.light); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-1.8, 7.6); ctx.quadraticCurveTo(2.2, 3, -1.8, -1.2); ctx.stroke(); ctx.lineCap = "butt";
    return;
  }
  // o botão de flor ao lado da gema (as cores da fita) e pétalas e esporos que descem
  for (const [dx, dy, r, color] of [[7.4, STAFF_GEM_Y + 1.6, 1.9, v.ribbon], [8.6, STAFF_GEM_Y + 0.4, 1.3, v.ribbonDark], [6.4, STAFF_GEM_Y + 0.2, 1.2, v.ribbon]] as const) ellipse(ctx, dx, dy, r, r * 0.9, tone(color));
  ellipse(ctx, 7.5, STAFF_GEM_Y + 1.2, 0.6, 0.6, tone(v.gem.light));
  ellipse(ctx, 7.1, STAFF_GEM_Y + 0.7, 0.55, 0.4, "#f7b3d2"); // pétala clara do botão
  ellipse(ctx, -6.6, STAFF_GEM_Y + 2.2, 0.55, 0.8, "#bfe8ff"); ellipse(ctx, -6.75, STAFF_GEM_Y + 1.9, 0.2, 0.28, "#ffffff"); // gota de orvalho na folha
  ellipse(ctx, -0.3, -9, 0.7, 0.5, "#b8e07a"); // broto novo na haste
  for (let i = 0; i < 3; i++) {
    const fall = (time * 2.2 + i * 3.4) % 10, x = (i - 1) * 4.6 + Math.sin(time * 1.7 + i * 2) * 1.6, fade = 1 - fall / 10;
    ellipse(ctx, x, STAFF_GEM_Y - 4 + fall, 0.9, 0.55, rgba(i === 1 ? v.gem.light : v.ribbon, 0.85 * fade), time + i);
  }
}
