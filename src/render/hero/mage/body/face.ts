import { ellipse, rgba } from "../../../draw.ts";
import type { HeroDrawContext } from "../../context.ts";
import { MAGE_BODY as B } from "./palette.ts";

/**
 * O rosto do Mago (lote M1), diferente do do Cavaleiro: mais comprido e fino, com o queixo marcado, olhos azul-acinzentados com cílios, sobrancelhas
 * finas e boca pequena. Acompanha a direção do olhar, pisca e franze ao golpear como o do Cavaleiro (o quadro traz `closed`, `fierce`, `shout` e `hurting`).
 * Só de frente e de lado; de costas não há rosto.
 */
export function face(c: HeroDrawContext, ctx: CanvasRenderingContext2D): void {
  const { tone, headX: hx, headY: hy, side, faceX, faceY, closed, fierce, shout, hurting } = c;
  const skin = ctx.createRadialGradient(hx - 2 + side, hy - 2, 1, hx, hy + 1, 9);
  skin.addColorStop(0, tone(B.skin.light)); skin.addColorStop(0.7, tone(B.skin.mid)); skin.addColorStop(1, tone(B.skin.dark));
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(hx - 6.4 + side * 1.4, hy - 3.4);
  ctx.quadraticCurveTo(hx, hy - 6.4, hx + 6.4 + side * 1.4, hy - 3.4);
  ctx.quadraticCurveTo(hx + 7.4 + side * 1.2, hy + 3.8, hx + 2.8 + side, hy + 9.4);
  ctx.quadraticCurveTo(hx + side * 0.6, hy + 10.6, hx - 2.8 + side, hy + 9.4);
  ctx.quadraticCurveTo(hx - 7.4 + side * 1.2, hy + 3.8, hx - 6.4 + side * 1.4, hy - 3.4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(B.skin.dark, 0.45); ctx.lineWidth = 0.6; ctx.stroke();
  const eyeY = hy + 0.6 + faceY * 0.7;
  const eyes = side === 0 ? [-2.9, 2.9] : [side * 3.6];
  for (const ex of eyes) {
    const x = hx + ex + side * 1.2;
    ellipse(ctx, x, eyeY, 1.8, 2.2 * (1 - closed) + 0.25, B.eyeWhite);
    ellipse(ctx, x + faceX * 0.6, eyeY + faceY * 0.5, 1.2, 1.65 * (1 - closed) + 0.2, B.iris);
    ellipse(ctx, x + faceX * 0.6, eyeY + faceY * 0.5 + 0.35, 0.95, 0.8 * (1 - closed) + 0.1, B.irisDark);
    ellipse(ctx, x + faceX * 0.6, eyeY + faceY * 0.5, 0.55, 0.9 * (1 - closed) + 0.1, B.pupil);
    if (closed < 0.5) ellipse(ctx, x + 0.45, eyeY - 0.7, 0.42, 0.42, B.glint);
    ctx.strokeStyle = tone(B.lash); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x - 2, eyeY - 1.6 * (1 - closed) - 0.2); ctx.quadraticCurveTo(x, eyeY - 2.6 * (1 - closed) - 0.3, x + 2, eyeY - 1.7 * (1 - closed) - 0.2); ctx.stroke();
    // sobrancelha fina, que se inclina ao golpear
    ctx.strokeStyle = rgba(B.hair.dark, 0.95); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 2.2, eyeY - 3.4 + fierce * (ex < 0 ? -1 : 1)); ctx.quadraticCurveTo(x, eyeY - 4.1, x + 2.2, eyeY - 3.6 + fierce * (ex < 0 ? 1 : -1)); ctx.stroke();
  }
  // nariz, orelha de perfil, rubor e boca
  ctx.strokeStyle = rgba(B.skin.dark, 0.75); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(hx + side * 1.4, hy + 1.6); ctx.quadraticCurveTo(hx + side * 1.4 + 0.9, hy + 4.2, hx + side * 1.4 - 0.5, hy + 4.6); ctx.stroke();
  if (side !== 0) ellipse(ctx, hx + side * 6.8, hy + 2.8, 1.1, 1.5, tone(B.skin.dark));
  ellipse(ctx, hx - 4.4 + side * 1.4, hy + 4.6, 1.6, 0.9, rgba(B.blush, 0.14));
  ellipse(ctx, hx + 4.4 + side * 1.4, hy + 4.6, 1.6, 0.9, rgba(B.blush, 0.14));
  if (shout) ellipse(ctx, hx + side * 1.8, hy + 6.8, 1.4, 1 + (hurting ? 0.6 : 0), tone(B.mouthOpen));
  else { ctx.fillStyle = tone(B.mouth); ctx.fillRect(hx + side * 1.8 - 1.1, hy + 6.5, 2.2, 0.8); }
}
