/**
 * Besouro de Raiz (Centro), refeito com o kit de anatomia (ADR 0093): casco em cúpula de élitros marrom-escuros, com estrias que acompanham a curva, pontuações,
 * borda mais escura e musgo nas dobras; o pronoto (a placa do pescoço); seis patas de dois ossos por cinemática inversa (três de cada lado, em tripés alternados,
 * as do lado distante atrás do casco) com espinhos e garras; e uma cabeça com olho de facetas, antenas de clava lamelada e duas mandíbulas dentadas que abrem
 * no golpe (`casting`). Parado, ele fica em pé sobre as patas; o casco racha quando a vida cai. O corpo é montado olhando para a direita e espelhado (as criaturas
 * do Centro olham para a esquerda). Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { drawLeg, solveLeg, type LegSpec } from "../../shared/anatomy/limbs.ts";
import { furAlong, furFlow, unit } from "../../shared/anatomy/fur.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#5a3d2a", light: "#a6845a", dark: "#1f140d", accent: "#6f9a4a", eye: "#e8c46a", extra: "#7a5a3a" };
const MAX_HP = 55;

/** Onde cada uma das três patas de um lado nasce e para onde o pé vai no apoio: a da frente alcança, a do meio desce, a de trás empurra. */
export const BEETLE_LEGS: ReadonlyArray<{ readonly hipX: number; readonly reach: number }> = [{ hipX: 8, reach: 8.5 }, { hipX: 0, reach: 2 }, { hipX: -9, reach: -9.5 }];
const HIP_Y = -9;

/** A pata `i` do lado `far` na fase dada: tripé alternado (a da frente e a de trás de um lado andam com a do meio do outro). */
export function beetleLeg(i: number, far: boolean, phase: number, moving: number): { readonly spec: LegSpec; readonly knee: readonly [number, number]; readonly foot: readonly [number, number] } {
  const base = BEETLE_LEGS[i]!, front = base.reach >= 0;
  const spec: LegSpec = { hipX: base.hipX + (far ? 1.6 : 0), hipY: HIP_Y, upper: 7.4, lower: 10.2, widthTop: 3.6, widthKnee: 2.6, widthAnkle: 1.8, front, far, foot: "claw", stride: 3.6, lift: 3 };
  const step = Math.sin(phase + ((i + (far ? 1 : 0)) % 2) * Math.PI) * moving;
  const pose = solveLeg(spec, spec.hipX + base.reach + step * 3.4, -Math.max(0, step) * 2.6);
  return { spec, knee: pose.knee, foot: pose.foot };
}

/** As três patas de um lado, com espinhos nas canelas e a articulação marcada. */
function legs(ctx: CanvasRenderingContext2D, c: Palette, seed: number, phase: number, moving: number, far: boolean): void {
  for (let i = 0; i < 3; i++) {
    const { spec, knee, foot } = beetleLeg(i, far, phase, moving);
    drawLeg(ctx, c, spec, { knee, foot });
    furAlong(ctx, [knee, foot], -1, { seed: seed + i * 3 + (far ? 30 : 0), count: 4, length: 1.8, sweep: .25, dark: c.dark, light: c.light, alpha: far ? .5 : .85, width: .7 });
    ellipse(ctx, knee[0], knee[1], 1.9, 1.7, far ? c.dark : c.extra);
  }
}

/** O contorno da cúpula dos élitros. */
function shellPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath(); ctx.moveTo(-21, -10); ctx.bezierCurveTo(-23.4, -26, -10, -31.6, 0, -31); ctx.bezierCurveTo(12, -30.4, 21, -22, 19.6, -10);
  ctx.bezierCurveTo(10, -6, -12, -6, -21, -10); ctx.closePath();
}

/** O casco: cúpula com brilho, estrias que seguem a curva, pontuações, borda escura, musgo nas dobras e as rachaduras da vida baixa. */
function shell(ctx: CanvasRenderingContext2D, c: Palette, seed: number, wound: number): void {
  const g = ctx.createLinearGradient(-14, -32, 12, -8); g.addColorStop(0, c.light); g.addColorStop(.4, c.base); g.addColorStop(1, c.dark);
  shellPath(ctx); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
  ctx.save(); shellPath(ctx); ctx.clip();
  // as estrias: a cúpula repetida, cada vez menor, como as linhas de crescimento de um casco
  ctx.lineWidth = 1; for (const [k, t] of ([.84, .67, .5, .33] as const).entries()) {
    ctx.save(); ctx.translate(-1, -8); ctx.scale(t, t * 1.04); ctx.translate(1, 8);
    ctx.strokeStyle = rgba(c.dark, .55 - k * .06); ctx.lineWidth = 1.2 / t; shellPath(ctx); ctx.stroke(); ctx.restore();
  }
  // a costura entre os élitros, saindo do alto, e as nervuras que se ramificam dela
  ctx.strokeStyle = rgba(c.dark, .85); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1, -31); ctx.quadraticCurveTo(1.4, -20, -.6, -7); ctx.stroke();
  for (let r = 0; r < 4; r++) {
    const y = -27 + r * 5.2;
    ctx.strokeStyle = rgba(c.dark, .7); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(-5, y + 1, -9, y - 1, -15, y + 3 + (r % 2)); ctx.stroke();
    ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(-8, y + .2); ctx.quadraticCurveTo(-10, y + 4, -12, y + 7 + (r % 2) * 2); ctx.stroke();
    ctx.strokeStyle = rgba(c.light, .3); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(0, y - .8); ctx.bezierCurveTo(-5, y, -9, y - 2, -15, y + 2); ctx.stroke();
  }
  // as pontuações, uma grade irregular de covinhas, e a borda de baixo mais escura
  for (let k = 0; k < 34; k++) ellipse(ctx, -19 + unit(seed + 5, k * 2 + 1) * 36, -29 + unit(seed + 5, k * 2 + 2) * 20, .55, .4, rgba(c.dark, .55));
  const rim = ctx.createLinearGradient(0, -14, 0, -6); rim.addColorStop(0, rgba(c.dark, 0)); rim.addColorStop(1, rgba(c.dark, .75)); ctx.fillStyle = rim; ctx.fillRect(-24, -15, 46, 10);
  const sheen = ctx.createLinearGradient(-14, -32, 4, -14); sheen.addColorStop(0, rgba("#ffffff", .42)); sheen.addColorStop(.6, rgba("#ffffff", 0)); ctx.fillStyle = sheen; ctx.fillRect(-24, -33, 30, 20);
  ctx.restore();
  furFlow(ctx, { x0: -20, y0: -12, x1: 18, y1: -7 }, { seed: seed + 9, count: 10, length: 2.2, dx: -1, dy: .5, dark: c.dark, light: c.light, alpha: .5, width: .6 });
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (1.08 + i * .17) + (seed % 1) * .2, x = -2 + Math.cos(a) * 17, y = -17 + Math.sin(a) * 11.4;
    ellipse(ctx, x, y, 2.4, 1.6, i % 2 ? c.accent : rgba(c.accent, .75), a); ellipse(ctx, x - .4, y - .5, 1, .6, rgba("#d8f2b0", .45), a);
  }
  if (wound > .4) {
    ctx.strokeStyle = rgba("#0f0a06", .6 + wound * .3); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-8, -29); ctx.lineTo(-11, -23); ctx.lineTo(-7, -19); ctx.lineTo(-12, -13); ctx.stroke();
    ctx.strokeStyle = rgba(c.light, .5); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(-8.8, -29); ctx.lineTo(-11.8, -23); ctx.lineTo(-7.8, -19); ctx.stroke();
  }
}

/** O pronoto: a placa que cobre o pescoço, entre o casco e a cabeça, com uma crista e as bordas serrilhadas. */
function pronotum(ctx: CanvasRenderingContext2D, c: Palette): void {
  const g = ctx.createLinearGradient(14, -28, 24, -10); g.addColorStop(0, c.light); g.addColorStop(.5, c.base); g.addColorStop(1, c.dark);
  ctx.beginPath(); ctx.moveTo(14, -26); ctx.bezierCurveTo(21, -28.4, 26, -22, 25, -14); ctx.lineTo(23.4, -9.6); ctx.bezierCurveTo(18, -8.6, 14, -10.6, 13.6, -16); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.strokeStyle = rgba(c.dark, .55); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(15.4, -24); ctx.quadraticCurveTo(21, -20, 23.6, -12); ctx.stroke();
  ctx.strokeStyle = rgba(c.light, .5); ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(16.4, -24.6); ctx.quadraticCurveTo(21.6, -22, 24, -15); ctx.stroke();
  for (let k = 0; k < 4; k++) ellipse(ctx, 16 + k * 2, -22 + k * 2.6, .6, .45, rgba(c.dark, .6));
}

/** Cabeça pequena e larga: olho de facetas, antenas de clava lamelada que balançam e duas mandíbulas dentadas que abrem no golpe. */
function head(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const snap = clamp01(m.bite);
  for (const [dy, far] of [[2.2, true], [0, false]] as const) {
    const open = snap * 3.4;
    ctx.fillStyle = far ? c.dark : c.extra; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(29.4, -10.4 + dy); ctx.quadraticCurveTo(36 + snap * 2, -9.4 + dy + (far ? open : -open) * .5, 36.4 + snap, -5.4 + dy + (far ? open * 1.2 : -open * 1.2)); ctx.quadraticCurveTo(33, -7.6 + dy, 28.4, -8.4 + dy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e9dcc0"; for (let t = 0; t < 2; t++) { const x = 32.4 + t * 2.4 + snap, y = -7.4 + dy + (far ? open : -open) * (.45 + t * .3); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + .6, y + (far ? -1.6 : 1.6)); ctx.lineTo(x + 1.5, y); ctx.closePath(); ctx.fill(); }
  }
  const g = ctx.createRadialGradient(24, -17, 1, 25, -13, 9); g.addColorStop(0, c.light); g.addColorStop(.55, c.base); g.addColorStop(1, c.dark);
  ctx.beginPath(); ctx.moveTo(21, -16); ctx.bezierCurveTo(22, -21, 30, -21, 31.4, -14.6); ctx.bezierCurveTo(32, -10, 28, -7.6, 24, -8); ctx.bezierCurveTo(21, -9, 20.2, -13, 21, -16); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = rgba(c.dark, .55); ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(23, -18.4); ctx.quadraticCurveTo(26, -15, 28.8, -9.6); ctx.stroke();
  // o olho de facetas: o disco com uma grade de pontos, o brilho e o aro
  ellipse(ctx, 27.6, -15.4, 2.8, 2.5, OUTLINE); ellipse(ctx, 27.6, -15.4, 2.2, 2, c.eye);
  ctx.fillStyle = rgba(c.dark, .45); for (const [dx, dy] of [[-1, -.8], [0, -.8], [1, -.8], [-.5, .4], [.5, .4], [-1, 1.2], [0, 1.2], [1, 1.2]] as const) { ctx.beginPath(); ctx.arc(27.6 + dx, -15.4 + dy, .28, 0, Math.PI * 2); ctx.fill(); }
  ellipse(ctx, 28.3, -16.2, .6, .5, "#fff6dc");
  // as antenas: haste fina e uma clava de três placas na ponta
  for (let a = 0; a < 2; a++) {
    const sway = Math.sin(time * 2.4 + a * 1.2 + m.seed * 6) * 1.6, bx = 28.4 + a * 2.6, tx = 35 + a * 3, ty = -24.4 + sway * 1.4 + a;
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, -19.6); ctx.quadraticCurveTo(bx + 6, -26 + sway, tx, ty); ctx.stroke();
    ctx.strokeStyle = c.light; ctx.lineWidth = .6; ctx.stroke(); ctx.lineCap = "butt";
    for (let p = 0; p < 3; p++) ellipse(ctx, tx + p * 1.2, ty - 1.4 + p * .9, 1.7, .6, p % 2 ? c.accent : c.extra, -.7 + p * .5);
  }
  if (snap > .02) { ctx.strokeStyle = rgba(c.light, .3 + snap * .5); ctx.lineWidth = .8; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(14 - k * 3, -33 - k); ctx.lineTo(9 - k * 3, -33 - k); ctx.stroke(); } }
}

/** O Besouro de Raiz inteiro, sem moldura nem sombra: `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawRootBeetle(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  ctx.save(); ctx.scale(-1, 1); // o corpo é montado olhando para a direita; o Besouro olha para a esquerda
  legs(ctx, c, m.seed, m.phase, m.moving, true);
  shell(ctx, c, m.seed, m.wound);
  pronotum(ctx, c);
  head(ctx, c, time, m);
  legs(ctx, c, m.seed, m.phase, m.moving, false);
  ctx.restore();
}

export function renderRootBeetleCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "root-beetle", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawRootBeetle(surface, colors, t, motion), 21);
}
