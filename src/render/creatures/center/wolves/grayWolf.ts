/**
 * Lobo Cinzento (Centro), refeito com o kit de anatomia (ADR 0093): tronco esguio de peito fundo e barriga recolhida, quatro patas de dois ossos (as de trás empurram,
 * as da frente alcançam, em diagonais) e a pelagem em mechas que seguem o corpo, com a gola do pescoço, o peito claro e a cauda de pincel. A cabeça tem focinho com
 * nariz de couro, sobrancelha, olho âmbar de pupila estreita, orelhas com pelo por dentro e uma mandíbula que gira na dobradiça: no golpe abre e mostra presas,
 * dentes e língua. A vida que falta aparece em arranhões. O desenho olha para a esquerda (como as outras criaturas do Centro); o corpo é montado olhando para a
 * direita e espelhado. Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { drawLeg, legPose } from "../../shared/anatomy/limbs.ts";
import { drawTorso, torsoPath, type TorsoSpec } from "../../shared/anatomy/torso.ts";
import { quadrupedLegs, type QuadrupedSpec } from "../../shared/anatomy/quadruped.ts";
import { furAlong, furFlow } from "../../shared/anatomy/fur.ts";
import { clamp01, ellipse, rgba, shade } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#7b8087", light: "#cfd3d6", dark: "#2e3237", accent: "#c9a24a", eye: "#e6b94a", extra: "#a0a5ab" };
const MAX_HP = 90;

/** As medidas do lobo (olhando para +x antes do espelho): tronco, pernas e passada. */
export const GRAY_WOLF_BODY: QuadrupedSpec = {
  torso: { front: 20, rear: -22, withers: -35, back: -33, croup: -32, bellyFront: -15.5, bellyRear: -23, shoulderX: 10, haunchX: -12, muscle: 6.5 },
  frontLeg: { upper: 8.6, lower: 9.4, widthTop: 5.2, widthKnee: 3.6, widthAnkle: 2.6, foot: "paw" },
  rearLeg: { upper: 9, lower: 9, widthTop: 6.4, widthKnee: 3.8, widthAnkle: 2.6, foot: "paw" },
  frontHipX: 11, rearHipX: -14, hipY: -17.5, stride: 8, lift: 4,
};
const TORSO: TorsoSpec = GRAY_WOLF_BODY.torso;
const BACK_LINE = [[16, -34.2], [8, -34.6], [-1, -33.8], [-11, -33.2], [-20, -31.6]] as const;
const CHEST_LINE = [[21, -29], [21.6, -24], [19, -18.6]] as const;
const BELLY_LINE = [[14, -17], [4, -16.6], [-6, -18.4], [-15, -22]] as const;

/** Cauda de pincel: grossa, cai atrás e se abre correndo; as mechas saem pelos dois lados e a ponta é clara. */
function tail(ctx: CanvasRenderingContext2D, c: Palette, m: CreatureMotion, time: number): void {
  const sway = Math.sin(m.phase * 1.2) * 4 * m.moving + Math.sin(time * 1.5) * 1.2, lift = m.moving * 5;
  const pts: ReadonlyArray<readonly [number, number]> = [[-20, -30.5], [-27, -29 - lift * .7], [-33.6, -23.4 - lift * .4 + sway * .5], [-36.6, -15.5 - lift * .2 + sway]];
  ctx.lineCap = "round";
  // três trechos de largura crescente e depois fina: a cauda é mais grossa no meio, como um pincel
  for (let k = 0; k < 3; k++) {
    const [x0, y0] = k === 0 ? pts[0]! : pts[k]!, [x1, y1] = pts[k + 1]!, w = [5.6, 7.6, 5][k]!;
    for (const [extra, color] of [[2.4, OUTLINE], [0, k === 1 ? c.extra : c.base]] as const) {
      ctx.strokeStyle = color; ctx.lineWidth = w + extra;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 - 1.2, (y0 + y1) / 2 - .6, x1, y1); ctx.stroke();
    }
  }
  ctx.strokeStyle = rgba(c.light, .6); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-25, -29); ctx.quadraticCurveTo(-31.5, -25.6 - lift * .5, -36, -16.6 - lift * .2 + sway); ctx.stroke();
  for (const side of [-1, 1] as const) furAlong(ctx, pts, side, { seed: m.seed + side, count: 7, length: 2.2, sweep: -.35, dark: c.extra, light: c.light, alpha: .55, width: .8 });
  ellipse(ctx, -38.4, -13.6 - lift * .3 + sway, 2.6, 4.2, c.light, .15);
  ctx.strokeStyle = rgba(c.dark, .6); ctx.lineWidth = .8;
  for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-38 + k * 1.2, -16 - lift * .3 + sway); ctx.lineTo(-38.6 + k * 1.7, -10.4 - lift * .3 + sway); ctx.stroke(); }
}

/** Tronco com volume, pelagem deitada pelo flanco, peito e barriga mais claros, gola do pescoço e mechas no dorso, no peito e na barriga. */
function torso(ctx: CanvasRenderingContext2D, c: Palette, seed: number, time: number): void {
  const breath = Math.sin(time * 2 + seed * 5) * .45;
  ctx.save(); ctx.translate(0, breath * .3);
  drawTorso(ctx, c, TORSO);
  ctx.save(); torsoPath(ctx, TORSO); ctx.clip();
  furFlow(ctx, { x0: -22, y0: -35, x1: 19, y1: -16 }, { seed, count: 60, length: 4.6, dx: -1, dy: .2, bend: .3, dark: c.dark, light: c.light, alpha: .3, width: .7 });
  const chest = ctx.createRadialGradient(18, -21, 1, 18, -21, 12);
  chest.addColorStop(0, rgba(c.light, .85)); chest.addColorStop(1, rgba(c.light, 0));
  ctx.fillStyle = chest; ctx.fillRect(4, -34, 20, 20);
  const belly = ctx.createLinearGradient(0, -22, 0, -15); belly.addColorStop(0, rgba(c.light, 0)); belly.addColorStop(1, rgba(c.light, .55));
  ctx.fillStyle = belly; ctx.fillRect(-22, -23, 38, 8);
  ctx.restore();
  furAlong(ctx, BACK_LINE, -1, { seed, count: 28, length: 3.2, sweep: -.5, dark: c.extra, light: c.light, alpha: .7, width: 1 });
  furAlong(ctx, CHEST_LINE, -1, { seed: seed + 7, count: 9, length: 3.4, sweep: -.2, dark: c.extra, light: c.light, width: 1 });
  furAlong(ctx, BELLY_LINE, 1, { seed: seed + 13, count: 12, length: 2.4, sweep: -.3, dark: c.extra, light: c.light, alpha: .7, width: .9 });
  ctx.restore();
}

/** A gola: o pescoço grosso de pelo comprido que liga o tronco à cabeça, com mechas que caem para trás. */
function ruff(ctx: CanvasRenderingContext2D, c: Palette, seed: number): void {
  const g = ctx.createLinearGradient(14, -40, 28, -22); g.addColorStop(0, c.light); g.addColorStop(.5, c.base); g.addColorStop(1, shade(c.dark, .1));
  ctx.beginPath(); ctx.moveTo(13, -35); ctx.bezierCurveTo(19, -40, 27, -41, 31, -36); ctx.bezierCurveTo(33, -29, 28, -22, 21, -19); ctx.bezierCurveTo(16, -19, 12, -25, 13, -35); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
  furAlong(ctx, [[14, -35.4], [20, -39.2], [27, -39.6], [31, -36.2]], -1, { seed: seed + 21, count: 11, length: 3.6, sweep: -.5, dark: c.dark, light: c.light, width: 1 });
  furAlong(ctx, [[31, -35], [32, -29.5], [28, -23.4], [22, -19.6]], -1, { seed: seed + 29, count: 10, length: 3.8, sweep: -.35, dark: c.extra, light: c.light, width: 1 });
}

/** Cabeça de focinho longo: crânio, focinho com nariz de couro, sobrancelha, olho âmbar, orelhas com pelo por dentro e mandíbula que gira (presas e língua no golpe). */
function head(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const snap = clamp01(m.bite), open = snap * .5;
  // orelha do outro lado (atrás do crânio) e a mandíbula de baixo, que gira na dobradiça sob a bochecha
  for (const [bx, h, dark] of [[22.4, 8, true], [25.4, 9, false]] as const) {
    ctx.fillStyle = dark ? shade(c.base, -.25) : c.base; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx - 3.4, -37); ctx.quadraticCurveTo(bx - 2.6, -37 - h * .8, bx + .6, -37 - h); ctx.quadraticCurveTo(bx + 2.6, -37 - h * .4, bx + 4.2, -36); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (!dark) { ctx.fillStyle = rgba(c.accent, .35); ctx.beginPath(); ctx.moveTo(bx - 1.8, -37.4); ctx.quadraticCurveTo(bx - 1.2, -37 - h * .65, bx + .5, -37 - h * .8); ctx.quadraticCurveTo(bx + 1.6, -37 - h * .35, bx + 2.4, -36.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(c.light, .8); ctx.lineWidth = .6; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(bx - 1.2 + k * 1.2, -36.6); ctx.lineTo(bx - .4 + k * 1, -38.4 - h * .5); ctx.stroke(); } }
  }
  ctx.save(); ctx.translate(28.4, -28.2); ctx.rotate(open);
  ctx.beginPath(); ctx.moveTo(0, -.6); ctx.lineTo(14, .2); ctx.quadraticCurveTo(15.4, 1.6, 13.6, 3); ctx.lineTo(3, 4.6); ctx.quadraticCurveTo(-1.6, 3.6, 0, -.6); ctx.closePath();
  ctx.fillStyle = c.dark; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9; ctx.stroke();
  ctx.fillStyle = rgba(c.light, .55); ctx.beginPath(); ctx.moveTo(2, 2.6); ctx.quadraticCurveTo(8, 3.8, 13, 2.4); ctx.lineTo(13, 3); ctx.quadraticCurveTo(8, 4.6, 2, 3.6); ctx.closePath(); ctx.fill();
  if (snap > .05) { ellipse(ctx, 8, .8 + snap * .8, 5.2, .9 + snap * 1.1, rgba("#c2384a", .85)); ellipse(ctx, 8.4, .4 + snap * .6, 3, .5, rgba("#e48a96", .7)); }
  ctx.fillStyle = "#f2ecd9";
  for (let t = 0; t < 4; t++) { const x = 4 + t * 2.7, h = t === 0 ? 3.2 : 1.8 + snap * .6; ctx.beginPath(); ctx.moveTo(x, .4); ctx.lineTo(x + .8, .4 - h); ctx.lineTo(x + 1.7, .4); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // crânio e focinho, num caminho só, com gradiente de cima para baixo
  const g = ctx.createLinearGradient(30, -40, 36, -26); g.addColorStop(0, c.light); g.addColorStop(.45, c.base); g.addColorStop(1, c.dark);
  ctx.beginPath(); ctx.moveTo(23, -37); ctx.quadraticCurveTo(29, -41.4, 35.4, -36.6); ctx.quadraticCurveTo(40, -34, 44.2, -31.6); ctx.quadraticCurveTo(45.6, -29.6, 43.6, -28.2);
  ctx.quadraticCurveTo(37, -27, 29.4, -27.4); ctx.quadraticCurveTo(23, -28, 22.4, -33); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  // focinho mais claro e a linha da boca
  ellipse(ctx, 38.6, -30.4, 6.4, 2.6, rgba(c.extra, .75), .14);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(43, -28.6); ctx.quadraticCurveTo(36, -27.2 + open * 3, 29, -27.6 + open * 4); ctx.stroke();
  // dentes de cima (as presas maiores) e o nariz de couro
  ctx.fillStyle = "#f6f0dc"; ctx.strokeStyle = rgba(OUTLINE, .6); ctx.lineWidth = .4;
  for (let t = 0; t < 4; t++) { const x = 41 - t * 2.9, h = t === 0 ? 3.3 + snap * 1.2 : 1.8 + snap * .6; ctx.beginPath(); ctx.moveTo(x, -28.3 + t * .1); ctx.lineTo(x - .8, -28.3 + h); ctx.lineTo(x - 1.7, -28.1 + t * .1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ellipse(ctx, 43.8, -30.4, 2.2, 1.8, "#141818"); ellipse(ctx, 43.2, -31.1, .8, .5, rgba("#9aa4a4", .8));
  ctx.fillStyle = rgba(c.dark, .8); for (const [x, y] of [[39.5, -30.6], [37.5, -30], [38.8, -29]] as const) { ctx.beginPath(); ctx.arc(x, y, .35, 0, Math.PI * 2); ctx.fill(); }
  // sobrancelha, olho (pálpebra, íris âmbar, pupila estreita, brilho) e pelo da bochecha
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(28.4, -37.4); ctx.lineTo(35.6, -35.4 - snap * .6); ctx.stroke(); ctx.lineCap = "butt";
  const blink = Math.sin(time * .8 + m.seed * 11) > .985;
  if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(29.8, -33.8); ctx.lineTo(34.4, -34.4); ctx.stroke(); }
  else {
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.moveTo(29.2, -33.4); ctx.quadraticCurveTo(32, -36.6, 35.4, -34.6); ctx.quadraticCurveTo(33, -32.4, 29.2, -33.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.eye; ctx.beginPath(); ctx.moveTo(30, -33.6); ctx.quadraticCurveTo(32.2, -35.8, 34.6, -34.6); ctx.quadraticCurveTo(32.6, -33, 30, -33.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.ellipse(32.6, -34.4, .55, 1.1, .5, 0, Math.PI * 2); ctx.fill(); ellipse(ctx, 31.8, -34.9, .45, .35, "#fff6dc");
  }
  furAlong(ctx, [[25, -35.4], [24, -31.4], [25.4, -28]], 1, { seed: m.seed + 41, count: 5, length: 2.8, sweep: -.5, dark: c.dark, light: c.light, width: .9 });
  if (snap > .02) {
    // o rosnado: linhas de força nas dobras do focinho
    ctx.strokeStyle = rgba(c.light, .35 + snap * .5); ctx.lineWidth = .8;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(39 + k * 1.4, -33.4 - k * .9); ctx.lineTo(42.4 + k * 1.4, -32.4 - k * .9); ctx.stroke(); }
  }
}

/** Arranhões pelo flanco e pelo pescoço, cada vez mais fundos conforme a vida cai. */
function wounds(ctx: CanvasRenderingContext2D, wound: number): void {
  if (wound <= .35) return;
  ctx.strokeStyle = rgba("#8c3b3d", .4 + wound * .5); ctx.lineWidth = 1; ctx.lineCap = "round";
  for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.moveTo(-2 + s * 3.2, -33); ctx.lineTo(.6 + s * 3.2, -25); ctx.stroke(); }
  if (wound > .6) for (let s = 0; s < 2; s++) { ctx.beginPath(); ctx.moveTo(14 + s * 2.6, -37); ctx.lineTo(16.4 + s * 2.6, -30); ctx.stroke(); }
  ctx.lineCap = "butt";
}

/** O Lobo Cinzento inteiro, sem moldura nem sombra: `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawGrayWolf(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  ctx.save(); ctx.scale(-1, 1); // o corpo é montado olhando para a direita; o Lobo olha para a esquerda
  const legs = quadrupedLegs(GRAY_WOLF_BODY, m.phase, m.moving);
  tail(ctx, c, m, time);
  for (const leg of legs) if (leg.spec.far) drawLeg(ctx, c, leg.spec, legPose(leg.spec, leg.phase));
  torso(ctx, c, m.seed, time);
  for (const leg of legs) if (!leg.spec.far) drawLeg(ctx, c, leg.spec, legPose(leg.spec, leg.phase));
  ruff(ctx, c, m.seed);
  head(ctx, c, time, m);
  wounds(ctx, m.wound);
  ctx.restore();
}

export function renderGrayWolfCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "gray-wolf", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawGrayWolf(surface, colors, t, motion), 21);
}
