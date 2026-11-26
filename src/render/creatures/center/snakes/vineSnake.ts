/**
 * Cobra-Cipó (Centro): corpo comprido em S, escamas em losangos verdes com barriga amarelada e folhas brotando do dorso, que a deixam parecida com um cipó.
 * O corpo ondula pela passada de verdade (`motionPhase`), a boca abre e a língua sai no golpe (`casting`), e as marcas aparecem quando a vida cai. Não decide
 * acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#4e8f3c", light: "#b4d96a", dark: "#1f3d22", accent: "#d6b24a", eye: "#f2d24a", extra: "#6aa84f" };
const MAX_HP = 34;
const SEGMENTS = 16;

/** Posição do segmento `i` (0 = cauda, SEGMENTS-1 = cabeça): uma onda que anda com a passada e respira parada. */
function spine(i: number, time: number, phase: number, moving: number): { x: number; y: number; r: number } {
  const t = i / (SEGMENTS - 1), wave = Math.sin(t * 6.4 - phase * 1.2 - time * 1.1) * (3.4 + moving * 2.6);
  return { x: 22 - t * 46, y: -6 - Math.sin(t * Math.PI) * 6 + wave * (1 - t * .4), r: 2.4 + Math.sin(Math.min(1, t * 1.15) * Math.PI * .55) * 4.2 };
}

/** O corpo: cada segmento é um disco com contorno; a barriga amarelada fica por baixo e os losangos escuros por cima. */
function trunk(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  for (let i = 0; i < SEGMENTS; i++) {
    const s = spine(i, time, m.phase, m.moving);
    const g = ctx.createLinearGradient(s.x, s.y - s.r, s.x, s.y + s.r);
    g.addColorStop(0, c.light); g.addColorStop(.5, c.base); g.addColorStop(1, c.accent);
    ellipse(ctx, s.x, s.y, s.r + .9, s.r + .9, OUTLINE); ellipse(ctx, s.x, s.y, s.r, s.r, g);
    if (i % 2 === 0 && i > 0 && i < SEGMENTS - 2) {
      ctx.fillStyle = rgba(c.dark, .75); ctx.beginPath();
      ctx.moveTo(s.x - s.r * .7, s.y - s.r * .1); ctx.lineTo(s.x, s.y - s.r * .85); ctx.lineTo(s.x + s.r * .7, s.y - s.r * .1); ctx.lineTo(s.x, s.y + s.r * .3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(c.light, .5); ctx.lineWidth = .5; ctx.stroke();
    }
    if (i % 3 === 1 && i < SEGMENTS - 3) {
      // folha brotando do dorso, de lado alternado, que balança
      const side = i % 2 ? 1 : -1, sway = Math.sin(time * 1.7 + i + m.seed * 5) * 1.2;
      ctx.fillStyle = i % 2 ? c.extra : c.base; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - s.r); ctx.quadraticCurveTo(s.x + side * 5 + sway, s.y - s.r - 6, s.x + side * 8 + sway, s.y - s.r - 3.5); ctx.quadraticCurveTo(s.x + side * 3, s.y - s.r - 1.5, s.x, s.y - s.r); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  const tail = spine(0, time, m.phase, m.moving);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.quadraticCurveTo(tail.x + 5, tail.y + 2, tail.x + 8, tail.y - 2 + Math.sin(time * 2) * 1.5); ctx.stroke();
  if (m.wound > .4) {
    for (let k = 0; k < 3; k++) { const s = spine(5 + k * 3, time, m.phase, m.moving); ctx.strokeStyle = rgba("#6a2230", .45 + m.wound * .45); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x - 2, s.y - s.r * .6); ctx.lineTo(s.x + 1.5, s.y + s.r * .5); ctx.stroke(); }
  }
}

/** Cabeça triangular, olhos de pupila fendida, língua bifurcada que sai e presas que descem quando morde. */
function head(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const h = spine(SEGMENTS - 1, time, m.phase, m.moving), snap = clamp01(m.bite);
  const hx = h.x - 3, hy = h.y - 1;
  const g = ctx.createLinearGradient(hx - 10, hy - 5, hx + 4, hy + 5);
  g.addColorStop(0, c.light); g.addColorStop(.5, c.base); g.addColorStop(1, c.dark);
  ctx.fillStyle = g; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(hx + 4, hy - 4.5); ctx.quadraticCurveTo(hx - 6, hy - 6.5, hx - 11, hy - 1 + snap * 1.4); ctx.quadraticCurveTo(hx - 7, hy + 5 + snap * 3, hx + 4, hy + 4.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ellipse(ctx, hx - 2, hy - 2.8, 2.5, 2.1, OUTLINE); ellipse(ctx, hx - 2, hy - 2.9, 1.9, 1.6, c.eye);
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.ellipse(hx - 2, hy - 2.9, .55, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ellipse(ctx, hx - 2.4, hy - 3.6, .4, .4, "#ffffff");
  ellipse(ctx, hx - 9, hy - 2, .6, .5, OUTLINE);
  // língua: sai pouco parada (tremendo) e muito quando o golpe se prepara
  const reach = 5 + snap * 7 + Math.sin(time * 9) * 1.2;
  ctx.strokeStyle = "#c2384a"; ctx.lineWidth = 1; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(hx - 11, hy + .6); ctx.lineTo(hx - 11 - reach, hy + .6);
  ctx.moveTo(hx - 11 - reach, hy + .6); ctx.lineTo(hx - 13 - reach, hy - 1); ctx.moveTo(hx - 11 - reach, hy + .6); ctx.lineTo(hx - 13 - reach, hy + 2.2); ctx.stroke();
  if (snap > .02) {
    ctx.fillStyle = "#f4f0dc"; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .5;
    for (const dx of [-8, -5.5]) { ctx.beginPath(); ctx.moveTo(hx + dx, hy + 1.6); ctx.lineTo(hx + dx + .6, hy + 3 + snap * 3.4); ctx.lineTo(hx + dx + 1.5, hy + 1.6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ellipse(ctx, hx - 7.4, hy + 6.4 + snap * 3, .8, 1.3 + snap * .6, rgba(c.eye, .85));
  }
}

/** A Cobra-Cipó inteira, sem moldura nem sombra: `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawVineSnake(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  trunk(ctx, c, time, m);
  head(ctx, c, time, m);
}

export function renderVineSnakeCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "vine-snake", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawVineSnake(surface, colors, t, motion), 21);
}
