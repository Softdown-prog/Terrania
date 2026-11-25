import type { StaffVisualProfile } from "../../../engine/character/Staves.ts";
import { ellipse, rgba } from "../../draw.ts";
import { STAFF_GEM_Y, STAFF_TOP_Y, type StaffTone } from "../shaft.ts";

/** O cobre da bobina: três tons fixos (o metal da haste é azulado; o fio é de cobre). */
const COPPER = { light: "#ffc98a", mid: "#d98a3d", dark: "#6e3a12" } as const;
/** A altura dos pólos, que ficam um pouco abaixo da gema, e o quanto saem para os lados. */
const POLE_Y = STAFF_TOP_Y - 2.2, POLE_X = 5.8;

/** Um pólo: um isolante comprido que sai do anel para o lado e termina numa bolinha de metal. */
function pole(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, side: number): void {
  const body = ctx.createLinearGradient(0, STAFF_TOP_Y + 1, side * POLE_X, POLE_Y);
  body.addColorStop(0, tone(v.shaft.dark)); body.addColorStop(0.5, tone(v.shaft.mid)); body.addColorStop(1, tone(v.shaft.light));
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(side * 1.2, STAFF_TOP_Y + 2.2); ctx.quadraticCurveTo(side * 4.2, STAFF_TOP_Y + 1.6, side * (POLE_X - 0.4), POLE_Y + 1.2); ctx.lineTo(side * (POLE_X + 0.6), POLE_Y - 0.8);
  ctx.quadraticCurveTo(side * 4.4, STAFF_TOP_Y - 0.6, side * 1.2, STAFF_TOP_Y - 0.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#0c121c", 0.7); ctx.lineWidth = 0.5; ctx.stroke();
  ellipse(ctx, side * POLE_X, POLE_Y, 1.5, 1.5, tone(v.collarDark)); ellipse(ctx, side * POLE_X, POLE_Y, 1.1, 1.1, tone(v.collar)); ellipse(ctx, side * (POLE_X - 0.3), POLE_Y - 0.4, 0.45, 0.4, rgba(v.sheen, 0.95));
}

/** Um arco elétrico: um zigue-zague do pólo até a gema; o desenho dos vértices muda com o relógio, então ele treme e acende. */
function arc(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, side: number, time: number, phase: number): void {
  const x0 = side * POLE_X, y0 = POLE_Y, x1 = side * 2.6, y1 = STAFF_GEM_Y + 1.4, steps = 4;
  const points: Array<[number, number]> = [[x0, y0]];
  for (let i = 1; i < steps; i++) {
    const t = i / steps, jitter = Math.sin(time * 31 + i * 4.7 + phase) * 1.9;
    points.push([x0 + (x1 - x0) * t + jitter, y0 + (y1 - y0) * t + Math.cos(time * 27 + i * 3.1 + phase) * 1.2]);
  }
  points.push([x1, y1]);
  const flicker = 0.55 + 0.45 * Math.abs(Math.sin(time * 14 + phase));
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = rgba(v.gem.glow, 0.4 * flicker); ctx.lineWidth = 2.6;
  ctx.beginPath(); points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
  ctx.strokeStyle = rgba(v.gem.light, 0.95 * flicker); ctx.lineWidth = 1;
  ctx.beginPath(); points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
  ctx.strokeStyle = rgba("#ffffff", 0.9 * flicker); ctx.lineWidth = 0.4;
  ctx.beginPath(); points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
  ctx.lineCap = "butt"; ctx.lineJoin = "miter";
}

/**
 * O que faz o Cajado da Tempestade (ADR 0076) parecer de raio: uma bobina de cobre de cinco voltas na haste, com o fio brilhando, e dois pólos de
 * metal que saem do anel dos lados da gema; e (na frente) dois arcos elétricos que pulam de cada pólo até a gema, um halo azul e faíscas soltas.
 * `time` faz os arcos tremerem e acenderem e as faíscas piscarem.
 */
export function paintCoilMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  if (layer === "back") {
    pole(ctx, v, tone, -1); pole(ctx, v, tone, 1);
    // a bobina: cinco voltas de fio, cada uma uma curva que passa pela frente e volta por trás, com o brilho do cobre
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      const y = -23 + i * 2.5;
      ctx.strokeStyle = tone(COPPER.dark); ctx.lineWidth = 1.9;
      ctx.beginPath(); ctx.moveTo(-2.9, y - 0.6); ctx.quadraticCurveTo(0, y + 2.1, 2.9, y - 0.4); ctx.stroke();
      ctx.strokeStyle = tone(COPPER.mid); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-2.8, y - 0.7); ctx.quadraticCurveTo(0, y + 1.9, 2.8, y - 0.5); ctx.stroke();
      ctx.strokeStyle = tone(COPPER.light); ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(-1.8, y + 0.2); ctx.quadraticCurveTo(-0.4, y + 1.1, 0.6, y + 1); ctx.stroke();
    }
    ctx.lineCap = "butt";
    // os pregos de ligação do fio na haste, e um rebite brilhante
    ellipse(ctx, -2.7, -23.6, 0.7, 0.7, tone(v.shaft.dark)); ellipse(ctx, 2.7, -11.6, 0.7, 0.7, tone(v.shaft.dark));
    ellipse(ctx, 0.2, -6.4, 0.9, 0.9, tone(v.shaft.light)); ellipse(ctx, 0, -6.6, 0.45, 0.45, rgba(v.sheen, 0.95));
    ctx.strokeStyle = tone(v.gem.mid); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 6); ctx.stroke(); // o fio de energia que desce
    return;
  }
  const halo = ctx.createRadialGradient(0, STAFF_GEM_Y, 1, 0, STAFF_GEM_Y, 11);
  halo.addColorStop(0, rgba(v.gem.light, 0.42)); halo.addColorStop(0.55, rgba(v.gem.glow, 0.22)); halo.addColorStop(1, rgba(v.gem.mid, 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, STAFF_GEM_Y, 11, 0, Math.PI * 2); ctx.fill();
  arc(ctx, v, -1, time, 0); arc(ctx, v, 1, time, 2.4);
  // faíscas soltas que piscam em volta dos pólos
  for (let i = 0; i < 3; i++) {
    const pulse = Math.abs(Math.sin(time * 9 + i * 2.2)), x = (i - 1) * 6.4 + Math.sin(time * 4 + i) * 1.2, y = STAFF_GEM_Y + 5 + Math.cos(time * 5 + i * 1.7) * 2.4;
    ellipse(ctx, x, y, 0.4 + pulse * 0.8, 0.4 + pulse * 0.8, rgba(i % 2 ? "#ffffff" : v.gem.light, 0.35 + pulse * 0.6));
  }
}
