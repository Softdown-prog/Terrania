/**
 * Aranha das Raízes (Centro), refeita com o kit de anatomia (ADR 0093): oito patas de dois ossos por cinemática inversa (quatro de cada lado; as do lado distante,
 * mais escuras, ficam atrás do corpo), com joelhos altos, articulações, cerdas e garras; cefalotórax de carapaça com placas e pelos, oito olhos, dois palpos e
 * quelíceras com presas que abrem no golpe (`casting`), e abdômen de pelo curto com o desenho de raízes e o tufo de musgo que dá o nome da espécie. As patas
 * seguem a passada real (`motionPhase`): diagonais alternadas, e parada a aranha fica em pé sobre elas. A carapaça racha quando a vida cai e do fiandeiro pende
 * um fio de seda. O corpo é montado olhando para a direita e espelhado (as criaturas do Centro olham para a esquerda). Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { drawLeg, solveLeg, type LegSpec } from "../../shared/anatomy/limbs.ts";
import { furAlong, furFlow } from "../../shared/anatomy/fur.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#5b4733", light: "#ac8d60", dark: "#251b13", accent: "#6f9a4a", eye: "#d9f06a", extra: "#7e6546" };
const MAX_HP = 38;

/** Onde cada pata nasce e para onde o pé vai (em x, a partir do quadril) no apoio: duas para a frente, duas para trás, abertas em leque. */
export const SPIDER_LEGS: ReadonlyArray<{ readonly hipX: number; readonly reach: number }> = [
  { hipX: 8, reach: 17 }, { hipX: 5, reach: 9.5 }, { hipX: 1, reach: -9 }, { hipX: -3, reach: -18 },
];
const HIP_Y = -11;

/** A pata `i` do lado `far` na fase dada: o pé balança em torno do apoio e sobe no passo; cada diagonal anda com a sua. */
export function spiderLeg(i: number, far: boolean, phase: number, moving: number): { readonly spec: LegSpec; readonly knee: readonly [number, number]; readonly foot: readonly [number, number] } {
  const base = SPIDER_LEGS[i]!, front = base.reach > 0;
  const spec: LegSpec = { hipX: base.hipX + (far ? 2.4 : 0), hipY: HIP_Y, upper: 13, lower: 19, widthTop: 3.6, widthKnee: 2.6, widthAnkle: 1.6, front, far, foot: "claw", stride: 4, lift: 4 };
  const step = Math.sin(phase + ((i + (far ? 1 : 0)) % 2) * Math.PI + i * .5) * moving;
  const tx = spec.hipX + base.reach + step * 3.6 + (far ? 1.6 : 0), ty = -Math.max(0, step) * 3.2;
  const pose = solveLeg(spec, tx, ty);
  return { spec, knee: pose.knee, foot: pose.foot };
}

/** As oito patas: as do lado distante primeiro (escuras), cada uma com cerdas curtas nos dois ossos e a articulação marcada. */
function legs(ctx: CanvasRenderingContext2D, c: Palette, seed: number, phase: number, moving: number, far: boolean): void {
  for (let i = 0; i < 4; i++) {
    const { spec, knee, foot } = spiderLeg(i, far, phase, moving);
    drawLeg(ctx, c, spec, { knee, foot });
    furAlong(ctx, [[spec.hipX, HIP_Y], knee], -1, { seed: seed + i * 3 + (far ? 40 : 0), count: 5, length: 1.7, sweep: -.2, dark: c.dark, light: c.light, alpha: far ? .5 : .75, width: .6 });
    furAlong(ctx, [knee, foot], -1, { seed: seed + i * 5 + 7 + (far ? 40 : 0), count: 6, length: 1.5, sweep: -.15, dark: c.dark, light: c.extra, alpha: far ? .5 : .75, width: .55 });
    ellipse(ctx, knee[0], knee[1], 1.9, 1.7, far ? c.dark : c.light);
  }
}

/** Abdômen redondo: pelo curto, o desenho de raízes nas costas, o tufo de musgo e a fiandeira na ponta. */
function abdomen(ctx: CanvasRenderingContext2D, c: Palette, seed: number, wound: number): void {
  ctx.save(); ctx.translate(2, 0); ctx.scale(-1, 1); // desenhado com o pedículo à esquerda; espelhado, o abdômen fica atrás do cefalotórax
  const g = ctx.createRadialGradient(-2, -27, 1, -4, -21, 15); g.addColorStop(0, c.light); g.addColorStop(.5, c.base); g.addColorStop(1, c.dark);
  ctx.beginPath(); ctx.moveTo(-3, -22); ctx.bezierCurveTo(-5, -33, 8, -35.4, 15, -30); ctx.bezierCurveTo(23, -24, 20.6, -11, 11, -9.4); ctx.bezierCurveTo(2, -8.6, -3, -14, -3, -22); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.save(); ctx.clip();
  furFlow(ctx, { x0: -4, y0: -35, x1: 22, y1: -9 }, { seed, count: 44, length: 3.6, dx: 1, dy: .4, bend: .4, dark: c.dark, light: c.light, alpha: .38, width: .6 });
  ctx.strokeStyle = rgba(c.dark, .75); ctx.lineWidth = 1.1;
  for (let i = 0; i < 4; i++) {
    const x = 4 + i * 4.2;
    ctx.beginPath(); ctx.moveTo(x, -34); ctx.bezierCurveTo(x - 3, -29, x + 3, -24, x - 1.4, -16); ctx.stroke();
    ctx.strokeStyle = rgba(c.light, .5); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x - .8, -33); ctx.bezierCurveTo(x - 3.8, -29, x + 2.2, -24, x - 2.2, -16); ctx.stroke(); ctx.strokeStyle = rgba(c.dark, .75); ctx.lineWidth = 1.1;
  }
  // as manchas escuras ao longo da espinha (o desenho do abdômen) e o brilho do alto
  for (let k = 0; k < 4; k++) ellipse(ctx, 14 - k * 3.4, -30 + k * 1.2, 1.6, 2.4, rgba(c.dark, .5), .4);
  const sheen = ctx.createLinearGradient(0, -35, 0, -22); sheen.addColorStop(0, rgba("#ffffff", .22)); sheen.addColorStop(1, rgba("#ffffff", 0));
  ctx.fillStyle = sheen; ctx.fillRect(-4, -36, 28, 14);
  ctx.restore();
  furAlong(ctx, [[0, -29], [8, -34], [15, -31], [20, -24]], -1, { seed: seed + 3, count: 14, length: 2.6, sweep: .1, dark: c.dark, light: c.light, alpha: .75, width: .7 });
  for (let i = 0; i < 9; i++) {
    const x = 1 + i * 2.2 + ((seed * 10 + i) % 3) * .3, y = -34.4 + Math.sin(i * .7 + 1) * 1.1 + Math.abs(i - 4) * .55;
    ellipse(ctx, x, y, 2.3, 1.6, i % 2 ? c.accent : "#88b45c");
    ellipse(ctx, x - .4, y - .5, 1, .6, rgba("#d8f2b0", .5));
  }
  ellipse(ctx, 19.6, -12, 2.2, 1.6, c.dark, -.5); ellipse(ctx, 19.6, -12, 1.2, .8, rgba(c.light, .6), -.5);
  if (wound > .4) { ctx.strokeStyle = rgba("#1b120c", .5 + wound * .4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, -33); ctx.lineTo(13, -26); ctx.lineTo(10, -20); ctx.lineTo(14, -13); ctx.stroke(); }
  ctx.restore();
}

/** Cefalotórax de carapaça com placas e pelos, oito olhos (dois grandes, seis pequenos), dois palpos e quelíceras com presas que abrem para morder. */
function front(ctx: CanvasRenderingContext2D, c: Palette, seed: number, time: number, bite: number, wound: number): void {
  const snap = clamp01(bite);
  const g = ctx.createRadialGradient(12, -26, 1, 10, -20, 11); g.addColorStop(0, c.light); g.addColorStop(.55, c.base); g.addColorStop(1, c.dark);
  ctx.beginPath(); ctx.moveTo(1, -17.6); ctx.bezierCurveTo(1, -27, 8, -29, 14, -27.4); ctx.bezierCurveTo(19.4, -25, 20, -17, 15, -14.4); ctx.bezierCurveTo(9, -12.6, 1, -12.6, 1, -17.6); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
  // as placas da carapaça: a fenda central, as costuras radiais e o brilho
  ctx.save(); ctx.clip();
  ctx.strokeStyle = rgba(c.dark, .6); ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(6, -26); ctx.lineTo(8.6, -19); ctx.stroke();
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(8.6, -19 + k * .3); ctx.lineTo(2 + k * 4.4, -13.4); ctx.stroke(); }
  furFlow(ctx, { x0: 1, y0: -29, x1: 20, y1: -13 }, { seed: seed + 11, count: 16, length: 2.8, dx: -1, dy: .3, dark: c.dark, light: c.light, alpha: .45, width: .6 });
  const gleam = ctx.createRadialGradient(10, -26, 0, 10, -23, 8); gleam.addColorStop(0, rgba(c.light, .55)); gleam.addColorStop(1, rgba(c.light, 0)); ctx.fillStyle = gleam; ctx.fillRect(1, -30, 20, 18);
  ctx.restore();
  // os palpos: dois apêndices curtos de ponta clara na frente da boca
  for (const [k, dy] of [[0, 0], [1, 2.4]] as const) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(18.6, -15.4 + dy); ctx.quadraticCurveTo(22.4, -13 + dy, 22.6 + snap, -10 + dy); ctx.stroke();
    ctx.strokeStyle = k ? c.extra : c.base; ctx.lineWidth = 1.2; ctx.stroke(); ellipse(ctx, 22.7 + snap, -9.6 + dy, 1.5, 1.2, c.light);
  }
  ctx.lineCap = "butt";
  const pulse = .85 + Math.sin(time * 3) * .15;
  for (const [x, y, r] of [[17.4, -23.4, 1.7], [14.6, -24.6, 1.4], [19.6, -20.8, 1.1], [16.6, -21.2, .9], [12.4, -22.4, .8], [18.6, -18.2, .7], [15.4, -19.4, .6], [13.2, -20.6, .55]] as const) {
    ellipse(ctx, x, y, r + .7, r + .6, OUTLINE);
    ellipse(ctx, x, y, r, r * .9, rgba(c.eye, pulse));
    ellipse(ctx, x + r * .3, y - r * .4, r * .3, r * .3, "#fff6dc");
  }
  furAlong(ctx, [[2, -22], [6, -27.4], [13, -28.4]], -1, { seed: seed + 17, count: 6, length: 2.2, sweep: -.2, dark: c.dark, light: c.light, alpha: .7, width: .7 });
  // as quelíceras com as presas: abrem em tesoura, a de baixo desce
  for (const [i, dy] of ([[0, 0], [1, 2.8]] as const)) {
    const open = snap * 3.4 * (i ? -1 : 1);
    ctx.fillStyle = c.dark; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(16.6, -16 + dy); ctx.quadraticCurveTo(19.6, -12 + dy + open * .4, 17.8 + open * .3, -8.6 + dy + open); ctx.quadraticCurveTo(16.2, -12 + dy, 14.4, -16 + dy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e9dcc0"; ctx.beginPath(); ctx.moveTo(18.4 + open * .2, -10 + dy + open * .6); ctx.lineTo(17.8 + open * .3, -7.6 + dy + open * 1.1); ctx.lineTo(17 + open * .1, -10 + dy + open * .6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(c.light, .4); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(16, -15 + dy); ctx.lineTo(17.4, -11 + dy); ctx.stroke();
  }
  if (snap > .02) {
    // gota de veneno que escorre da presa quando o golpe se prepara
    ellipse(ctx, 18.1, -5.4 - snap * 1.4, .9 + snap * .5, 1.5 + snap * 1.1, rgba(c.eye, .55 + snap * .4));
    ctx.strokeStyle = rgba(c.accent, .8 * snap); ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(18, -8.6 - snap * 1.4); ctx.lineTo(18.3, -5.2 - snap * 1.4); ctx.stroke();
  }
  if (wound > .6) { ctx.strokeStyle = rgba("#1b120c", .5 + wound * .4); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(8, -26); ctx.lineTo(10, -21); ctx.lineTo(7.4, -16); ctx.stroke(); }
}

/** Fio de seda que pende da fiandeira e balança de leve. */
function silk(ctx: CanvasRenderingContext2D, c: Palette, time: number): void {
  const sway = Math.sin(time * 1.6) * 1.8;
  ctx.strokeStyle = rgba("#f1ecd8", .8); ctx.lineWidth = .7;
  ctx.beginPath(); ctx.moveTo(-19, -12); ctx.quadraticCurveTo(-24 - sway, -6, -21 - sway * 1.4, 1); ctx.stroke();
  ctx.strokeStyle = rgba(c.light, .5); ctx.lineWidth = .4;
  ctx.beginPath(); ctx.moveTo(-19.6, -12); ctx.quadraticCurveTo(-25 - sway, -6, -22 - sway * 1.4, 1); ctx.stroke();
}

/** A Aranha das Raízes inteira, sem moldura nem sombra: patas na passada, presas que abrem no golpe e carapaça que racha com a vida baixa. */
export function drawRootSpider(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  ctx.save(); ctx.scale(-1, 1); // o corpo é montado olhando para a direita; a Aranha olha para a esquerda
  silk(ctx, c, time);
  legs(ctx, c, m.seed, m.phase, m.moving, true);
  abdomen(ctx, c, m.seed, m.wound);
  front(ctx, c, m.seed, time, m.bite, m.wound);
  legs(ctx, c, m.seed, m.phase, m.moving, false);
  ctx.restore();
}

export function renderRootSpiderCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "root-spider", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawRootSpider(surface, colors, t, motion), 19);
}
