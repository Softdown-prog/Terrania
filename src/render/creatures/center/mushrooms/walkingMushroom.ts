/**
 * Cogumelo Andante (Centro): chapéu grande vermelho-tijolo com pintas claras e lamelas por baixo, caule creme com um rosto sonolento e dois pés curtos. O corpo
 * balança aos pulinhos pela passada de verdade (`motionPhase`), a nuvem de esporos cresce no preparo do sopro (`casting`) e o chapéu rasga quando a vida cai.
 * Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { body, OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { furAlong, furFlow, unit } from "../../shared/anatomy/fur.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#b4533c", light: "#e9a07a", dark: "#4a1f1a", accent: "#efe3c4", eye: "#f6f1d8", extra: "#d8c9a0" };
const MAX_HP = 100;

/** A terra grudada nos pés e as raízes finas que arrastam: torrões escuros e fios claros ao redor da base. */
function soil(ctx: CanvasRenderingContext2D, c: Palette, seed: number): void {
  for (const [k, dx] of [[0, -9.5], [1, -2], [2, 4.4], [3, 10.4]] as const) {
    ellipse(ctx, dx, -.8, 2.4 + unit(seed, k) * 1.4, 1.1 + unit(seed, k + 9) * .5, rgba("#3b2a1c", .85)); ellipse(ctx, dx - .5, -1.3, 1, .5, rgba("#6d5238", .8));
  }
  furAlong(ctx, [[-10, -1.2], [-3, -.4], [4, -.4], [11, -1.2]], 1, { seed: seed + 3, count: 9, length: 2.6, sweep: 0, dark: c.extra, light: c.accent, alpha: .75, width: .6 });
}

/** Dois pés curtos que se alternam no pulinho. */
function feet(ctx: CanvasRenderingContext2D, c: Palette, phase: number, moving: number): void {
  for (const side of [-1, 1]) {
    const step = Math.sin(phase + (side > 0 ? Math.PI : 0)) * moving, lift = Math.max(0, step) * 4;
    body(ctx, side * 6 + step * 2, -3 - lift, 5.4, 3.2, { ...c, base: c.extra, light: c.accent });
    ctx.strokeStyle = rgba(c.dark, .5); ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(side * 6 + step * 2 - 2, -1.4 - lift); ctx.lineTo(side * 6 + step * 2 + 2, -1.4 - lift); ctx.stroke();
  }
}

/** Caule gordo e creme, com anéis de pele e o rosto: olhos de pálpebra pesada e uma boca pequena que abre no sopro. */
function stem(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const sway = Math.sin(m.phase) * m.moving * 1.6 + Math.sin(time * 1.6 + m.seed * 5) * .5, snap = clamp01(m.bite);
  const g = ctx.createLinearGradient(-9, -30, 9, -6);
  g.addColorStop(0, c.accent); g.addColorStop(.6, c.extra); g.addColorStop(1, c.dark);
  ellipse(ctx, sway, -16, 10.5, 12, g);
  ctx.beginPath(); ctx.ellipse(sway, -16, 10.5, 12, 0, 0, Math.PI * 2); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.strokeStyle = rgba(c.dark, .35); ctx.lineWidth = .7;
  for (const y of [-9, -13, -17]) { ctx.beginPath(); ctx.ellipse(sway, y, 8.6 - Math.abs(y + 13) * .25, 1.4, 0, 0, Math.PI); ctx.stroke(); }
  // as fibras do caule, correndo de cima para baixo dentro do contorno, e o anel de pele (a saia) logo abaixo do chapéu
  ctx.save(); ctx.beginPath(); ctx.ellipse(sway, -16, 10.2, 11.8, 0, 0, Math.PI * 2); ctx.clip();
  furFlow(ctx, { x0: sway - 10, y0: -28, x1: sway + 10, y1: -5 }, { seed: m.seed + 2, count: 34, length: 5.2, dx: 0, dy: 1, bend: .25, dark: c.dark, light: c.accent, alpha: .16, width: .6 });
  ctx.restore();
  ctx.fillStyle = rgba(c.accent, .8); ctx.strokeStyle = rgba(c.dark, .5); ctx.lineWidth = .7;
  ctx.beginPath(); ctx.moveTo(sway - 9.4, -25.4); ctx.quadraticCurveTo(sway, -20.4, sway + 9.4, -25.4); ctx.quadraticCurveTo(sway, -22.6, sway - 9.4, -25.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  const blink = Math.sin(time * .75 + m.seed * 7) > .98;
  for (const side of [-1, 1]) {
    if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sway + side * 4 - 2, -19); ctx.lineTo(sway + side * 4 + 2, -19); ctx.stroke(); continue; }
    ellipse(ctx, sway + side * 4, -19, 2.9, 2.6, OUTLINE); ellipse(ctx, sway + side * 4, -19, 2.1, 1.9, c.eye); ellipse(ctx, sway + side * 4 + side * .3, -18.6, .9, 1, OUTLINE);
    ctx.fillStyle = c.extra; ctx.beginPath(); ctx.ellipse(sway + side * 4, -20.8, 3.2, 1.2, 0, Math.PI, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.ellipse(sway, -12.6, 2 + snap * 2.6, .8 + snap * 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ellipse(ctx, sway - 7.4, -14, 2, 1.4, rgba(c.light, .5)); ellipse(ctx, sway + 7.4, -14, 2, 1.4, rgba(c.light, .5));
}

/** Chapéu: cúpula com gradiente, pintas claras, borda ondulada, lamelas por baixo e, ferido, uma rachadura. */
function cap(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const sway = Math.sin(m.phase) * m.moving * 1.6 + Math.sin(time * 1.6 + m.seed * 5) * .5;
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.ellipse(sway, -27, 19, 4.4, 0, 0, Math.PI); ctx.fill();
  ctx.strokeStyle = rgba(c.accent, .45); ctx.lineWidth = .6;
  for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(sway + i * 2.1, -27); ctx.lineTo(sway + i * 2.4, -23.4); ctx.stroke(); }
  const dome = ctx.createRadialGradient(sway - 6, -42, 2, sway, -32, 22);
  dome.addColorStop(0, c.light); dome.addColorStop(.5, c.base); dome.addColorStop(1, c.dark);
  ctx.fillStyle = dome; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(sway - 21, -27); ctx.bezierCurveTo(sway - 23, -46, sway + 23, -46, sway + 21, -27);
  for (let k = 0; k < 6; k++) { const x = sway + 21 - k * 7; ctx.quadraticCurveTo(x - 1.75, -24.4, x - 3.5 - (k === 5 ? 0 : 0), -27); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const [dx, dy, r] of [[-11, -35, 3.6], [-1, -40, 3], [9, -36, 3.4], [15, -30, 2.2], [-17, -30, 2.2], [3, -32, 2], [-6, -29, 1.6]] as const) {
    ellipse(ctx, sway + dx, dy, r, r * .78, c.accent); ellipse(ctx, sway + dx - r * .25, dy - r * .25, r * .45, r * .3, "#ffffff");
  }
  ctx.strokeStyle = rgba("#ffffff", .5); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(sway - 8, -37, 9, 5, -.4, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  // as nervuras finas que saem do alto até a borda, as pintas pequenas espalhadas, a luz da borda e um tufo de musgo num lado
  ctx.strokeStyle = rgba(c.dark, .16); ctx.lineWidth = .7;
  for (let k = -5; k <= 5; k++) { ctx.beginPath(); ctx.moveTo(sway + k * 1.2, -43.4); ctx.quadraticCurveTo(sway + k * 3.4, -38, sway + k * 3.9, -28.6); ctx.stroke(); }
  for (let k = 0; k < 9; k++) { const x = (unit(m.seed, k * 2 + 1) - .5) * 36, y = -44 + unit(m.seed, k * 2 + 2) * 15; if (Math.abs(x) < 20 - Math.max(0, y + 33) * 0.9) ellipse(ctx, sway + x, y, .8 + unit(m.seed, k + 30) * .7, .6, rgba(c.accent, .85)); }
  ctx.strokeStyle = rgba(c.light, .6); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sway - 19.6, -29.4); ctx.quadraticCurveTo(sway - 12, -26, sway - 4, -26.8); ctx.stroke();
  furAlong(ctx, [[sway + 13, -38], [sway + 17, -34]], -1, { seed: m.seed + 8, count: 5, length: 2.6, sweep: 0, dark: "#4d7a38", light: "#8fc062", alpha: .9, width: 1 });
  if (m.wound > .4) { ctx.strokeStyle = rgba("#1c0b08", .55 + m.wound * .35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sway + 4, -44); ctx.lineTo(sway + 8, -37); ctx.lineTo(sway + 3, -33); ctx.lineTo(sway + 7, -28); ctx.stroke(); }
}

/** Esporos: poucos e parados, subindo devagar; no preparo do sopro a nuvem cresce e escurece em volta do chapéu. */
function spores(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  for (let i = 0; i < 6; i++) ellipse(ctx, Math.sin(i * 2.3 + m.seed * 6) * 16, -48 - ((time * 4 + i * 5) % 14), 1 + (i % 2) * .4, .8, rgba(c.accent, .55 - ((time * 4 + i * 5) % 14) / 30));
  const burst = clamp01(m.bite);
  if (burst > .02) {
    const cloud = ctx.createRadialGradient(0, -34, 2, 0, -34, 14 + burst * 22);
    cloud.addColorStop(0, rgba(c.accent, .5 * burst)); cloud.addColorStop(1, rgba(c.light, 0));
    ellipse(ctx, 0, -34, 14 + burst * 22, 10 + burst * 14, cloud);
    for (let i = 0; i < 10; i++) { const a = i * 2.4 + time * 1.5, r = 12 + burst * 20 * (.5 + (i % 3) * .25); ellipse(ctx, Math.cos(a) * r, -34 + Math.sin(a) * r * .55, 1.1 + (i % 3) * .5, .9, rgba(c.accent, .35 + burst * .45)); }
  }
}

/** O Cogumelo Andante inteiro, sem moldura nem sombra: `m` traz passada, sopro e ferimento (testável parte por parte). */
export function drawWalkingMushroom(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  soil(ctx, c, m.seed);
  feet(ctx, c, m.phase, m.moving);
  stem(ctx, c, time, m);
  cap(ctx, c, time, m);
  spores(ctx, c, time, m);
}

export function renderWalkingMushroomCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "walking-mushroom", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawWalkingMushroom(surface, colors, t, motion), 20);
}
