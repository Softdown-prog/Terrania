/**
 * Aranha das Raízes (Centro): abdômen marrom com listras de raiz e musgo nas costas, oito patas articuladas em dois tempos, oito olhos e quelíceras que abrem
 * no golpe (`casting`). Dos fiéis de teia pende um fio de seda. As patas seguem a passada real (`motionPhase`); a carapaça racha quando a vida cai.
 * Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { body, OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#5b4733", light: "#ac8d60", dark: "#251b13", accent: "#6f9a4a", eye: "#d9f06a", extra: "#7e6546" };
const MAX_HP = 38;

/** Quatro patas de cada lado, em duas dobras (coxa que sobe, canela que desce); as alternadas andam em passos opostos. */
function legs(ctx: CanvasRenderingContext2D, c: Palette, phase: number, moving: number): void {
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 4; i++) {
      const step = Math.sin(phase + ((i + (side > 0 ? 1 : 0)) % 2) * Math.PI + i * .5) * moving;
      const baseX = -7 + i * 5.4, spread = 11 + (i === 0 || i === 3 ? 3 : 0) + step * 2.4;
      const kneeX = baseX + side * spread * .55 + (i - 1.5) * 1.6, kneeY = -27 - (i === 1 || i === 2 ? 3 : 0) - Math.max(0, step) * 3;
      const footX = baseX + side * (spread + 7) + (i - 1.5) * 4 + step * 3, footY = -1 - Math.max(0, step) * 2.2;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.moveTo(baseX, -16); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
      ctx.strokeStyle = i % 2 ? c.extra : c.base; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(baseX, -16); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
      ctx.strokeStyle = rgba(c.light, .55); ctx.lineWidth = .6;
      ctx.beginPath(); ctx.moveTo(kneeX, kneeY - .6); ctx.lineTo(footX - side * .4, footY - 3); ctx.stroke();
      ellipse(ctx, kneeX, kneeY, 1.7, 1.5, c.light);
    }
  }
}

/** Abdômen redondo, com o desenho de raízes nas costas e um tufo de musgo (o que dá o nome da espécie). */
function abdomen(ctx: CanvasRenderingContext2D, c: Palette, seed: number, wound: number): void {
  body(ctx, 8, -19, 12.5, 11, c);
  ctx.save(); ctx.beginPath(); ctx.ellipse(8, -19, 12, 10.4, 0, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = rgba(c.dark, .75); ctx.lineWidth = 1.1;
  for (let i = 0; i < 4; i++) {
    const x = 1 + i * 4.4;
    ctx.beginPath(); ctx.moveTo(x, -30); ctx.bezierCurveTo(x + 3, -25, x - 3, -21, x + 1.4, -14); ctx.stroke();
    ctx.strokeStyle = rgba(c.light, .5); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x + .8, -29); ctx.bezierCurveTo(x + 3.8, -25, x - 2.2, -21, x + 2.2, -14); ctx.stroke(); ctx.strokeStyle = rgba(c.dark, .75); ctx.lineWidth = 1.1;
  }
  ctx.restore();
  for (let i = 0; i < 9; i++) {
    const x = 1 + i * 2.1 + ((seed * 10 + i) % 3) * .3, y = -29 - Math.sin(i * .7) * 1.2;
    ellipse(ctx, x, y, 2.3, 1.6, i % 2 ? c.accent : "#88b45c");
  }
  if (wound > .4) { ctx.strokeStyle = rgba("#1b120c", .5 + wound * .4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, -28); ctx.lineTo(13, -22); ctx.lineTo(10, -17); ctx.lineTo(14, -12); ctx.stroke(); }
}

/** Cefalotórax com oito olhos (dois grandes, seis pequenos) e quelíceras que abrem para morder. */
function front(ctx: CanvasRenderingContext2D, c: Palette, time: number, bite: number): void {
  const snap = clamp01(bite);
  body(ctx, -9, -20, 8.4, 7.4, c);
  const gleam = ctx.createRadialGradient(-11, -24, 0, -9, -20, 9);
  gleam.addColorStop(0, rgba(c.light, .55)); gleam.addColorStop(1, rgba(c.light, 0));
  ellipse(ctx, -9, -20, 8, 7, gleam);
  const pulse = .85 + Math.sin(time * 3) * .15;
  for (const [x, y, r] of [[-13.4, -23.4, 1.7], [-10.6, -24.6, 1.4], [-15.6, -20.8, 1.1], [-12.6, -21.2, .9], [-8.4, -22.4, .8], [-14.6, -18.2, .7]] as const) {
    ellipse(ctx, x, y, r + .7, r + .6, OUTLINE);
    ellipse(ctx, x, y, r, r * .9, rgba(c.eye, pulse));
    ellipse(ctx, x - r * .3, y - r * .4, r * .3, r * .3, "#fff6dc");
  }
  for (const [i, dy] of ([[0, 0], [1, 2.6]] as const)) {
    const open = snap * 3.2 * (i ? -1 : 1);
    ctx.fillStyle = c.dark; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-16.6, -16 + dy); ctx.quadraticCurveTo(-19.6, -12 + dy + open * .4, -17.8 + open * .3, -8.6 + dy + open); ctx.quadraticCurveTo(-16.2, -12 + dy, -14.4, -16 + dy); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (snap > .02) {
    // gota de veneno que escorre da presa quando o golpe se prepara
    ellipse(ctx, -18.1, -5.4 - snap * 1.4, .9 + snap * .5, 1.5 + snap * 1.1, rgba(c.eye, .55 + snap * .4));
    ctx.strokeStyle = rgba(c.accent, .8 * snap); ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(-18, -8.6 - snap * 1.4); ctx.lineTo(-18.3, -5.2 - snap * 1.4); ctx.stroke();
  }
}

/** Fio de seda que pende da fiandeira e balança de leve; some o brilho quando a criatura está muito ferida. */
function silk(ctx: CanvasRenderingContext2D, c: Palette, time: number): void {
  const sway = Math.sin(time * 1.6) * 1.8;
  ctx.strokeStyle = rgba("#f1ecd8", .8); ctx.lineWidth = .7;
  ctx.beginPath(); ctx.moveTo(19, -12); ctx.quadraticCurveTo(24 + sway, -6, 21 + sway * 1.4, 1); ctx.stroke();
  ctx.strokeStyle = rgba(c.light, .5); ctx.lineWidth = .4;
  ctx.beginPath(); ctx.moveTo(19.6, -12); ctx.quadraticCurveTo(25 + sway, -6, 22 + sway * 1.4, 1); ctx.stroke();
}

/** A Aranha das Raízes inteira, sem moldura nem sombra: patas na passada, presas que abrem no golpe e carapaça que racha com a vida baixa. */
export function drawRootSpider(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  silk(ctx, c, time);
  legs(ctx, c, m.phase, m.moving);
  abdomen(ctx, c, m.seed, m.wound);
  front(ctx, c, time, m.bite);
}

export function renderRootSpiderCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "root-spider", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawRootSpider(surface, colors, t, motion), 19);
}
