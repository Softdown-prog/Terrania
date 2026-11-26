/**
 * Besouro de Raiz (Centro): casco em cúpula, marrom-escuro, riscado por nervuras que parecem raízes, com musgo nas dobras, mandíbulas grossas e seis patas. As
 * patas seguem a passada de verdade (`motionPhase`), as mandíbulas abrem no golpe (`casting`) e o casco racha quando a vida cai. Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { body, OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#5a3d2a", light: "#a6845a", dark: "#1f140d", accent: "#6f9a4a", eye: "#e8c46a", extra: "#7a5a3a" };
const MAX_HP = 55;

/** Seis patas em passo alternado (tripé), articuladas em dois gomos, com a ponta em garra. */
function legs(ctx: CanvasRenderingContext2D, c: Palette, phase: number, moving: number): void {
  for (const side of [-1, 1] as const) for (let i = 0; i < 3; i++) {
    const step = Math.sin(phase + ((i + (side > 0 ? 1 : 0)) % 2) * Math.PI) * moving, x = -8 + i * 8;
    const kneeX = x + side * 2 + (i - 1) * 3 + step * 2, kneeY = -9 - Math.max(0, step) * 3;
    const footX = x + (i - 1) * 8 + step * 3.5, footY = -.5 - Math.max(0, step) * 1.8;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(x, -12); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
    ctx.strokeStyle = i % 2 ? c.extra : c.base; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = c.light; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(footX, footY); ctx.lineTo(footX + (i - 1) * 1.6, footY + 2.2); ctx.stroke();
  }
}

/** O casco: cúpula com brilho, duas elitras separadas por uma costura, nervuras de raiz que se ramificam e musgo nas bordas. */
function shell(ctx: CanvasRenderingContext2D, c: Palette, seed: number, wound: number): void {
  body(ctx, 2, -17, 19, 13, c);
  ctx.save(); ctx.beginPath(); ctx.ellipse(2, -17, 18.2, 12.2, 0, 0, Math.PI * 2); ctx.clip();
  const sheen = ctx.createLinearGradient(-12, -30, 10, -8);
  sheen.addColorStop(0, rgba(c.light, .55)); sheen.addColorStop(.5, rgba(c.light, 0)); sheen.addColorStop(1, rgba(c.dark, .5));
  ctx.fillStyle = sheen; ctx.fillRect(-18, -31, 40, 28);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(2, -30); ctx.lineTo(2, -4); ctx.stroke();
  for (const side of [-1, 1]) for (let r = 0; r < 4; r++) {
    const y = -27 + r * 5.4, x = 2 + side * 3;
    ctx.strokeStyle = rgba(c.dark, .8); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + side * 6, y + 1, x + side * 9, y - 1, x + side * 15, y + 3); ctx.stroke();
    ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x + side * 8, y + .2); ctx.quadraticCurveTo(x + side * 10, y + 4, x + side * 12, y + 7 + (r % 2) * 2); ctx.stroke();
    ctx.strokeStyle = rgba(c.light, .35); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x, y - .8); ctx.bezierCurveTo(x + side * 6, y, x + side * 9, y - 2, x + side * 15, y + 2); ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < 6; i++) { const a = Math.PI * (1.08 + i * .17) + (seed % 1) * .2; ellipse(ctx, 2 + Math.cos(a) * 17, -17 + Math.sin(a) * 11.4, 2.4, 1.6, i % 2 ? c.accent : rgba(c.accent, .75), a); }
  if (wound > .4) {
    ctx.strokeStyle = rgba("#0f0a06", .6 + wound * .3); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(8, -29); ctx.lineTo(11, -23); ctx.lineTo(7, -19); ctx.lineTo(12, -13); ctx.stroke();
    ctx.strokeStyle = rgba(c.light, .5); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(8.8, -29); ctx.lineTo(11.8, -23); ctx.lineTo(7.8, -19); ctx.stroke();
  }
}

/** Cabeça pequena e larga sob o casco: olhos, antenas que balançam e duas mandíbulas que abrem no golpe. */
function head(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const snap = clamp01(m.bite);
  body(ctx, -19, -13, 8, 7, c);
  ellipse(ctx, -22, -15.5, 1.9, 1.7, OUTLINE); ellipse(ctx, -22, -15.6, 1.4, 1.3, c.eye); ellipse(ctx, -22.4, -16.1, .45, .45, "#fff6dc");
  for (let a = 0; a < 2; a++) {
    const sway = Math.sin(time * 2.4 + a * 1.2 + m.seed * 6) * 1.6;
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-21 - a * 3, -19.5); ctx.quadraticCurveTo(-27 - a * 3, -25 + sway, -31 - a * 3, -23 + sway * 1.5); ctx.stroke();
    ctx.strokeStyle = c.light; ctx.lineWidth = .6; ctx.stroke();
    ellipse(ctx, -31 - a * 3, -23 + sway * 1.5, 1.2, 1, c.accent);
  }
  for (const side of [-1, 1]) {
    ctx.fillStyle = c.dark; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-25, -10.5 + side * 2); ctx.quadraticCurveTo(-31 - snap * 2, -9 + side * (3 + snap * 3.4), -29 - snap, -5 + side * (2 + snap * 4)); ctx.quadraticCurveTo(-27, -8 + side * 2, -23, -9 + side * 1.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (snap > .02) { ctx.strokeStyle = rgba(c.light, .3 + snap * .5); ctx.lineWidth = .8; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-14 + k * 3, -33 - k); ctx.lineTo(-9 + k * 3, -33 - k); ctx.stroke(); } }
}

/** O Besouro de Raiz inteiro, sem moldura nem sombra: `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawRootBeetle(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  legs(ctx, c, m.phase, m.moving);
  shell(ctx, c, m.seed, m.wound);
  head(ctx, c, time, m);
}

export function renderRootBeetleCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "root-beetle", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawRootBeetle(surface, colors, t, motion), 21);
}
