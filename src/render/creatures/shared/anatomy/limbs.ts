/**
 * Membros articulados das montarias de quatro patas (ADR 0091). Cada perna é uma cadeia de dois ossos resolvida por cinemática inversa: a pata vai para onde a
 * passada manda (balanço para a frente e para trás, levantando no meio do passo) e o joelho, ou o jarrete, dobra para o lado certo, em vez de um traço rígido que
 * só balança. Os ossos são afilados (grossos no alto, finos no tornozelo), com sombreamento, junta com volume e pé próprio de cada espécie. Pernas do lado distante
 * saem mais escuras e são desenhadas antes do corpo.
 */
import type { KitPalette } from "./palette.ts";
import { EDGE, GLINT } from "./palette.ts";
import { ellipse, rgba, shade } from "../../../draw.ts";

export type FootKind = "hoof" | "cloven" | "paw" | "claw";
export interface LegSpec {
  readonly hipX: number; readonly hipY: number;
  /** Comprimento do osso de cima (coxa ou braço) e do de baixo (canela até o casco). A soma é um pouco maior que a altura do quadril: a perna parada fica levemente dobrada. */
  readonly upper: number; readonly lower: number;
  readonly widthTop: number; readonly widthKnee: number; readonly widthAnkle: number;
  /** Membro anterior: o joelho dobra para a frente (+x). Posterior: o jarrete dobra para trás (−x). */
  readonly front: boolean;
  /** Lado distante: mais escuro, desenhado antes do corpo. */
  readonly far: boolean;
  readonly foot: FootKind;
  /** Para onde a pata balança (± em x) e quanto sobe no meio do passo. */
  readonly stride: number; readonly lift: number;
}
export interface LegPose { readonly knee: readonly [number, number]; readonly foot: readonly [number, number] }

/** A pose da perna na fase dada (radianos): balanço pelo seno, altura pelo cosseno positivo; o pé nunca passa do alcance dos dois ossos. */
export function legPose(spec: LegSpec, phase: number): LegPose {
  const swing = Math.sin(phase), up = Math.max(0, Math.cos(phase));
  return solveLeg(spec, spec.hipX + swing * spec.stride, -up * spec.lift);
}

/** A pose da perna com o pé no ponto dado (x, y do corpo): cinemática inversa de dois ossos, com o joelho para o lado de `front` e o pé grampeado ao alcance. */
export function solveLeg(spec: LegSpec, tx: number, ty: number): LegPose {
  const dx = tx - spec.hipX, dy = ty - spec.hipY, want = Math.hypot(dx, dy) || 1;
  const reach = spec.upper + spec.lower - .4, floor = Math.abs(spec.upper - spec.lower) + .4;
  const d = Math.min(reach, Math.max(floor, want)), ux = dx / want, uy = dy / want;
  const a = (spec.upper * spec.upper - spec.lower * spec.lower + d * d) / (2 * d), h = Math.sqrt(Math.max(0, spec.upper * spec.upper - a * a));
  const bend = spec.front ? 1 : -1;
  return {
    knee: [spec.hipX + ux * a + uy * h * bend, spec.hipY + uy * a - ux * h * bend],
    foot: [spec.hipX + ux * d, spec.hipY + uy * d],
  };
}

/** Um osso afilado: polígono entre os dois extremos com degradê de uma borda à outra; só as laterais levam contorno (as pontas se encaixam nas juntas). */
function bone(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w1: number, w2: number, light: string, mid: string, dark: string): void {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  const g = ctx.createLinearGradient(x1 + nx * w1 / 2, y1 + ny * w1 / 2, x1 - nx * w1 / 2, y1 - ny * w1 / 2);
  g.addColorStop(0, light); g.addColorStop(.5, mid); g.addColorStop(1, dark);
  ctx.beginPath();
  ctx.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); ctx.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
  ctx.lineTo(x2 - nx * w2 / 2, y2 - ny * w2 / 2); ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = EDGE; ctx.lineWidth = 1.1; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); ctx.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); ctx.lineTo(x2 - nx * w2 / 2, y2 - ny * w2 / 2); ctx.stroke();
}

/** O pé: casco inteiro, casco fendido ou pata de felino/urso com garras. */
function foot(ctx: CanvasRenderingContext2D, p: KitPalette, kind: FootKind, x: number, y: number, w: number, far: boolean): void {
  const dark = far ? shade(p.dark, -.2) : p.dark;
  if (kind === "paw") {
    ellipse(ctx, x + 1, y - .6, w * .95, 2.9, dark);
    ctx.strokeStyle = EDGE; ctx.lineWidth = .9; ctx.beginPath(); ctx.ellipse(x + 1, y - .6, w * .95, 2.9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba(p.light, .9); ctx.lineWidth = .8;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + 1 + k * w * .5, y - 1); ctx.lineTo(x + 2 + k * w * .55, y + 1.6); ctx.stroke(); }
    return;
  }
  if (kind === "claw") {
    // pata de inseto: um tarso fino terminando em duas garras curvas
    ctx.strokeStyle = EDGE; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + w * .15, y + .4); ctx.stroke();
    ctx.strokeStyle = shade(dark, .3); ctx.lineWidth = 1.2; ctx.stroke();
    for (const d of [-1, 1]) { ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + w * .15, y); ctx.quadraticCurveTo(x + w * .15 + d * w * .5, y + .5, x + w * .15 + d * w * .55, y + 2.6); ctx.stroke();
      ctx.strokeStyle = rgba(p.light, .8); ctx.lineWidth = .7; ctx.stroke(); }
    ctx.lineCap = "butt";
    return;
  }
  const toes = kind === "cloven" ? [-w * .28, w * .28] : [0];
  for (const t of toes) {
    ctx.beginPath(); ctx.moveTo(x + t - w * .42, y - 4.2); ctx.lineTo(x + t + w * .42, y - 4.2); ctx.lineTo(x + t + w * .62, y + .4); ctx.lineTo(x + t - w * .5, y + .4); ctx.closePath();
    const g = ctx.createLinearGradient(x + t - w * .5, y - 4, x + t + w * .6, y + .4);
    g.addColorStop(0, shade(dark, .25)); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = .9; ctx.stroke();
    ctx.strokeStyle = rgba(GLINT, .4); ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(x + t - w * .2, y - 3.4); ctx.lineTo(x + t - w * .26, y - .3); ctx.stroke();
  }
}

/** Uma perna inteira na pose dada: osso de cima, junta, osso de baixo, boleto e pé. */
export function drawLeg(ctx: CanvasRenderingContext2D, p: KitPalette, spec: LegSpec, pose: LegPose): void {
  const k = spec.far ? -.28 : 0;
  const light = shade(p.light, k), mid = shade(p.base, k), dark = shade(p.dark, k);
  const [kx, ky] = pose.knee, [fx, fy] = pose.foot;
  // o ombro ou a coxa: um volume na cor do corpo onde o osso nasce, para a perna sair do tronco e não ser colada nele
  const mass = ctx.createRadialGradient(spec.hipX - spec.widthTop * .25, spec.hipY - spec.widthTop * .3, 1, spec.hipX, spec.hipY, spec.widthTop * 1.05);
  mass.addColorStop(0, light); mass.addColorStop(.7, mid); mass.addColorStop(1, dark);
  ctx.fillStyle = mass; ctx.beginPath(); ctx.ellipse(spec.hipX, spec.hipY + 1, spec.widthTop * .78, spec.widthTop * 1.05, 0, 0, Math.PI * 2); ctx.fill();
  bone(ctx, spec.hipX, spec.hipY, kx, ky, spec.widthTop, spec.widthKnee, light, mid, dark);
  ellipse(ctx, kx, ky, spec.widthKnee * .62, spec.widthKnee * .58, mid);
  ctx.strokeStyle = rgba(GLINT, spec.far ? .15 : .35); ctx.lineWidth = .7; ctx.beginPath(); ctx.ellipse(kx - .4, ky - .5, spec.widthKnee * .4, spec.widthKnee * .34, 0, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
  bone(ctx, kx, ky, fx, fy - 2.2, spec.widthKnee * .86, spec.widthAnkle, light, mid, dark);
  ellipse(ctx, fx, fy - 3, spec.widthAnkle * .72, spec.widthAnkle * .62, mid);
  foot(ctx, p, spec.foot, fx, fy, spec.widthAnkle * 1.25, spec.far);
}
