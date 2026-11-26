/**
 * Javali Selvagem (Centro): corpo robusto e baixo, cerdas duras em crista pelo lombo, focinho largo e dois dentes de marfim que sobem da mandíbula. As patas seguem
 * o galope de verdade (`motionPhase`), as ventas sopram vapor e a cabeça baixa no golpe (`casting`), e a pelagem mostra arranhões quando a vida cai. Não decide
 * acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { body, line, tip, OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#6b4a36", light: "#b08a63", dark: "#2a1b12", accent: "#e8dcc0", eye: "#d9a441", extra: "#8a6446" };
const MAX_HP = 110;

/** Quatro patas curtas e grossas, em galope alternado, com casco partido. */
function legs(ctx: CanvasRenderingContext2D, c: Palette, phase: number, moving: number): void {
  for (const [i, x] of ([[0, 13], [1, 8], [2, -10], [3, -15]] as const)) {
    const step = Math.sin(phase + (i % 2) * Math.PI) * moving, reach = step * 6, lift = Math.max(0, step) * 3;
    line(ctx, x, -14, x + reach, -2 - lift, c, 4.6);
    ellipse(ctx, x + reach, -1.4 - lift, 3.8, 2.2, c.dark);
    ctx.strokeStyle = c.light; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(x + reach, -3 - lift); ctx.lineTo(x + reach, -.2 - lift); ctx.stroke();
  }
}

/** Tronco volumoso, com ombros mais altos que a garupa, crista de cerdas e uma cauda curta em ponto. */
function torso(ctx: CanvasRenderingContext2D, c: Palette, seed: number, time: number): void {
  const breath = Math.sin(time * 1.8 + seed * 5) * .5;
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(21, -22); ctx.quadraticCurveTo(26, -25, 25, -30); ctx.stroke();
  ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5; ctx.stroke();
  body(ctx, 6, -22 + breath * .4, 22, 13, c);
  body(ctx, -9, -24 + breath * .4, 14, 13, c);
  const belly = ctx.createLinearGradient(0, -14, 0, -6);
  belly.addColorStop(0, rgba(c.light, 0)); belly.addColorStop(1, rgba(c.light, .5));
  ellipse(ctx, 3, -10, 20, 4, belly);
  for (let i = 0; i < 12; i++) {
    const t = i / 11, x = -20 + t * 36, y = -33 - Math.sin(t * Math.PI) * 4 + (t < .4 ? -(.4 - t) * 4 : 0) + breath * .3;
    tip(ctx, x, y, 1.6 + (i % 3) * .3, 4.4 + ((i + Math.floor(seed * 9)) % 3) * 1.2, i % 3 === 0 ? c.light : c.extra);
  }
  ctx.strokeStyle = rgba(c.dark, .55); ctx.lineWidth = .8;
  for (let i = 0; i < 6; i++) { const x = -14 + i * 5.4; ctx.beginPath(); ctx.moveTo(x, -31); ctx.quadraticCurveTo(x - 2, -24, x - 1, -15); ctx.stroke(); }
}

/** Cabeça de cunha: focinho largo e achatado, dentes de marfim curvos, orelha em pé, olho pequeno com aro âmbar e vapor nas ventas. */
function head(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const snap = clamp01(m.bite), dip = snap * 3;
  body(ctx, -26, -21 + dip, 11, 9.5, c, -.12);
  ellipse(ctx, -35.5, -17 + dip, 6.5, 5.2, c.light, .1);
  ellipse(ctx, -39, -17.5 + dip, 2.6, 2.1, c.dark);
  ellipse(ctx, -39.6, -18 + dip, .8, .6, rgba(c.accent, .8));
  body(ctx, -23, -31 + dip, 3.6, 5.4, { ...c, base: c.extra }, .3);
  ellipse(ctx, -23, -31 + dip, 1.7, 3, rgba(c.dark, .6), .3);
  ellipse(ctx, -29, -23 + dip, 2.5, 2.3, OUTLINE); ellipse(ctx, -29, -23 + dip, 1.7, 1.6, c.eye); ellipse(ctx, -29, -23 + dip, .7, .9, OUTLINE); ellipse(ctx, -29.4, -23.7 + dip, .4, .4, "#fff6dc");
  for (const [x, rise] of [[-34, 7 + snap * 2], [-30, 6]] as const) {
    ctx.fillStyle = c.accent; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(x - 2, -12 + dip); ctx.quadraticCurveTo(x - 4.5, -12 + dip - rise * .6, x - 1.5, -12 + dip - rise); ctx.quadraticCurveTo(x - .5, -12 + dip - rise * .5, x + 2, -12 + dip); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (snap > .02) {
    // o golpe: vapor das ventas e três riscos de força atrás da cabeça baixa
    for (let k = 0; k < 4; k++) ellipse(ctx, -42 - k * 2.6, -19 + dip - Math.sin(time * 6 + k) * 1.4 - k * .8, 1.1 + k * .5, .8 + k * .3, rgba("#f2f6f8", (.7 - k * .14) * snap));
    ctx.strokeStyle = rgba(c.light, .3 + snap * .5); ctx.lineWidth = .8;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-16 + k * 2.5, -32 + k * 4); ctx.lineTo(-10 + k * 2.5, -32 + k * 4); ctx.stroke(); }
  }
  if (m.wound > .35) { ctx.strokeStyle = rgba("#7d3030", .4 + m.wound * .5); ctx.lineWidth = 1.1; for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.moveTo(-2 + s * 3, -30); ctx.lineTo(1 + s * 3, -22); ctx.stroke(); } }
}

/** O Javali Selvagem inteiro, sem moldura nem sombra: `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawWildBoar(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  legs(ctx, c, m.phase, m.moving);
  torso(ctx, c, m.seed, time);
  head(ctx, c, time, m);
}

export function renderWildBoarCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "wild-boar", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawWildBoar(surface, colors, t, motion), 24);
}
