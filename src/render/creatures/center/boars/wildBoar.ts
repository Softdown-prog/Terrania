/**
 * Javali Selvagem (Centro), refeito com o kit de anatomia (ADR 0093): corpo robusto de ombros altos e barriga funda, quatro patas curtas de dois ossos com casco
 * partido (em galope alternado) e pelo duro: uma crista de cerdas que desce do cangote pela espinha e mechas grossas deitadas pelo flanco. A cabeça é uma cunha de
 * focinho largo e achatado, com nariz de focinho e ventas, olho pequeno de aro âmbar, orelha em folha, bochecha de cerdas e dois dentes de marfim curvos que sobem
 * da mandíbula. No golpe a cabeça inteira baixa e as ventas sopram vapor; a vida que falta aparece em arranhões. O desenho olha para a esquerda; o corpo é montado
 * olhando para a direita e espelhado. Não decide acerto, dano nem saque.
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

export const CREATURE_PALETTE: Palette = { base: "#6b4a36", light: "#b08a63", dark: "#2a1b12", accent: "#e8dcc0", eye: "#d9a441", extra: "#8a6446" };
const MAX_HP = 110;

/** As medidas do javali (olhando para +x antes do espelho). */
export const WILD_BOAR_BODY: QuadrupedSpec = {
  torso: { front: 22, rear: -24, withers: -37, back: -33.5, croup: -30, bellyFront: -11.5, bellyRear: -13.5, shoulderX: 11, haunchX: -14, muscle: 8.5 },
  frontLeg: { upper: 6.6, lower: 7.2, widthTop: 6.6, widthKnee: 4.4, widthAnkle: 3.2, foot: "cloven" },
  rearLeg: { upper: 6.6, lower: 7.2, widthTop: 7.6, widthKnee: 4.6, widthAnkle: 3.2, foot: "cloven" },
  frontHipX: 12, rearHipX: -15, hipY: -13.4, stride: 6.5, lift: 3.2,
};
const TORSO: TorsoSpec = WILD_BOAR_BODY.torso;
const BACK_LINE = [[19, -37.4], [11, -38], [2, -36], [-8, -34.4], [-19, -32.2]] as const;
const BELLY_LINE = [[16, -11.6], [4, -10.6], [-8, -12.2], [-18, -15]] as const;

/** Cauda curta e fina, que sobe e termina num pincel de cerdas. */
function tail(ctx: CanvasRenderingContext2D, c: Palette, m: CreatureMotion, time: number): void {
  const flick = Math.sin(time * 3 + m.seed * 7) * 1.2 + Math.sin(m.phase * 1.4) * 1.6 * m.moving;
  ctx.lineCap = "round";
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-23, -30); ctx.quadraticCurveTo(-28, -32.4, -28.6 + flick * .3, -38.6 + flick); ctx.stroke();
  ctx.strokeStyle = c.dark; ctx.lineWidth = 1.6; ctx.stroke();
  furAlong(ctx, [[-28.6 + flick * .3, -38.6 + flick], [-29, -41.4 + flick]], 1, { seed: m.seed + 3, count: 5, length: 2.6, sweep: -.3, dark: c.dark, light: c.light, width: .9 });
  ctx.lineCap = "butt";
}

/** Tronco volumoso: pelo grosso deitado pelo flanco, barriga clara, crista de cerdas que cai do cangote e cerdas na barriga. */
function torso(ctx: CanvasRenderingContext2D, c: Palette, seed: number, time: number): void {
  const breath = Math.sin(time * 1.8 + seed * 5) * .45;
  ctx.save(); ctx.translate(0, breath * .3);
  drawTorso(ctx, c, TORSO);
  ctx.save(); torsoPath(ctx, TORSO); ctx.clip();
  furFlow(ctx, { x0: -24, y0: -37, x1: 22, y1: -11 }, { seed, count: 64, length: 5.4, dx: -1, dy: .35, bend: .35, dark: c.dark, light: c.light, alpha: .34, width: .9 });
  const belly = ctx.createLinearGradient(0, -20, 0, -11); belly.addColorStop(0, rgba(c.light, 0)); belly.addColorStop(1, rgba(c.light, .5));
  ctx.fillStyle = belly; ctx.fillRect(-24, -20, 46, 10);
  ctx.restore();
  furAlong(ctx, BACK_LINE, -1, { seed, count: 22, length: 5.8, variation: .4, sweep: -.35, dark: c.dark, light: c.light, alpha: .9, width: 1.5 });
  furAlong(ctx, BACK_LINE, -1, { seed: seed + 5, count: 16, length: 3.4, sweep: -.5, dark: c.extra, light: c.light, alpha: .7, width: 1.1 });
  furAlong(ctx, BELLY_LINE, 1, { seed: seed + 11, count: 11, length: 2.4, sweep: -.3, dark: c.extra, light: c.light, alpha: .7, width: .9 });
  ctx.restore();
}

/** Cabeça de cunha: focinho achatado de nariz largo, dentes de marfim, olho pequeno de aro âmbar, orelha em folha, bochecha de cerdas e vapor nas ventas. */
function head(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const snap = clamp01(m.bite);
  ctx.save(); ctx.translate(0, snap * 3); // no golpe a cabeça inteira baixa
  // orelha do outro lado e a nuca de cerdas
  ctx.fillStyle = shade(c.extra, -.3); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(25, -33); ctx.quadraticCurveTo(24.4, -39, 27.4, -41); ctx.quadraticCurveTo(29.4, -37.6, 29, -33); ctx.closePath(); ctx.fill(); ctx.stroke();
  // crânio e focinho num caminho só
  const g = ctx.createLinearGradient(32, -38, 38, -16); g.addColorStop(0, c.light); g.addColorStop(.4, c.base); g.addColorStop(1, c.dark);
  ctx.beginPath(); ctx.moveTo(22, -34); ctx.quadraticCurveTo(29, -38.4, 36, -31); ctx.quadraticCurveTo(40.4, -26.6, 44.4, -24.4);
  ctx.quadraticCurveTo(46.6, -21.2, 44.6, -18); ctx.quadraticCurveTo(38, -15.4, 30, -16.2); ctx.quadraticCurveTo(21, -18, 20.6, -26); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
  // pelo curto da testa e do focinho
  ctx.save(); ctx.clip();
  furFlow(ctx, { x0: 22, y0: -37, x1: 40, y1: -16 }, { seed: m.seed + 61, count: 22, length: 3.4, dx: -1, dy: .5, dark: c.dark, light: c.light, alpha: .38, width: .7 });
  ctx.restore();
  // o disco do focinho com as ventas e o brilho úmido
  ellipse(ctx, 44.2, -21.2, 3.1, 3.8, shade(c.dark, .1), .15); ellipse(ctx, 44.4, -22.4, 1.5, 1.2, rgba("#ffffff", .22));
  for (const dy of [-1.6, 1.2]) ellipse(ctx, 45.6, -21.4 + dy, .7, .55, "#0c0806");
  // boca, queixo e os dentes de marfim que sobem da mandíbula
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(44, -18.6); ctx.quadraticCurveTo(36, -16.6, 29, -17.8); ctx.stroke();
  for (const [x, rise] of [[39.6, 9 + snap * 2], [35.2, 7.6]] as const) {
    ctx.fillStyle = c.accent; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(x - 1.8, -16.6); ctx.quadraticCurveTo(x + 1, -16.6 - rise * .5, x - .6, -16.6 - rise); ctx.quadraticCurveTo(x - 2.6, -16.6 - rise * .5, x + 1.2, -16.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba("#ffffff", .5); ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x - .4, -17.4); ctx.quadraticCurveTo(x + .6, -16.6 - rise * .5, x - .4, -16.6 - rise * .85); ctx.stroke();
  }
  // olho pequeno com sobrancelha pesada, aro âmbar, pupila e brilho
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(30.4, -29.6); ctx.lineTo(35.6, -28.2 - snap * .6); ctx.stroke(); ctx.lineCap = "butt";
  const blink = Math.sin(time * .9 + m.seed * 9) > .985;
  if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30.8, -27); ctx.lineTo(34.6, -27.4); ctx.stroke(); }
  else { ellipse(ctx, 32.8, -26.8, 2.4, 2.1, OUTLINE); ellipse(ctx, 32.9, -26.8, 1.7, 1.5, c.eye); ellipse(ctx, 33, -26.8, .7, .9, OUTLINE); ellipse(ctx, 32.5, -27.4, .4, .4, "#fff6dc"); }
  // a orelha de perto, a bochecha de cerdas e a barba
  ctx.fillStyle = c.extra; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(24.4, -33.6); ctx.quadraticCurveTo(22.6, -40.4, 26.6, -43.4); ctx.quadraticCurveTo(30.2, -39, 29.6, -33.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = rgba(c.dark, .55); ctx.beginPath(); ctx.moveTo(25.6, -34.4); ctx.quadraticCurveTo(24.6, -39, 26.8, -41); ctx.quadraticCurveTo(28.4, -38.2, 28.2, -34.2); ctx.closePath(); ctx.fill();
  furAlong(ctx, [[24, -30], [23, -24], [25.6, -18.4]], 1, { seed: m.seed + 71, count: 7, length: 3, sweep: -.5, dark: c.dark, light: c.light, width: 1.1 });
  furAlong(ctx, [[22, -35.4], [27, -38.6]], -1, { seed: m.seed + 81, count: 5, length: 3.4, sweep: -.5, dark: c.dark, light: c.light, width: 1.2 });
  if (snap > .02) {
    // o golpe: vapor das ventas e linhas de força na testa
    for (let k = 0; k < 4; k++) ellipse(ctx, 49 + k * 2.6, -22 - Math.sin(time * 6 + k) * 1.4 - k * .8, 1.1 + k * .5, .8 + k * .3, rgba("#f2f6f8", (.7 - k * .14) * snap));
    ctx.strokeStyle = rgba(c.light, .3 + snap * .5); ctx.lineWidth = .8;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(27 + k * 1.4, -34 - k * 1.2); ctx.lineTo(31 + k * 1.4, -33 - k * 1.2); ctx.stroke(); }
  }
  ctx.restore();
}

/** Arranhões pelo flanco, cada vez mais fundos conforme a vida cai. */
function wounds(ctx: CanvasRenderingContext2D, wound: number): void {
  if (wound <= .35) return;
  ctx.strokeStyle = rgba("#7d3030", .4 + wound * .5); ctx.lineWidth = 1.1; ctx.lineCap = "round";
  for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.moveTo(-2 + s * 3, -33); ctx.lineTo(1 + s * 3, -23); ctx.stroke(); }
  if (wound > .6) for (let s = 0; s < 2; s++) { ctx.beginPath(); ctx.moveTo(-12 + s * 3, -31); ctx.lineTo(-9 + s * 3, -22); ctx.stroke(); }
  ctx.lineCap = "butt";
}

/** O Javali Selvagem inteiro, sem moldura nem sombra: `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawWildBoar(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  ctx.save(); ctx.scale(-1, 1); // o corpo é montado olhando para a direita; o Javali olha para a esquerda
  const legs = quadrupedLegs(WILD_BOAR_BODY, m.phase, m.moving);
  tail(ctx, c, m, time);
  for (const leg of legs) if (leg.spec.far) drawLeg(ctx, c, leg.spec, legPose(leg.spec, leg.phase));
  torso(ctx, c, m.seed, time);
  for (const leg of legs) if (!leg.spec.far) drawLeg(ctx, c, leg.spec, legPose(leg.spec, leg.phase));
  head(ctx, c, time, m);
  wounds(ctx, m.wound);
  ctx.restore();
}

export function renderWildBoarCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "wild-boar", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawWildBoar(surface, colors, t, motion), 24);
}
