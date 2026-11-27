/**
 * Ent Ancião da Gruta (Centro, ADR 0094): o chefe da Masmorra das Raízes, uma árvore velha de pé. Duas pernas de raiz grossas (cinemática inversa, de casco partido)
 * o fazem andar a passos pesados na passada real (`motionPhase`); o tronco tem casca em sulcos, nós, musgo e, no peito, um vão com o **Coração de Madeira** aceso, que
 * pulsa; dois braços de galho terminam em dedos de graveto; a cabeça tem sobrancelha pesada, olhos de brasa verde, nariz de nó, uma barba de musgo e uma coroa de
 * galhos com folhas que balançam. No golpe (`casting`) ele ergue o braço de perto e pisa: o chão racha e raízes brotam à frente. A vida que falta racha o tronco
 * e o coração brilha pelas frestas. O corpo é montado olhando para a direita e espelhado (as criaturas do Centro olham para a esquerda). Não decide acerto, dano nem saque.
 */
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import { OUTLINE } from "../../shared/southGeometry.ts";
import { creatureMotion, type CreatureMotion } from "../../shared/creatureMotion.ts";
import { drawLeg, solveLeg, type LegSpec } from "../../shared/anatomy/limbs.ts";
import { furAlong, furFlow, unit } from "../../shared/anatomy/fur.ts";
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#5d4630", light: "#a07f52", dark: "#241810", accent: "#6fb04a", eye: "#d8f06a", extra: "#7d5f3c" };
const MAX_HP = 650;

/** As duas pernas: onde nascem e a passada (a de perto e a de longe, em oposição). */
const LEG_BASE = { upper: 11, lower: 12.5, widthTop: 8.4, widthKnee: 6.4, widthAnkle: 5.6 } as const;
const HIP_Y = -22;
/** A perna `far` na fase dada; no golpe a de perto sobe 5 para o pisão. */
export function entLeg(far: boolean, phase: number, moving: number, bite: number): { readonly spec: LegSpec; readonly knee: readonly [number, number]; readonly foot: readonly [number, number] } {
  const spec: LegSpec = { hipX: far ? -6 : 3, hipY: HIP_Y, ...LEG_BASE, front: true, far, foot: "cloven", stride: 6, lift: 6 };
  const step = Math.sin(phase + (far ? Math.PI : 0)) * moving, stomp = far ? 0 : clamp01(bite) * 5;
  const pose = solveLeg(spec, spec.hipX + 2 + step * 6, -Math.max(0, step) * 5 - stomp);
  return { spec, knee: pose.knee, foot: pose.foot };
}
/** O braço `far`: pendurado e balançando na caminhada; no golpe o de perto sobe acima da cabeça. */
export function entArm(far: boolean, phase: number, moving: number, bite: number): { readonly spec: LegSpec; readonly knee: readonly [number, number]; readonly foot: readonly [number, number] } {
  const spec: LegSpec = { hipX: far ? -15 : 15, hipY: -48, upper: 13, lower: 14, widthTop: 7.4, widthKnee: 5.2, widthAnkle: 4, front: false, far, foot: "claw", stride: 5, lift: 0 };
  const swing = Math.sin(phase + (far ? 0 : Math.PI)) * moving * 4, raise = far ? 0 : clamp01(bite) * 30;
  const pose = solveLeg(spec, spec.hipX + (far ? -4 : 5) + swing + (far ? 0 : clamp01(bite) * 6), -25 - raise);
  return { spec, knee: pose.knee, foot: pose.foot };
}

/** Uma perna ou um braço, com gravetos e nós nas juntas. */
function limb(ctx: CanvasRenderingContext2D, c: Palette, seed: number, part: { spec: LegSpec; knee: readonly [number, number]; foot: readonly [number, number] }, salt: number): void {
  drawLeg(ctx, c, part.spec, { knee: part.knee, foot: part.foot });
  furAlong(ctx, [[part.spec.hipX, part.spec.hipY], part.knee, part.foot], -1, { seed: seed + salt, count: 7, length: 2.4, sweep: .15, dark: c.dark, light: c.light, alpha: part.spec.far ? .5 : .8, width: .8 });
  ellipse(ctx, part.knee[0], part.knee[1], part.spec.widthKnee * .55, part.spec.widthKnee * .5, part.spec.far ? c.dark : c.extra);
}

/** O tronco: casca em sulcos fundos, nós, musgo em faixa e o vão do peito com o Coração de Madeira que pulsa. */
function trunk(ctx: CanvasRenderingContext2D, c: Palette, seed: number, time: number, wound: number): void {
  const g = ctx.createLinearGradient(-18, -62, 18, -22); g.addColorStop(0, c.light); g.addColorStop(.45, c.base); g.addColorStop(1, c.dark);
  ctx.beginPath(); ctx.moveTo(-14, -22); ctx.bezierCurveTo(-20, -32, -17, -44, -15, -52); ctx.bezierCurveTo(-13, -60, 12, -62, 15, -53); ctx.bezierCurveTo(18, -44, 19, -32, 14, -22); ctx.quadraticCurveTo(0, -17, -14, -22); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.lineJoin = "round"; ctx.stroke();
  ctx.save(); ctx.clip();
  furFlow(ctx, { x0: -20, y0: -62, x1: 20, y1: -20 }, { seed, count: 90, length: 11, dx: .1, dy: 1, bend: .5, dark: c.dark, light: c.light, alpha: .45, width: 1.1 });
  ctx.strokeStyle = rgba(c.dark, .8); ctx.lineWidth = 1.5;
  for (const [x, top, bottom, lean] of [[-12, -56, -24, -3], [-6, -60, -22, 2.4], [0, -61, -21, -2], [7, -60, -22, 3], [13, -55, -24, -2.4]] as const) {
    ctx.beginPath(); ctx.moveTo(x, top); ctx.bezierCurveTo(x + lean, top + 12, x - lean, bottom - 12, x + lean * .4, bottom); ctx.stroke();
    ctx.strokeStyle = rgba(c.light, .35); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x + 1, top + 1); ctx.bezierCurveTo(x + lean + 1, top + 12, x - lean + 1, bottom - 12, x + lean * .4 + 1, bottom); ctx.stroke(); ctx.strokeStyle = rgba(c.dark, .8); ctx.lineWidth = 1.5;
  }
  for (const [x, y, r] of [[-11, -34, 4], [10, -44, 3.4], [-5, -26, 3], [12, -28, 2.6]] as const) { ellipse(ctx, x, y, r, r * .8, rgba(c.dark, .65)); ellipse(ctx, x - .6, y - .8, r * .55, r * .4, rgba(c.light, .5)); }
  // a faixa de musgo no ombro e as manchas nas costas
  ctx.fillStyle = rgba(c.accent, .75); ctx.beginPath(); ctx.moveTo(-17, -52); ctx.quadraticCurveTo(-4, -46, 17, -53); ctx.lineTo(17, -59); ctx.lineTo(-17, -59); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 10; k++) ellipse(ctx, -14 + unit(seed + 3, k * 2 + 1) * 28, -56 + unit(seed + 3, k * 2 + 2) * 8, 1.6 + unit(seed, k) * 1.6, 1, rgba("#a8d078", .8));
  const sheen = ctx.createLinearGradient(-18, -62, 0, -34); sheen.addColorStop(0, rgba("#ffffff", .2)); sheen.addColorStop(1, rgba("#ffffff", 0)); ctx.fillStyle = sheen; ctx.fillRect(-20, -62, 22, 30);
  ctx.restore();
  // o vão do peito e o Coração de Madeira, que pulsa
  const pulse = .75 + Math.sin(time * 2.4 + seed * 4) * .25;
  ctx.fillStyle = "#0e0804"; ctx.beginPath(); ctx.ellipse(1, -38, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  const heart = ctx.createRadialGradient(1, -38, 1, 1, -38, 11); heart.addColorStop(0, rgba("#fff3b0", .95 * pulse)); heart.addColorStop(.35, rgba("#e8b83a", .8 * pulse)); heart.addColorStop(1, rgba(c.eye, 0));
  ellipse(ctx, 1, -38, 11, 11, heart); ellipse(ctx, 1, -38, 3.2 + pulse * .6, 3.8 + pulse * .6, rgba("#ffd96a", .95)); ellipse(ctx, .2, -39, 1.2, 1.4, "#fffbe0");
  ctx.strokeStyle = rgba("#e8b83a", .6 * pulse); ctx.lineWidth = .8;
  for (const [dx, dy] of [[-5, -4], [5.4, -3], [-3, 6], [4, 6.4]] as const) { ctx.beginPath(); ctx.moveTo(1, -38); ctx.lineTo(1 + dx, -38 + dy); ctx.stroke(); }
  if (wound > .3) {
    ctx.strokeStyle = rgba("#120a05", .6 + wound * .3); ctx.lineWidth = 1.4;
    for (const [x0, y0, x1, y1, x2, y2] of [[-8, -58, -11, -48, -6, -42], [9, -56, 12, -46, 8, -38]] as const) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = rgba("#e8b83a", .35 + wound * .5); ctx.lineWidth = .7; ctx.stroke(); ctx.strokeStyle = rgba("#120a05", .6 + wound * .3); ctx.lineWidth = 1.4; }
  }
}

/** A cabeça: sobrancelha pesada, olhos de brasa, nariz de nó, boca em fenda, barba de musgo e a coroa de galhos com folhas. */
function head(ctx: CanvasRenderingContext2D, c: Palette, seed: number, time: number, bite: number): void {
  const snap = clamp01(bite), pulse = .8 + Math.sin(time * 3 + seed * 5) * .2;
  // a coroa de galhos: sete galhos em leque, cada um com folhas que balançam
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * .42, len = 13 + (k % 3) * 3.4, sway = Math.sin(time * 1.5 + k * 1.3 + seed * 3) * 1.2;
    const bx = 2 + (k - 3) * 2.6, by = -62, tx = bx + Math.cos(a) * len + sway, ty = by + Math.sin(a) * len;
    for (const [w, color] of [[3.4, OUTLINE], [2.2, c.base]] as const) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + tx) / 2 - 1, (by + ty) / 2 - 2, tx, ty); ctx.stroke(); }
    ctx.lineCap = "butt";
    for (let l = 0; l < 3; l++) { const t = .45 + l * .27, lx = bx + (tx - bx) * t + (l % 2 ? 2.4 : -2.4), ly = by + (ty - by) * t - 1; ellipse(ctx, lx, ly, 3.4, 1.9, l % 2 ? c.accent : "#88b45c", a + (l % 2 ? .7 : -.7)); ellipse(ctx, lx - .5, ly - .3, 1.8, .5, rgba("#d8f2b0", .55), a + (l % 2 ? .7 : -.7)); }
  }
  // o rosto: placa de casca clara, sobrancelha, olhos acesos, nariz de nó e a boca em fenda
  const g = ctx.createRadialGradient(5, -60, 1, 4, -56, 11); g.addColorStop(0, c.light); g.addColorStop(.6, c.base); g.addColorStop(1, c.dark);
  ctx.beginPath(); ctx.moveTo(-6, -56); ctx.bezierCurveTo(-8, -66, 14, -68, 15, -57); ctx.bezierCurveTo(16, -50, 8, -47, 2, -48); ctx.bezierCurveTo(-4, -48, -7, -51, -6, -56); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = rgba(c.dark, .7); ctx.lineWidth = 1; for (const [x, y] of [[-3, -63], [9, -64], [12, -58]] as const) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 1, y + 4, x + 1, y + 8); ctx.stroke(); }
  ctx.strokeStyle = "#0e0804"; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-3, -59.4); ctx.lineTo(4, -58.4 - snap * .8); ctx.moveTo(6.6, -58.4 - snap * .8); ctx.lineTo(13.4, -59.6); ctx.stroke(); ctx.lineCap = "butt";
  for (const x of [1, 10]) {
    ellipse(ctx, x, -56.6, 3, 3.2, "#0e0804"); ellipse(ctx, x, -56.6, 2, 2.2, rgba(c.eye, pulse)); ellipse(ctx, x + .3, -56.4, .8, 1.5, "#0e0804"); ellipse(ctx, x - .5, -57.4, .5, .5, "#f4ffd0");
    const glow = ctx.createRadialGradient(x, -56.6, 1, x, -56.6, 7); glow.addColorStop(0, rgba(c.eye, .35 * pulse)); glow.addColorStop(1, rgba(c.eye, 0)); ellipse(ctx, x, -56.6, 7, 7, glow);
  }
  ellipse(ctx, 5.6, -52, 2.4, 2.6, rgba(c.dark, .6)); ellipse(ctx, 5.2, -52.6, 1.1, 1.2, rgba(c.light, .6));
  ctx.fillStyle = "#0e0804"; ctx.beginPath(); ctx.moveTo(-1, -49.6); ctx.quadraticCurveTo(5.6, -48 + snap * 4, 12, -49.8); ctx.quadraticCurveTo(5.6, -49.4 - snap * .6, -1, -49.6); ctx.closePath(); ctx.fill();
  if (snap > .1) { ctx.strokeStyle = rgba(c.eye, .5 + snap * .4); ctx.lineWidth = .8; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(15 + k * 1.6, -60 + k * 3); ctx.lineTo(19 + k * 1.6, -61 + k * 3); ctx.stroke(); } }
  furAlong(ctx, [[-4, -50], [2, -47.4], [9, -47.6], [14, -50.4]], 1, { seed: seed + 7, count: 14, length: 7, variation: .5, sweep: -.1, dark: c.accent, light: "#a8d078", alpha: .9, width: 1.2 });
}

/** As raízes que brotam à frente e as rachaduras do chão no pisão; só aparecem quando o golpe se prepara. */
function quake(ctx: CanvasRenderingContext2D, c: Palette, snap: number, seed: number): void {
  if (snap <= .02) return;
  ellipse(ctx, 18, -1, 8 + snap * 20, 2 + snap * 3, rgba("#2a1d12", .45 * snap));
  ctx.strokeStyle = rgba("#120a05", .7 * snap); ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(12 + k * 3, -.4); ctx.lineTo(18 + k * 6 + snap * 6, .6 + k * .5); ctx.stroke(); }
  for (let k = 0; k < 4; k++) {
    const x = 20 + k * 8 * snap + k * 2, h = (6 + unit(seed, k) * 8) * snap;
    ctx.fillStyle = k % 2 ? c.base : c.extra; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 2.6, 0); ctx.quadraticCurveTo(x - 1, -h * .6, x + 1.2, -h); ctx.quadraticCurveTo(x + 1.6, -h * .5, x + 3, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

/** O Ent Ancião inteiro, sem moldura nem sombra: `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawElderCaveEnt(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  ctx.save(); ctx.scale(-.88, .88); // o corpo é montado olhando para a direita e um pouco menor (88 %, para a coroa caber na caixa); o Ent olha para a esquerda
  const breath = Math.sin(time * 1.2 + m.seed * 5) * .5, snap = clamp01(m.bite);
  limb(ctx, c, m.seed, entLeg(true, m.phase, m.moving, m.bite), 3);
  limb(ctx, c, m.seed, entArm(true, m.phase, m.moving, m.bite), 9);
  ctx.save(); ctx.translate(0, breath * .4 + Math.abs(Math.sin(m.phase)) * m.moving * -1.2); trunk(ctx, c, m.seed, time, m.wound); head(ctx, c, m.seed, time, m.bite); ctx.restore();
  limb(ctx, c, m.seed, entLeg(false, m.phase, m.moving, m.bite), 5);
  limb(ctx, c, m.seed, entArm(false, m.phase, m.moving, m.bite), 13);
  quake(ctx, c, snap, m.seed);
  ctx.restore();
}

export function renderElderCaveEntCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "elder-cave-ent", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawElderCaveEnt(surface, colors, t, motion), 76);
}
