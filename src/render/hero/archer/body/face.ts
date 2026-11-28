import { ellipse, rgba } from "../../../draw.ts";
import type { HeroDrawContext } from "../../context.ts";
import { ARCHER_BODY as B } from "../palette.ts";

/**
 * O rosto do Arqueiro (ADR 0114), mais anguloso que o dos outros heróis: maçãs do rosto marcadas, queixo em ponta, olhos verde-avelã de pálpebra pesada
 * e sobrancelhas retas. Acompanha o olhar, pisca e franze como os outros (o quadro traz `closed`, `fierce`, `shout` e `hurting`). De costas não há rosto.
 */
export function face(c: HeroDrawContext, ctx: CanvasRenderingContext2D): void {
  const { tone, headX: hx, headY: hy, side, faceX, faceY, closed, fierce, shout, hurting } = c;
  const skin = ctx.createRadialGradient(hx - 2 + side, hy - 2, 1, hx, hy + 1, 9);
  skin.addColorStop(0, tone(B.skin.light)); skin.addColorStop(0.7, tone(B.skin.mid)); skin.addColorStop(1, tone(B.skin.dark));
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(hx - 6.6 + side * 1.4, hy - 3.6);
  ctx.quadraticCurveTo(hx, hy - 6.6, hx + 6.6 + side * 1.4, hy - 3.6);
  ctx.lineTo(hx + 7.2 + side * 1.2, hy + 2.2);          // maçã do rosto
  ctx.lineTo(hx + 2.4 + side, hy + 9.6);                // queixo em ponta
  ctx.lineTo(hx + side * 0.6, hy + 10.2);
  ctx.lineTo(hx - 2.4 + side, hy + 9.6);
  ctx.lineTo(hx - 7.2 + side * 1.2, hy + 2.2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(B.skin.dark, 0.5); ctx.lineWidth = 0.6; ctx.stroke();
  // sombra sob a maçã do rosto, para o ângulo aparecer
  ctx.strokeStyle = rgba(B.skin.dark, 0.5); ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(hx - 6.4 + side * 1.2, hy + 2.6); ctx.quadraticCurveTo(hx - 4.2 + side, hy + 4.6, hx - 2.2 + side, hy + 5.4);
  ctx.moveTo(hx + 6.4 + side * 1.2, hy + 2.6); ctx.quadraticCurveTo(hx + 4.2 + side, hy + 4.6, hx + 2.2 + side, hy + 5.4); ctx.stroke();
  const eyeY = hy + 0.6 + faceY * 0.7;
  const eyes = side === 0 ? [-2.9, 2.9] : [side * 3.6];
  for (const ex of eyes) {
    const x = hx + ex + side * 1.2;
    ellipse(ctx, x, eyeY, 1.8, 1.9 * (1 - closed) + 0.25, B.eyeWhite);
    ellipse(ctx, x + faceX * 0.6, eyeY + faceY * 0.5, 1.2, 1.5 * (1 - closed) + 0.2, B.iris);
    ellipse(ctx, x + faceX * 0.6, eyeY + faceY * 0.5 + 0.3, 0.95, 0.75 * (1 - closed) + 0.1, B.irisDark);
    ellipse(ctx, x + faceX * 0.6, eyeY + faceY * 0.5, 0.55, 0.85 * (1 - closed) + 0.1, B.pupil);
    if (closed < 0.5) ellipse(ctx, x + 0.45, eyeY - 0.6, 0.4, 0.4, B.glint);
    // pálpebra pesada: uma linha reta por cima do olho
    ctx.strokeStyle = tone(B.lash); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x - 2.1, eyeY - 1.3 * (1 - closed) - 0.2); ctx.lineTo(x + 2.1, eyeY - 1.5 * (1 - closed) - 0.2); ctx.stroke();
    // sobrancelha reta e grossa, que desce ao golpear (mira)
    ctx.strokeStyle = rgba(B.hair.dark, 0.95); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - 2.4, eyeY - 3.2 + fierce * (ex < 0 ? -0.8 : 0.8)); ctx.lineTo(x + 2.4, eyeY - 3.4 + fierce * (ex < 0 ? 0.8 : -0.8)); ctx.stroke();
  }
  // nariz reto, orelha de perfil, rubor e boca fina
  ctx.strokeStyle = rgba(B.skin.dark, 0.8); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(hx + side * 1.4, hy + 1.4); ctx.lineTo(hx + side * 1.4 + 0.5, hy + 4.4); ctx.lineTo(hx + side * 1.4 - 0.7, hy + 4.7); ctx.stroke();
  if (side !== 0) ellipse(ctx, hx + side * 6.9, hy + 2.8, 1.1, 1.6, tone(B.skin.dark));
  ellipse(ctx, hx - 4.6 + side * 1.4, hy + 4.4, 1.5, 0.8, rgba(B.blush, 0.12));
  ellipse(ctx, hx + 4.6 + side * 1.4, hy + 4.4, 1.5, 0.8, rgba(B.blush, 0.12));
  if (shout) ellipse(ctx, hx + side * 1.8, hy + 7, 1.3, 0.9 + (hurting ? 0.6 : 0), tone(B.mouthOpen));
  else { ctx.fillStyle = tone(B.mouth); ctx.fillRect(hx + side * 1.8 - 1.3, hy + 6.8, 2.6, 0.7); }
}
