/**
 * Slime de Musgo (Centro): gota de gel verde-escura coberta de musgo, com bolhas por dentro, olhos úmidos e uma poça que se espalha por baixo. O corpo se achata
 * e estica pela passada de verdade (`motionPhase`), a boca se abre no golpe (`casting`) e a gota escorre quando a vida cai. Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { furAlong, unit } from "../../shared/anatomy/fur.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#5f9b48", light: "#b5e08a", dark: "#25472a", accent: "#8fb84a", eye: "#f4f1d0", extra: "#7fbf6a" };
const MAX_HP = 30;

/** A poça sob o corpo: cresce enquanto anda (o que ele deixa para trás) e tem uma borda mais clara. */
function puddle(ctx: CanvasRenderingContext2D, c: Palette, moving: number, time: number): void {
  const spread = 20 + moving * 7 + Math.sin(time * 1.3) * 1.2;
  const g = ctx.createRadialGradient(0, -1, 2, 0, -1, spread);
  g.addColorStop(0, rgba(c.base, .6)); g.addColorStop(.7, rgba(c.dark, .35)); g.addColorStop(1, rgba(c.dark, 0));
  ellipse(ctx, 0, -1, spread, spread * .3, g);
  ctx.strokeStyle = rgba(c.light, .35); ctx.lineWidth = .7;
  ctx.beginPath(); ctx.ellipse(0, -1, spread * .8, spread * .22, 0, Math.PI * .1, Math.PI * .9); ctx.stroke();
}

/** O corpo de gel: gradiente, contorno, miolo mais claro, bolhas e brilho; achata ao pousar e estica ao saltar. */
function gel(ctx: CanvasRenderingContext2D, c: Palette, m: CreatureMotion, time: number): { top: number; half: number } {
  const hop = Math.sin(m.phase) * m.moving, breath = Math.sin(time * 2 + m.seed * 5) * .05;
  const sy = 1 + hop * .14 + breath, sx = 1 - hop * .1 - breath * .6;
  const rx = 18 * sx, ry = 14 * sy, cy = -ry + 1 - Math.max(0, hop) * 3;
  const body = ctx.createLinearGradient(-rx, cy - ry, rx, cy + ry);
  body.addColorStop(0, c.light); body.addColorStop(.5, c.base); body.addColorStop(1, c.dark);
  ellipse(ctx, 0, cy, rx, ry, body);
  ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  const core = ctx.createRadialGradient(-3, cy - 3, 1, 0, cy, rx * .8);
  core.addColorStop(0, rgba(c.light, .65)); core.addColorStop(1, rgba(c.base, 0));
  ellipse(ctx, 0, cy, rx * .85, ry * .8, core);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + m.seed * 6, r = (.25 + (i % 4) * .17) * rx;
    ellipse(ctx, Math.cos(a) * r * .8, cy + Math.sin(a) * r * .6, 1.2 + (i % 3) * .5, 1.1 + (i % 2) * .5, rgba(c.light, .35));
  }
  ctx.strokeStyle = rgba("#ffffff", .5); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(-rx * .3, cy - ry * .35, rx * .45, ry * .4, -.4, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
  inside(ctx, c, m, time, cy, rx, ry);
  return { top: cy - ry, half: rx };
}

/** O que há dentro e na beira da gota: a espessura da parede (um contorno de dentro), o núcleo escuro com brilho, detritos em suspensão, a luz que atravessa por baixo, gotas que pendem e, andando, respingos que ficam para trás. */
function inside(ctx: CanvasRenderingContext2D, c: Palette, m: CreatureMotion, time: number, cy: number, rx: number, ry: number): void {
  ctx.strokeStyle = rgba(c.light, .28); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, cy, rx - 1.9, ry - 1.9, 0, 0, Math.PI * 2); ctx.stroke();
  const bob = Math.sin(time * 1.4 + m.seed * 7) * .8;
  const core = ctx.createRadialGradient(rx * .15, cy + 2 + bob, 1, rx * .15, cy + 2 + bob, 8);
  core.addColorStop(0, rgba(c.dark, .55)); core.addColorStop(.6, rgba(c.dark, .22)); core.addColorStop(1, rgba(c.dark, 0));
  ellipse(ctx, rx * .15, cy + 2 + bob, 7.4, 6, core);
  ellipse(ctx, rx * .15 - 1, cy + 1 + bob, 2.2, 1.7, rgba(c.eye, .22));
  for (let k = 0; k < 5; k++) {
    const x = (unit(m.seed, k * 3 + 1) - .5) * rx * 1.2, y = cy + (unit(m.seed, k * 3 + 2) - .3) * ry * .9 + Math.sin(time * 1.2 + k) * .6;
    ellipse(ctx, x, y, 1.9 + unit(m.seed, k * 3 + 3), .5, rgba(c.dark, .55), unit(m.seed, k) * Math.PI);
  }
  const lowGlow = ctx.createLinearGradient(0, cy + ry - 6, 0, cy + ry); lowGlow.addColorStop(0, rgba(c.light, 0)); lowGlow.addColorStop(1, rgba(c.light, .4));
  ctx.fillStyle = lowGlow; ctx.beginPath(); ctx.ellipse(0, cy, rx - 1, ry - 1, 0, 0.05, Math.PI - .05); ctx.fill();
  for (const k of [0, 1]) ellipse(ctx, (k ? 8 : -9) + unit(m.seed, k + 40) * 2, cy + ry - 1 + 1.4 + Math.sin(time * 2.2 + k * 2) * .5, .9, 1.6 + k * .4, rgba(c.base, .85));
  if (m.moving > .1) for (let k = 0; k < 3; k++) ellipse(ctx, 14 + k * 4 + Math.sin(m.phase + k) * 1.4, cy + ry - 2 - k * 1.2, 1.2 - k * .2, .8, rgba(c.light, .45 * m.moving));
}

/** Tufos de musgo no alto das costas: lâminas curtas que balançam de leve. */
function moss(ctx: CanvasRenderingContext2D, c: Palette, top: number, half: number, time: number, seed: number): void {
  for (let i = 0; i < 9; i++) {
    const t = i / 8, x = (t - .5) * half * 1.3, y = top + 3 + Math.abs(t - .5) * 7, sway = Math.sin(time * 1.5 + i * 1.3 + seed * 4) * 1.1;
    ctx.strokeStyle = i % 2 ? c.accent : c.extra; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.quadraticCurveTo(x + sway, y - 3, x + sway * 1.6 + (t - .5) * 3, y - 5 - (i % 3)); ctx.stroke();
  }
  // as fibras do musgo, uma franja fina que sobe da beira de cima, e trevos pequenos entre elas
  furAlong(ctx, [[-half * .78, top + 8], [-half * .4, top + 2.4], [0, top + .6], [half * .4, top + 2.4], [half * .78, top + 8]], -1, { seed: seed + 5, count: 16, length: 3.6, variation: .5, sweep: 0, dark: c.accent, light: c.light, alpha: .85, width: 1.1 });
  for (const [dx, dy] of [[-4, 1], [6, 3.4]] as const) for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 1.1; ellipse(ctx, dx + Math.cos(a) * 1.5, top + dy + Math.sin(a) * 1.5, 1.3, .8, rgba(c.extra, .95), a); }
  for (const [dx, dy, r] of [[-9, 5, 3.4], [8, 8, 2.8], [2, 2, 2.3]] as const) { ellipse(ctx, dx, top + dy, r, r * .6, rgba(c.accent, .8)); ellipse(ctx, dx - .6, top + dy - .5, r * .5, r * .3, rgba(c.light, .7)); }
}

/** Olhos úmidos, boca que abre no golpe e, ferido, a gota que escorre pelo lado. */
function face(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion, top: number): void {
  const eyeY = top + 13, blink = Math.sin(time * .85 + m.seed * 9) > .985, open = clamp01(m.bite);
  for (const side of [-1, 1]) {
    if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(side * 6 - 2.2, eyeY); ctx.lineTo(side * 6 + 2.2, eyeY); ctx.stroke(); continue; }
    ellipse(ctx, side * 6, eyeY, 3.6, 3.9, OUTLINE); ellipse(ctx, side * 6, eyeY, 2.9, 3.2, c.eye);
    ellipse(ctx, side * 6 + side * .4, eyeY + .4, 1.4, 1.7, OUTLINE); ellipse(ctx, side * 6 - .4, eyeY - .9, .6, .6, "#ffffff");
  }
  if (!blink) for (const side of [-1, 1]) {
    ctx.strokeStyle = rgba(c.dark, .75); ctx.lineWidth = 1.1; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(side * 3, eyeY - 4.8 + open * .6); ctx.quadraticCurveTo(side * 6.4, eyeY - 6.4 - open, side * 9.4, eyeY - 4.2 + open * 1.2); ctx.stroke(); ctx.lineCap = "butt";
    ellipse(ctx, side * 6 - side * 1.2, eyeY + 1.6, .8, .45, rgba("#ffffff", .55));
  }
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.ellipse(0, eyeY + 7, 3.4 + open * 2.4, .9 + open * 3.4, 0, 0, Math.PI * 2); ctx.fill();
  if (open > .02) { ctx.fillStyle = rgba(c.light, .75); ctx.beginPath(); ctx.ellipse(0, eyeY + 5.9 + open, 1.8, .9, 0, 0, Math.PI * 2); ctx.fill(); }
  if (m.wound > .35) {
    ctx.strokeStyle = rgba(c.dark, .55 + m.wound * .35); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-12, top + 9); ctx.quadraticCurveTo(-14, top + 16, -12.5, top + 24); ctx.stroke();
    ellipse(ctx, -12.5, top + 26 + m.wound * 3, 1.5, 2.2 + m.wound, rgba(c.base, .8));
  }
}

/** O Slime de Musgo inteiro, sem moldura nem sombra: `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawMossSlime(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  puddle(ctx, c, m.moving, time);
  const { top, half } = gel(ctx, c, m, time);
  moss(ctx, c, top, half, time, m.seed);
  face(ctx, c, time, m, top);
}

export function renderMossSlimeCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "moss-slime", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawMossSlime(surface, colors, t, motion), 20);
}
