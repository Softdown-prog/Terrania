/** A sela das montarias de quatro patas (ADR 0091): manta, assento de couro com costura, fivela e a cilha que desce até a barriga, medidos pelo tronco da espécie. */
import type { Palette } from "./geometry.ts";
import { EDGE, GLINT } from "./geometry.ts";
import type { TorsoSpec } from "./torso.ts";
import { ellipse, rgba, shade } from "../../draw.ts";

/** A altura a que o cavaleiro é desenhado acima dos pés da montaria: o lombo menos a altura do quadril dele (a sela fica sob o herói). */
export const riderLiftFor = (torso: TorsoSpec): number => Math.round(-torso.back - 15);

export function drawSaddle(ctx: CanvasRenderingContext2D, p: Palette, t: TorsoSpec): void {
  const x0 = (t.shoulderX + t.haunchX) / 2 - 1, top = t.back - .5, drop = Math.min(15, (t.bellyFront - t.back) - 5);
  // manta
  const cloth = ctx.createLinearGradient(x0 - 13, top, x0 + 12, top + drop);
  cloth.addColorStop(0, shade(p.accent, -.1)); cloth.addColorStop(1, shade(p.accent, -.5));
  ctx.fillStyle = cloth; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x0 - 13, top + 1); ctx.quadraticCurveTo(x0, top - 3, x0 + 12, top + 1); ctx.lineTo(x0 + 11, top + drop); ctx.quadraticCurveTo(x0, top + drop + 2, x0 - 12, top + drop); ctx.closePath(); ctx.fill(); ctx.stroke();
  // assento de couro com cantoneira e costura
  const leather = ctx.createLinearGradient(x0 - 10, top - 4, x0 + 10, top + 6);
  leather.addColorStop(0, shade(p.tack, .4)); leather.addColorStop(1, shade(p.tack, -.35));
  ctx.fillStyle = leather;
  ctx.beginPath(); ctx.moveTo(x0 - 11, top + 2); ctx.quadraticCurveTo(x0 - 9, top - 6, x0 - 4, top - 3); ctx.quadraticCurveTo(x0 + 1, top - 1, x0 + 6, top - 4); ctx.quadraticCurveTo(x0 + 11, top - 5, x0 + 11, top + 3); ctx.quadraticCurveTo(x0, top + 6, x0 - 11, top + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba(GLINT, .55); ctx.lineWidth = .7; ctx.setLineDash([1.6, 1.4]); ctx.beginPath(); ctx.moveTo(x0 - 9, top + 1); ctx.quadraticCurveTo(x0, top + 3.6, x0 + 9, top + 1.2); ctx.stroke(); ctx.setLineDash([]);
  // cilha e fivela
  const girthX = x0 + 3, belly = t.bellyFront + 1;
  ctx.strokeStyle = EDGE; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(girthX, top + 4); ctx.quadraticCurveTo(girthX + 1.5, (top + belly) / 2, girthX - .5, belly); ctx.stroke();
  ctx.strokeStyle = p.tack; ctx.lineWidth = 2; ctx.stroke();
  ellipse(ctx, girthX + .6, (top + belly) / 2, 1.8, 2.2, "#d9c58b"); ellipse(ctx, girthX + .2, (top + belly) / 2 - .5, .6, .6, GLINT);
}
