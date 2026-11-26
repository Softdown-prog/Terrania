/**
 * O tronco das montarias de quatro patas (ADR 0091): uma silhueta de verdade (cernelha, lombo, garupa, barriga que sobe para a virilha, peito) em vez de uma elipse,
 * com gradiente de cima para baixo, sombra sob a barriga, músculo do ombro e da anca e as costelas. As medidas de cada espécie ficam num `TorsoSpec`.
 */
import type { KitPalette } from "./palette.ts";
import { EDGE, GLINT } from "./palette.ts";
import { ellipse, rgba, shade } from "../../../draw.ts";

export interface TorsoSpec {
  /** x do peito e da garupa (o animal olha para +x). */
  readonly front: number; readonly rear: number;
  /** y da cernelha, do lombo e da garupa (negativos: para cima). */
  readonly withers: number; readonly back: number; readonly croup: number;
  /** y da barriga no peito e na virilha. */
  readonly bellyFront: number; readonly bellyRear: number;
  /** Onde ficam o músculo do ombro e o da anca (x) e o quanto são grandes. */
  readonly shoulderX: number; readonly haunchX: number; readonly muscle: number;
  /** Pelo comprido no dorso e na barriga (urso, leão): cria franjas na silhueta. */
  readonly shaggy?: boolean;
}

/** A silhueta do tronco como caminho (para preencher, contornar e recortar o pelo). */
export function torsoPath(ctx: CanvasRenderingContext2D, s: TorsoSpec): void {
  ctx.beginPath();
  ctx.moveTo(s.front - 4, s.withers);
  ctx.bezierCurveTo(s.front - 12, s.withers - 1.5, s.rear + 14, s.back - 1, s.rear + 5, s.croup);
  ctx.bezierCurveTo(s.rear - 2, s.croup + 3, s.rear - 4, s.bellyRear - 8, s.rear + 2, s.bellyRear);
  ctx.bezierCurveTo(s.rear + 10, s.bellyRear + 3, s.front - 16, s.bellyFront + 4, s.front - 7, s.bellyFront);
  ctx.bezierCurveTo(s.front + 2, s.bellyFront - 3, s.front + 3, s.withers + 12, s.front - 4, s.withers);
  ctx.closePath();
}

/** Desenha o tronco inteiro: corpo com volume, músculos e costelas. */
export function drawTorso(ctx: CanvasRenderingContext2D, p: KitPalette, s: TorsoSpec): void {
  const top = Math.min(s.withers, s.back, s.croup), bottom = Math.max(s.bellyFront, s.bellyRear);
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, p.light); g.addColorStop(.38, p.base); g.addColorStop(1, shade(p.dark, .08));
  torsoPath(ctx, s); ctx.fillStyle = g; ctx.fill();
  ctx.save(); torsoPath(ctx, s); ctx.clip();
  // sombra sob a barriga e brilho no dorso, para o corpo parecer um cilindro
  const belly = ctx.createLinearGradient(0, bottom - 14, 0, bottom + 2); belly.addColorStop(0, rgba(p.dark, 0)); belly.addColorStop(1, rgba(p.dark, .55));
  ctx.fillStyle = belly; ctx.fillRect(s.rear - 6, bottom - 14, s.front - s.rear + 14, 18);
  const back = ctx.createLinearGradient(0, top - 1, 0, top + 9); back.addColorStop(0, rgba(GLINT, .38)); back.addColorStop(1, rgba(GLINT, 0));
  ctx.fillStyle = back; ctx.fillRect(s.rear - 6, top - 1, s.front - s.rear + 14, 10);
  // músculo do ombro e da anca: elipses mais claras com sombra no contorno
  for (const [x, y, rx, ry, a] of [[s.shoulderX, (s.withers + s.bellyFront) / 2 + 1, s.muscle * .8, s.muscle * 1.15, .25], [s.haunchX, (s.croup + s.bellyRear) / 2 - 1, s.muscle * 1.05, s.muscle * 1.2, -.15]] as const) {
    const m = ctx.createRadialGradient(x - rx * .3, y - ry * .35, 1, x, y, Math.max(rx, ry));
    m.addColorStop(0, rgba(p.light, .75)); m.addColorStop(.7, rgba(p.base, .25)); m.addColorStop(1, rgba(p.dark, .35));
    ctx.fillStyle = m; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(p.dark, .55); ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, Math.PI * .15, Math.PI * .9); ctx.stroke();
  }
  // costelas: três curvas entre o ombro e a anca
  ctx.strokeStyle = rgba(p.dark, .35); ctx.lineWidth = .8;
  for (let i = 0; i < 3; i++) { const x = (s.shoulderX + s.haunchX) / 2 - 3 + i * 4.5; ctx.beginPath(); ctx.moveTo(x, bottom - 15); ctx.quadraticCurveTo(x + 2.5, bottom - 9, x + .5, bottom - 3); ctx.stroke(); }
  ctx.restore();
  torsoPath(ctx, s); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
  ctx.strokeStyle = rgba(GLINT, .5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.front - 9, s.withers + .5); ctx.bezierCurveTo(s.front - 15, s.withers - .5, s.rear + 16, s.back - .5, s.rear + 7, s.croup + .8); ctx.stroke();
  if (s.shaggy) for (let i = 0; i < 14; i++) {
    const x = s.rear + 6 + i * ((s.front - s.rear - 14) / 13), y = s.back - 1 + Math.sin(i * 1.9) * 1.2;
    ctx.strokeStyle = rgba(i % 3 ? p.dark : p.light, .75); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2.4, y - 3.4 - (i % 3)); ctx.stroke();
  }
  ellipse(ctx, (s.shoulderX + s.haunchX) / 2, top + 2, 1.4, .6, rgba(GLINT, .5));
}
