/**
 * Lobo Cinzento (Centro): corpo esguio e alto, pelagem cinza em mechas, peito claro, cauda caída em pincel, orelhas em pé e olhos âmbar. As quatro patas seguem
 * o galope de verdade (`motionPhase`), a boca abre e os dentes aparecem no golpe (`casting`), e a pelagem mostra arranhões quando a vida cai. Não decide acerto,
 * dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { body, line, tip, OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#7b8087", light: "#cfd3d6", dark: "#2e3237", accent: "#c9a24a", eye: "#e6b94a", extra: "#a0a5ab" };
const MAX_HP = 90;

/** Cauda em pincel, que acompanha a corrida (mais aberta andando) e balança parada. */
function tail(ctx: CanvasRenderingContext2D, c: Palette, phase: number, moving: number, time: number): void {
  const sway = Math.sin(phase * 1.2) * 4 * moving + Math.sin(time * 1.5) * 1.2, lift = moving * 5;
  ctx.lineCap = "round";
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(19, -26); ctx.quadraticCurveTo(29, -27 - lift, 36, -17 - lift * .4 + sway); ctx.stroke();
  ctx.strokeStyle = c.base; ctx.lineWidth = 5.6; ctx.stroke();
  ctx.strokeStyle = c.light; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(28, -26.4 - lift); ctx.quadraticCurveTo(33, -22 - lift * .6, 36, -17 - lift * .4 + sway); ctx.stroke();
  tip(ctx, 37, -15 - lift * .4 + sway, 2, 5, c.light);
}

/** Quatro patas finas e longas, em galope: as de trás empurram, as da frente alcançam; patas claras. */
function legs(ctx: CanvasRenderingContext2D, c: Palette, phase: number, moving: number): void {
  for (const [i, x] of ([[0, 13], [1, 9], [2, -12], [3, -16]] as const)) {
    const step = Math.sin(phase + (i % 2) * Math.PI + (i < 2 ? 0 : .6)) * moving, reach = step * 8, lift = Math.max(0, step) * 4;
    line(ctx, x, -17, x + reach * .6, -9 - lift * .6, c, 3.4);
    line(ctx, x + reach * .6, -9 - lift * .6, x + reach, -1.5 - lift, c, 2.8);
    ellipse(ctx, x + reach, -1 - lift, 3.2, 1.7, c.light);
    ctx.strokeStyle = c.dark; ctx.lineWidth = .6; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + reach + k * 1.4 - 1.5, -.6 - lift); ctx.lineTo(x + reach + k * 1.4 - 2.4, 1.2 - lift); ctx.stroke(); }
  }
}

/** Tronco esguio com a barriga recolhida, o peito claro e as mechas da crina. */
function torso(ctx: CanvasRenderingContext2D, c: Palette, seed: number, time: number): void {
  const breath = Math.sin(time * 2 + seed * 5) * .5;
  body(ctx, 4, -25 + breath * .4, 21, 10.5, c);
  body(ctx, -13, -27 + breath * .4, 11, 11.5, c);
  const chest = ctx.createRadialGradient(-17, -20, 1, -17, -20, 10);
  chest.addColorStop(0, rgba(c.light, .8)); chest.addColorStop(1, rgba(c.light, 0));
  ellipse(ctx, -17, -20, 9, 9, chest);
  for (let i = 0; i < 10; i++) { const t = i / 9, x = -18 + t * 34, y = -34 - Math.sin(t * Math.PI) * 2.6 + breath * .3; tip(ctx, x, y, 1.5 + (i % 3) * .3, 4 + (i % 4) * .9, i % 2 ? c.extra : c.light); }
  ctx.strokeStyle = rgba(c.dark, .5); ctx.lineWidth = .8;
  for (let i = 0; i < 7; i++) { const x = -10 + i * 4.4; ctx.beginPath(); ctx.moveTo(x, -33); ctx.quadraticCurveTo(x - 2.5, -26, x - 1, -18); ctx.stroke(); }
}

/** Cabeça de focinho longo: orelhas pontudas, olho âmbar de pupila estreita e mandíbula que abre com os dentes no golpe. */
function head(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const snap = clamp01(m.bite);
  body(ctx, -25, -30, 8.6, 8, c, -.2);
  ellipse(ctx, -33, -26 + snap * .6, 7.4, 3.6, c.extra, .15);
  ellipse(ctx, -39.4, -26 + snap * .8, 1.9, 1.6, OUTLINE);
  for (const [x, h] of [[-26, 8], [-20, 7]] as const) {
    ctx.fillStyle = c.base; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 3.4, -35); ctx.lineTo(x - .5, -35 - h); ctx.lineTo(x + 3, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba(c.accent, .35); ctx.beginPath(); ctx.moveTo(x - 1.8, -35.4); ctx.lineTo(x - .4, -35 - h * .7); ctx.lineTo(x + 1.4, -34.6); ctx.closePath(); ctx.fill();
  }
  const blink = Math.sin(time * .8 + m.seed * 11) > .985;
  if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-31.8, -31.4); ctx.lineTo(-27.8, -31.4); ctx.stroke(); }
  else { ellipse(ctx, -29.6, -31.4, 2.4, 1.9, OUTLINE); ellipse(ctx, -29.6, -31.5, 1.8, 1.4, c.eye); ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.ellipse(-29.6, -31.5, .5, 1.2, 0, 0, Math.PI * 2); ctx.fill(); ellipse(ctx, -30, -32.1, .4, .35, "#fff6dc"); }
  // mandíbula de baixo: fecha parada; no golpe desce e mostra a língua e os dentes
  ctx.fillStyle = c.dark; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9;
  ctx.beginPath(); ctx.moveTo(-26, -24.6); ctx.quadraticCurveTo(-33, -22.5 + snap * 6, -38.6, -24.6 + snap * 5); ctx.quadraticCurveTo(-33, -21.6 + snap * 3, -26, -23); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f2ecd9";
  for (let t = 0; t < 3; t++) { ctx.beginPath(); ctx.moveTo(-31 - t * 2.6, -25.4); ctx.lineTo(-30.2 - t * 2.6, -22.4 + snap * 3.6); ctx.lineTo(-29.4 - t * 2.6, -25.4); ctx.closePath(); ctx.fill(); }
  if (snap > .02) {
    // o rosnado: linhas de força no focinho e uma língua que aparece
    ctx.strokeStyle = rgba(c.light, .35 + snap * .5); ctx.lineWidth = .8;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-36 - k * 1.6, -29.5 - k); ctx.lineTo(-32 - k * 1.6, -28.5 - k * 1.4); ctx.stroke(); }
    ellipse(ctx, -33, -22 + snap * 3.2, 2.6, .9 + snap * 1.2, rgba("#c2384a", .8));
  }
  if (m.wound > .35) { ctx.strokeStyle = rgba("#8c3b3d", .4 + m.wound * .5); ctx.lineWidth = 1; for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.moveTo(-4 + s * 3.2, -33); ctx.lineTo(-1.4 + s * 3.2, -25); ctx.stroke(); } }
}

/** O Lobo Cinzento inteiro, sem moldura nem sombra: `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawGrayWolf(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  tail(ctx, c, m.phase, m.moving, time);
  legs(ctx, c, m.phase, m.moving);
  torso(ctx, c, m.seed, time);
  head(ctx, c, time, m);
}

export function renderGrayWolfCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "gray-wolf", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawGrayWolf(surface, colors, t, motion), 21);
}
