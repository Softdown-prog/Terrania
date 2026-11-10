/** Silhueta e materiais exclusivos, mantendo as mesmas regras de combate. */
import type { ColorRamp } from "./geometry.ts";
import { organic, shard, headEyes, curvedLeg } from "./geometry.ts";

export const drawBasaltGolem = (ctx: CanvasRenderingContext2D, c: ColorRamp): void => {
  for (const s of [-1,1]) {
    curvedLeg(ctx, s * 9, -12, s * 12, -3, s * 13, 1, c, 11);
    organic(ctx, s * 14, -25, 13, 11, c, s * .2);
    curvedLeg(ctx, s * 19, -24, s * 25, -16, s * 27, -5, c, 9);
    organic(ctx, s * 27, -4, 9, 7, c);
  }
  organic(ctx, 0, -25, 19, 22, c);
  organic(ctx, 0, -46, 12, 11, c);
  for (let i = 0; i < 7; i++) {
    const y = -42 + i * 5;
    ctx.strokeStyle = i % 2 ? c.dark : c.accent; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-10 + i % 3, y); ctx.lineTo(-3, y + 2);
    ctx.lineTo(2 + i % 4, y - 1); ctx.stroke();
  }
  for (const s of [-1,1]) shard(ctx, s * 22, -32, 6, 7, c.accent, c.light);
  headEyes(ctx,[[-5,-48],[5,-48]],c,2.5);
  ctx.strokeStyle = c.dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-5,-41);ctx.lineTo(5,-41);ctx.stroke();
};
