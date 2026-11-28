import { BOWS, type BowId } from "../../engine/character/Bows.ts";
import { ellipse, rgba } from "../draw.ts";
import { drawNockedArrow } from "./nock.ts";

/** Meia altura do arco, em pixels, e quanto a barriga avança da empunhadura. */
export const BOW_HALF = 13.5;
export const BOW_BELLY = 3.6;
/** Onde ficam as pontas do arco (para trás da empunhadura) e quanto a corda recua quando totalmente puxada. */
export const BOW_TIP_X = -2.6;
export const BOW_FULL_DRAW = 7.5;

/**
 * O arco na mão (ADR 0116), no referencial da empunhadura: a barriga do arco para +x, as pontas em cima e embaixo. `draw` (0 a 1) é o quanto a corda está puxada:
 * 0 deixa a corda esticada de ponta a ponta e sem flecha; acima de 0 a corda recua em ponta, as pontas do arco cedem um pouco e a flecha aparece encaixada.
 * Cores da ficha do arco (`visual`), então cada arco novo já ganha o dele. Quem desenha gira e espelha para o lado em que o herói olha.
 */
export function drawBow(ctx: CanvasRenderingContext2D, bow: BowId, draw: number, tone: (color: string) => string): void {
  const v = BOWS[bow].visual, d = Math.max(0, Math.min(1, Number.isFinite(draw) ? draw : 0));
  const tip = BOW_TIP_X - d * 1.1 + v.flick, half = BOW_HALF * v.length, belly = BOW_BELLY, pull = BOW_TIP_X + v.flick - BOW_FULL_DRAW * d;  // o comprimento e o coice das pontas vêm da ficha do arco; em repouso a corda é reta de ponta a ponta
  const limb = (): void => {
    ctx.beginPath(); ctx.moveTo(tip, -half); ctx.quadraticCurveTo(belly * 2.3, -half * 0.5, belly, 0); ctx.quadraticCurveTo(belly * 2.3, half * 0.5, tip, half);
  };
  // sombra suave do arco no chão do braço e o contorno escuro
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  limb(); ctx.strokeStyle = rgba("#1f1510", 0.85); ctx.lineWidth = 4.4; ctx.stroke();
  const wood = ctx.createLinearGradient(tip, 0, belly * 2, 0);
  wood.addColorStop(0, tone(v.limb.dark)); wood.addColorStop(0.55, tone(v.limb.mid)); wood.addColorStop(1, tone(v.limb.light));
  limb(); ctx.strokeStyle = wood; ctx.lineWidth = 3.1; ctx.stroke();
  limb(); ctx.strokeStyle = rgba(v.limb.light, 0.75); ctx.lineWidth = 0.8; ctx.stroke();
  ctx.lineCap = "butt";
  // a corda: esticada, ou em duas retas até o ponto puxado
  ctx.strokeStyle = tone(v.string); ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(tip, -half + 0.4); ctx.lineTo(pull, 0); ctx.lineTo(tip, half - 0.4); ctx.stroke();
  // a flecha encaixada, só com a corda puxada
  if (d > 0.04) drawNockedArrow(ctx, pull, belly + 7, tone);
  // empunhadura de couro com duas cintas, e as pontas do arco
  ctx.fillStyle = tone(v.wrap); ctx.fillRect(belly - 1.9, -3, 3.8, 6);
  ctx.strokeStyle = tone(v.wrapDark); ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(belly - 1.9, -1.2); ctx.lineTo(belly + 1.9, -1.2); ctx.moveTo(belly - 1.9, 1.2); ctx.lineTo(belly + 1.9, 1.2); ctx.stroke();
  ellipse(ctx, tip, -half, 1.1, 1.1, tone(v.tip)); ellipse(ctx, tip, half, 1.1, 1.1, tone(v.tip));
  // cintas de couro perto das pontas, brilho da madeira na barriga e a borla de fio pendurada na empunhadura
  ctx.strokeStyle = tone(v.wrapDark); ctx.lineWidth = 1;
  ctx.beginPath(); for (const y of [-half + 2.6, half - 2.6]) { ctx.moveTo(tip + 1.6, y); ctx.lineTo(tip + 4.2, y); } ctx.stroke();
  ellipse(ctx, belly + 1.4, -4.6, 0.8, 3, rgba("#fff4d6", 0.55));
  ctx.strokeStyle = tone(v.charm); ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(belly, 3); ctx.quadraticCurveTo(belly + 1.8, 6, belly + 0.6, 8.2); ctx.stroke();
  ellipse(ctx, belly + 0.6, 8.8, 1, 1.5, tone(v.charm));
}
