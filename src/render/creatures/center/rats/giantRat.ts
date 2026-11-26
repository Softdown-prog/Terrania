/**
 * Rato Gigante (Centro), refeito com o kit de anatomia (ADR 0093): corpo arqueado de lombo alto e barriga recolhida, patas de dois ossos (as de trás, de coxa grossa,
 * empurram; as da frente arranham, com garras), pelo cinzento e emaranhado em mechas, barriga clara e uma cauda longa, nua e rosada, de anéis de pele. A cabeça tem focinho
 * comprido de nariz rosado, olho miúdo e vermelho com brilho, orelhas redondas de pelo fino por dentro, bigodes que balançam e dois dentões de roedor que aparecem mais
 * quando morde. A vida que falta aparece em arranhões. O desenho olha para a esquerda; o corpo é montado olhando para a direita e espelhado. Não decide acerto, dano
 * nem saque.
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
import { clamp01, ellipse, rgba } from "../../../draw.ts";

export const CREATURE_PALETTE: Palette = { base: "#7e7268", light: "#cbbfae", dark: "#3d362f", accent: "#d99c9a", eye: "#d4503e", extra: "#a29381" };
const MAX_HP = 28;

/** As medidas do rato (olhando para +x antes do espelho). */
export const GIANT_RAT_BODY: QuadrupedSpec = {
  torso: { front: 15, rear: -17, withers: -21, back: -24, croup: -19.5, bellyFront: -8.4, bellyRear: -9.6, shoulderX: 6, haunchX: -9, muscle: 5.2 },
  frontLeg: { upper: 4.8, lower: 5.2, widthTop: 3.8, widthKnee: 2.6, widthAnkle: 2, foot: "paw" },
  rearLeg: { upper: 5.2, lower: 5.2, widthTop: 5.6, widthKnee: 3, widthAnkle: 2.1, foot: "paw" },
  frontHipX: 8, rearHipX: -11, hipY: -9.8, stride: 5, lift: 2.4,
};
const TORSO: TorsoSpec = GIANT_RAT_BODY.torso;
const BACK_LINE = [[11, -22.4], [4, -24.2], [-4, -24.4], [-12, -22.6], [-17, -19.4]] as const;
const BELLY_LINE = [[11, -8.6], [2, -8.2], [-8, -9], [-15, -11]] as const;

/** Cauda longa e nua, em gomos que acompanham o balanço da passada, com anéis de pele e uma ponta mais clara. */
function tail(ctx: CanvasRenderingContext2D, c: Palette, m: CreatureMotion, time: number): void {
  const sway = Math.sin(m.phase * 1.3) * 3 * m.moving + Math.sin(time * 1.4) * 1.1;
  const pts: ReadonlyArray<readonly [number, number]> = [[-16, -15], [-24, -11.5 + sway * .3], [-32, -15.5 + sway * .7], [-39, -11.5 + sway]];
  ctx.lineCap = "round";
  for (let i = 0; i < pts.length - 1; i++) {
    const [x, y] = pts[i]!, [nx, ny] = pts[i + 1]!;
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5.2 - i * 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + nx) / 2 - 1, (y + ny) / 2 + 3, nx, ny); ctx.stroke();
    ctx.strokeStyle = c.accent; ctx.lineWidth = 3.2 - i * .75; ctx.stroke();
    ctx.strokeStyle = rgba("#fff0ee", .45); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(x, y - .8); ctx.quadraticCurveTo((x + nx) / 2 - 1, (y + ny) / 2 + 2.2, nx, ny - .8); ctx.stroke();
    ctx.strokeStyle = rgba(c.dark, .55); ctx.lineWidth = .7;
    for (let ring = 0; ring < 4; ring++) {
      const t = (ring + .5) / 4, rx = x + (nx - x) * t, ry = y + (ny - y) * t + 1.2;
      ctx.beginPath(); ctx.moveTo(rx, ry - 1.5); ctx.lineTo(rx - .6, ry + 1.6); ctx.stroke();
    }
  }
  ellipse(ctx, -39.4, -11.5 + sway, 1.6, 1.1, rgba(c.light, .8));
  ctx.lineCap = "butt";
}

/** Corpo arqueado: pelo emaranhado deitado pelo flanco, barriga clara e mechas duras no lombo, na barriga e na garupa. */
function torso(ctx: CanvasRenderingContext2D, c: Palette, seed: number, breath: number): void {
  ctx.save(); ctx.translate(0, breath * .35);
  drawTorso(ctx, c, TORSO);
  ctx.save(); torsoPath(ctx, TORSO); ctx.clip();
  furFlow(ctx, { x0: -17, y0: -24, x1: 15, y1: -8 }, { seed, count: 38, length: 4, dx: -1, dy: .5, bend: .45, dark: c.dark, light: c.light, alpha: .36, width: .7 });
  const belly = ctx.createLinearGradient(0, -14, 0, -8); belly.addColorStop(0, rgba(c.light, 0)); belly.addColorStop(1, rgba(c.light, .6));
  ctx.fillStyle = belly; ctx.fillRect(-17, -14, 32, 7);
  ctx.restore();
  furAlong(ctx, BACK_LINE, -1, { seed, count: 20, length: 3, variation: .5, sweep: -.5, dark: c.extra, light: c.light, alpha: .8, width: 1 });
  furAlong(ctx, BACK_LINE, -1, { seed: seed + 4, count: 10, length: 4.2, sweep: -.35, dark: c.dark, light: c.extra, alpha: .65, width: .9 });
  furAlong(ctx, BELLY_LINE, 1, { seed: seed + 9, count: 9, length: 2, sweep: -.3, dark: c.extra, light: c.light, alpha: .65, width: .8 });
  ctx.restore();
}

/** Cabeça de focinho comprido: crânio, focinho com nariz rosado, olho vermelho, orelhas redondas, bigodes que balançam e os dentões (descem mais quando morde). */
function head(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  const snap = clamp01(m.bite);
  // a orelha do outro lado e as duas de perto: redondas, de pele rosada e pelo fino por dentro
  for (const [x, y, r, dark] of [[17.4, -25.6, 4, true], [20.6, -25.4, 4.6, false]] as const) {
    const g = ctx.createRadialGradient(x - r * .3, y - r * .3, 1, x, y, r * 1.2); g.addColorStop(0, c.accent); g.addColorStop(1, dark ? c.dark : c.extra);
    ctx.fillStyle = g; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (!dark) { ellipse(ctx, x + .3, y + .8, r * .55, r * .75, rgba(c.dark, .5)); ctx.strokeStyle = rgba(c.light, .7); ctx.lineWidth = .5; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 1.1, y + 2.2); ctx.lineTo(x + k * 1.4, y - 1); ctx.stroke(); } }
  }
  const g = ctx.createLinearGradient(22, -26, 26, -10); g.addColorStop(0, c.light); g.addColorStop(.5, c.base); g.addColorStop(1, c.dark);
  ctx.beginPath(); ctx.moveTo(14, -22); ctx.quadraticCurveTo(20, -26, 25, -21); ctx.quadraticCurveTo(28, -17.6, 31, -16); ctx.quadraticCurveTo(32, -14.4, 30.6, -13.4);
  ctx.quadraticCurveTo(24, -11.4, 18, -12.6); ctx.quadraticCurveTo(12.6, -14.4, 13, -19); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.save(); ctx.clip(); furFlow(ctx, { x0: 13, y0: -25, x1: 30, y1: -12 }, { seed: m.seed + 33, count: 14, length: 3, dx: -1, dy: .4, dark: c.dark, light: c.light, alpha: .38, width: .6 }); ctx.restore();
  // nariz, boca e dentões: a boca abre e os dentes descem no golpe
  ellipse(ctx, 31.2, -15.6, 2.1, 1.7, c.accent); ellipse(ctx, 31.8, -16.2, .6, .5, rgba("#fff6e4", .9));
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(30, -13.2); ctx.quadraticCurveTo(24, -11.4 + snap * 3, 19, -13.8 + snap * 2); ctx.stroke();
  for (const dx of [0, 2.6]) {
    const x = 27.4 - dx;
    ctx.fillStyle = "#eadfbf"; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .6;
    ctx.beginPath(); ctx.moveTo(x - 2, -13.3); ctx.lineTo(x - .4, -8.8 + snap * 3); ctx.lineTo(x, -13.3); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // o olho miúdo e vermelho
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(17.4, -22.8); ctx.lineTo(21.6, -21.8 - snap * .4); ctx.stroke();
  const blink = Math.sin(time * .9 + m.seed * 9) > .985;
  if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(17.8, -20); ctx.lineTo(21, -20.4); ctx.stroke(); }
  else { ellipse(ctx, 19.6, -19.8, 1.9, 1.7, OUTLINE); ellipse(ctx, 19.6, -19.8, 1.4, 1.2, c.eye); ellipse(ctx, 19.2, -20.4, .4, .4, "#fff6dc"); }
  for (const side of [-1, 1]) for (let w = 0; w < 3; w++) {
    const sway = Math.sin(time * 2.6 + w * .9) * .6;
    ctx.strokeStyle = rgba(w % 2 ? c.light : "#efe6d2", .85); ctx.lineWidth = .5;
    ctx.beginPath(); ctx.moveTo(29.8, -16 + w * .8);
    ctx.bezierCurveTo(34, -17 + side * 2.2, 38, -17 + side * (3.5 + w) + sway, 42 + w, -17 + side * (4.4 + w * 1.4) + sway); ctx.stroke();
  }
  if (snap > .02) {
    // o golpe: três riscos de movimento atrás da cabeça e um fio de baba nos dentões
    ctx.strokeStyle = rgba(c.light, .35 + snap * .5); ctx.lineWidth = .8;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(8 - k * 2.4, -30 + k * 4); ctx.quadraticCurveTo(3 - k * 2, -31 + k * 4, -1 - k * 2, -30 + k * 4); ctx.stroke(); }
    ctx.strokeStyle = rgba("#e8f3ff", .5 + snap * .4); ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(26, -9); ctx.lineTo(26.2, -6.2 - snap * 1.5); ctx.stroke();
  }
}

/** Arranhões pelo lombo, cada vez mais fundos conforme a vida cai. */
function wounds(ctx: CanvasRenderingContext2D, wound: number): void {
  if (wound <= .35) return;
  ctx.strokeStyle = rgba("#8c3b3d", .35 + wound * .55); ctx.lineWidth = 1; ctx.lineCap = "round";
  for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.moveTo(-3 + s * 3, -24); ctx.lineTo(0 + s * 3, -17); ctx.stroke(); }
  ctx.lineCap = "butt";
}

/** O Rato Gigante inteiro, sem moldura nem sombra (quem chama põe a pose): `m` traz passada, golpe e ferimento (testável parte por parte). */
export function drawGiantRat(ctx: CanvasRenderingContext2D, c: Palette, time: number, m: CreatureMotion): void {
  ctx.save(); ctx.scale(-1, 1); // o corpo é montado olhando para a direita; o Rato olha para a esquerda
  const breath = Math.sin(time * 2 + m.seed * 5) * .6, legs = quadrupedLegs(GIANT_RAT_BODY, m.phase, m.moving);
  tail(ctx, c, m, time);
  for (const leg of legs) if (leg.spec.far) drawLeg(ctx, c, leg.spec, legPose(leg.spec, leg.phase));
  torso(ctx, c, m.seed, breath);
  for (const leg of legs) if (!leg.spec.far) drawLeg(ctx, c, leg.spec, legPose(leg.spec, leg.phase));
  head(ctx, c, time, m);
  wounds(ctx, m.wound);
  ctx.restore();
}

export function renderGiantRatCreature(ctx: CanvasRenderingContext2D, actor: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const motion = creatureMotion(actor, "giant-rat", MAX_HP);
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE, (surface, colors, t) => drawGiantRat(surface, colors, t, motion), 17);
}
