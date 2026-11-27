/**
 * Raiz-Viva (Centro, ADR 0094): um nó de raízes que se arrasta pelo chão. O tronco retorcido tem casca em sulcos fundos, nós, musgo no alto e um rosto escavado de olhos
 * acesos (seiva verde); embaixo, quatro raízes de dois ossos (cinemática inversa, com a ponta em gancho) o carregam na passada real (`motionPhase`), e, no golpe
 * (`casting`), duas raízes compridas e espinhosas chicoteiam para a frente enquanto a boca se abre e a seiva escorre. A vida que falta racha a casca e vaza seiva.
 * O corpo é montado olhando para a direita e espelhado (as criaturas do Centro olham para a esquerda). Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { drawLeg, solveLeg, type LegSpec } from "../../shared/anatomy/limbs.ts";
import { furAlong, furFlow } from "../../shared/anatomy/fur.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#6b4a2e", light: "#b08552", dark: "#271a0d", accent: "#6fa84a", eye: "#c8f06a", extra: "#8a6a3e" };
const MAX_HP = 220;

/** Onde cada raiz-perna nasce e para onde o pé vai no apoio: duas para a frente e duas para trás. */
export const ROOT_LEGS: ReadonlyArray<{ readonly hipX: number; readonly reach: number }> = [{ hipX: 5, reach: 13 }, { hipX: 2, reach: 6 }, { hipX: -2, reach: -7 }, { hipX: -5, reach: -14 }];
const HIP_Y = -9;

/** A raiz `i` do lado `far` na fase dada: o pé balança em torno do apoio e sobe no passo; vizinhas alternam. */
export function rootLeg(i: number, far: boolean, phase: number, moving: number): { readonly spec: LegSpec; readonly knee: readonly [number, number]; readonly foot: readonly [number, number] } {
  const base = ROOT_LEGS[i]!, front = base.reach > 0;
  const spec: LegSpec = { hipX: base.hipX + (far ? 1.8 : 0), hipY: HIP_Y, upper: 8, lower: 11.5, widthTop: 5, widthKnee: 3.4, widthAnkle: 2.2, front, far, foot: "claw", stride: 3.6, lift: 3.4 };
  const step = Math.sin(phase + ((i + (far ? 1 : 0)) % 2) * Math.PI + i * .4) * moving;
  const pose = solveLeg(spec, spec.hipX + base.reach + step * 3.2 + (far ? 1.2 : 0), -Math.max(0, step) * 3);
  return { spec, knee: pose.knee, foot: pose.foot };
}

/** As quatro raízes-perna de um lado (as do lado distante, escuras, saem atrás do tronco), com nós e radículas finas. */
function legs(ctx: CanvasRenderingContext2D, c: Palette, seed: number, phase: number, moving: number, far: boolean): void {
  for (let i = 0; i < 4; i++) {
    const { spec, knee, foot } = rootLeg(i, far, phase, moving);
    drawLeg(ctx, c, spec, { knee, foot });
    furAlong(ctx, [knee, foot], 1, { seed: seed + i * 7 + (far ? 50 : 0), count: 4, length: 2, sweep: .1, dark: c.dark, light: c.extra, alpha: far ? .5 : .8, width: .6 });
    ellipse(ctx, knee[0], knee[1], 2.2, 1.9, far ? c.dark : c.extra);
  }
}

/** O tronco: casca em sulcos, nós, musgo e a poça de terra revolvida onde ele pisa. */
function trunk(ctx: CanvasRenderingContext2D, c: Palette, seed: number, time: number, wound: number): void {
  ellipse(ctx, 0, -1.5, 19, 3.4, rgba("#2a1d12", .55)); ellipse(ctx, 1, -2, 12, 2, rgba("#4a3320", .5));
  const g = ctx.createLinearGradient(-12, -30, 12, -8); g.addColorStop(0, c.light); g.addColorStop(.45, c.base); g.addColorStop(1, c.dark);
  ctx.beginPath(); ctx.moveTo(-11, -9); ctx.bezierCurveTo(-14, -16, -9, -22, -11, -27); ctx.bezierCurveTo(-8, -33, 4, -34, 9, -29); ctx.bezierCurveTo(14, -24, 11, -16, 12, -9); ctx.quadraticCurveTo(0, -5, -11, -9); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
  ctx.save(); ctx.clip();
  furFlow(ctx, { x0: -14, y0: -34, x1: 14, y1: -7 }, { seed, count: 40, length: 8, dx: .15, dy: 1, bend: .5, dark: c.dark, light: c.light, alpha: .5, width: .9 });
  ctx.strokeStyle = rgba(c.dark, .75); ctx.lineWidth = 1.1;
  for (const [x, a, b] of [[-6, -30, -10], [-1, -31, -8], [5, -29, -11], [9, -26, -12]] as const) { ctx.beginPath(); ctx.moveTo(x, a); ctx.bezierCurveTo(x - 2.4, a + 6, x + 2.2, b - 6, x - .8, b); ctx.stroke(); }
  for (const [x, y, r] of [[-7, -17, 2.4], [6, -22, 2], [3, -12, 1.8]] as const) { ellipse(ctx, x, y, r, r * .8, rgba(c.dark, .6)); ellipse(ctx, x - .4, y - .5, r * .5, r * .35, rgba(c.light, .5)); }
  const sheen = ctx.createLinearGradient(-12, -32, 0, -14); sheen.addColorStop(0, rgba("#ffffff", .25)); sheen.addColorStop(1, rgba("#ffffff", 0)); ctx.fillStyle = sheen; ctx.fillRect(-14, -34, 16, 22);
  ctx.restore();
  // musgo no alto, que balança de leve, e uma folha ou duas que brotam
  for (let i = 0; i < 8; i++) { const x = -9 + i * 2.6, sway = Math.sin(time * 1.4 + i + seed * 3) * 1; ctx.strokeStyle = i % 2 ? c.accent : "#88b45c"; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, -31 + Math.abs(i - 3.5) * .9); ctx.quadraticCurveTo(x + sway, -35, x + sway * 1.5 + (i - 3.5) * .4, -37 - (i % 3)); ctx.stroke(); }
  ctx.lineCap = "butt";
  furAlong(ctx, [[-11, -27], [-8, -32], [0, -34], [8, -31], [10, -26]], -1, { seed: seed + 5, count: 10, length: 2.4, sweep: 0, dark: c.accent, light: "#a8d078", alpha: .85, width: 1 });
  if (wound > .35) {
    ctx.strokeStyle = rgba("#150d06", .55 + wound * .35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(1, -33); ctx.lineTo(4, -26); ctx.lineTo(0, -21); ctx.lineTo(4, -14); ctx.stroke();
    ctx.strokeStyle = rgba(c.eye, .55 + wound * .3); ctx.lineWidth = .7; ctx.stroke();
    ellipse(ctx, 3, -12 + wound * 3, 1.2, 2 + wound, rgba(c.eye, .7));
  }
}

/** O rosto escavado: duas órbitas fundas com olhos de seiva acesa e uma boca em fenda que se abre no golpe, com seiva escorrendo. */
function face(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const snap = clamp01(m.bite), pulse = .8 + Math.sin(time * 3 + m.seed * 5) * .2;
  for (const [x, y] of [[3.4, -24], [8.2, -22.6]] as const) {
    ellipse(ctx, x, y, 2.9, 3.2, "#0c0704"); ellipse(ctx, x, y, 1.8, 2, rgba(c.eye, pulse)); ellipse(ctx, x + .3, y + .2, .7, 1.4, "#0c0704"); ellipse(ctx, x - .4, y - .9, .5, .5, "#f4ffd0");
    const glow = ctx.createRadialGradient(x, y, 1, x, y, 6); glow.addColorStop(0, rgba(c.eye, .3 * pulse)); glow.addColorStop(1, rgba(c.eye, 0)); ellipse(ctx, x, y, 6, 6, glow);
  }
  ctx.strokeStyle = "#0c0704"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(1, -27.4); ctx.lineTo(6, -26.6 - snap * .6); ctx.moveTo(6.4, -26); ctx.lineTo(10.6, -25 - snap * .6); ctx.stroke(); ctx.lineCap = "butt";
  ctx.fillStyle = "#0c0704"; ctx.beginPath(); ctx.moveTo(2.4, -17.4); ctx.quadraticCurveTo(6.6, -16 + snap * 3.4, 11, -18 + snap * 1); ctx.quadraticCurveTo(7, -17.6 - snap * .6, 2.4, -17.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(c.light, .6); ctx.lineWidth = .6; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(3.4 + k * 2, -17.5); ctx.lineTo(3.6 + k * 2, -16.2 + snap * 1.2); ctx.stroke(); }
  if (snap > .1) { ellipse(ctx, 6.6, -14.4 + snap * 2, .9 + snap * .4, 1.6 + snap * 1.2, rgba(c.eye, .8)); ctx.strokeStyle = rgba(c.eye, .7); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(6.6, -16.4); ctx.lineTo(6.6, -14 + snap * 2); ctx.stroke(); }
}

/** As duas raízes compridas e espinhosas que chicoteiam para a frente no golpe (e se enrolam, paradas, junto ao tronco). */
function lashes(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const snap = clamp01(m.bite);
  for (const [k, dy] of [[0, 0], [1, 5]] as const) {
    const reach = 7 + snap * 20, sway = Math.sin(time * 3 + k * 2 + m.seed * 4) * (1.4 + snap * 1.6), y0 = -20 + dy;
    const pts: ReadonlyArray<readonly [number, number]> = [[10, y0], [10 + reach * .45, y0 - 6 + sway - snap * 3], [10 + reach * .8, y0 - 1 - sway * .6 + snap * 3], [10 + reach, y0 + 2 + sway * .5 + snap * 4]];
    for (const [w, color] of [[4.6, OUTLINE], [3.2, c.base]] as const) {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(pts[0]![0], pts[0]![1]); ctx.bezierCurveTo(pts[1]![0], pts[1]![1], pts[2]![0], pts[2]![1], pts[3]![0], pts[3]![1]); ctx.stroke();
    }
    ctx.strokeStyle = rgba(c.light, .6); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(pts[0]![0], pts[0]![1] - .8); ctx.bezierCurveTo(pts[1]![0], pts[1]![1] - .8, pts[2]![0], pts[2]![1] - .8, pts[3]![0], pts[3]![1] - .8); ctx.stroke();
    furAlong(ctx, pts, -1, { seed: m.seed + k * 9, count: 6, length: 2.4 + snap * 1.6, sweep: .3, dark: c.dark, light: c.accent, alpha: .85, width: .9 });
    ellipse(ctx, pts[3]![0] + .8, pts[3]![1] + .6, 2.2, 1.5, c.extra, .5); ellipse(ctx, pts[3]![0] + 1.6, pts[3]![1] + 1.2, 1, 2, c.light, .6);
    ctx.lineCap = "butt";
  }
}

/** A Raiz-Viva inteira, sem moldura nem sombra: `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawLivingRoot(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  ctx.save(); ctx.scale(-1, 1); // o corpo é montado olhando para a direita; a Raiz-Viva olha para a esquerda
  const breath = Math.sin(time * 1.8 + m.seed * 5) * .5;
  legs(ctx, c, m.seed, m.phase, m.moving, true);
  ctx.save(); ctx.translate(0, breath * .3); trunk(ctx, c, m.seed, time, m.wound); face(ctx, c, time, m); lashes(ctx, c, time, m); ctx.restore();
  legs(ctx, c, m.seed, m.phase, m.moving, false);
  ctx.restore();
}

export function renderLivingRootCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "living-root", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawLivingRoot(surface, colors, t, motion), 24);
}
