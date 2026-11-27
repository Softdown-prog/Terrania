import { ellipse, mix, rgba, shade, softShadow, TAU } from "./draw.ts";

/**
 * Baú das tocas da Masmorra das Raízes (ADR 0103). Arte pura, peça física auditada como `prop`: caixa de madeira com tampa arqueada, duas cintas de ferro, fechadura de latão
 * e um fio de ouro aparecendo na fresta. Origem em (sx, sy) = o centro da base, no chão; luz da esquerda e de cima. A madeira é a mesma em todo tema (o baú foi trazido de fora),
 * só a sombra e o brilho do ouro mudam de intensidade com a luz do lugar.
 */
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";
const WOOD = "#7a4a2a";
const IRON = "#3b3f46";
const BRASS = "#d8a93f";

export function drawCaveChest(ctx: CanvasRenderingContext2D, sx: number, sy: number, time = 0): void {
  ctx.save();
  ctx.translate(sx, sy);
  // 1. Sombra de contato no chão, antes de qualquer forma.
  softShadow(ctx, 1, 2, 17, 5.5, .5);
  // 2. Corpo da caixa: madeira com luz em cima à esquerda e sombra embaixo à direita.
  const body = ctx.createLinearGradient(-14, -10, 14, 4);
  body.addColorStop(0, mix(WOOD, GLINT, .16));
  body.addColorStop(.5, WOOD);
  body.addColorStop(1, shade(WOOD, -.42));
  ctx.fillStyle = OUTLINE; ctx.fillRect(-14.8, -10.8, 29.6, 14.6);
  ctx.fillStyle = body; ctx.fillRect(-13.6, -9.6, 27.2, 12.4);
  // 3. Tábuas: sulcos escuros e veio claro, para a madeira não ficar lisa.
  for (let i = 0; i < 4; i++) {
    const y = -7.2 + i * 3.1;
    ctx.fillStyle = rgba(shade(WOOD, -.55), .55); ctx.fillRect(-13.6, y + 1.5, 27.2, .8);
    ctx.fillStyle = rgba(mix(WOOD, GLINT, .3), .35); ctx.fillRect(-13.6, y, 27.2, .6);
  }
  // 4. Tampa arqueada, mais clara na quina de cima, com o contorno acompanhando a curva.
  const lid = ctx.createLinearGradient(-12, -19, 12, -8);
  lid.addColorStop(0, mix(WOOD, GLINT, .3));
  lid.addColorStop(.55, shade(WOOD, .06));
  lid.addColorStop(1, shade(WOOD, -.32));
  ctx.fillStyle = OUTLINE;
  ctx.beginPath(); ctx.moveTo(-14.8, -9.4); ctx.quadraticCurveTo(-14.2, -20.6, 0, -20.8);
  ctx.quadraticCurveTo(14.2, -20.6, 14.8, -9.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = lid;
  ctx.beginPath(); ctx.moveTo(-13.6, -10); ctx.quadraticCurveTo(-13, -19.4, 0, -19.6);
  ctx.quadraticCurveTo(13, -19.4, 13.6, -10); ctx.closePath(); ctx.fill();
  // 5. Fresta entre a tampa e a caixa, com o ouro brilhando por dentro.
  ctx.fillStyle = "#0b1519"; ctx.fillRect(-13.6, -10.6, 27.2, 1.6);
  const gold = ctx.createLinearGradient(-9, -10.4, 9, -10.4);
  gold.addColorStop(0, rgba(BRASS, .05)); gold.addColorStop(.5, rgba("#ffe08a", .95 - .12 * Math.sin(time * 2.6))); gold.addColorStop(1, rgba(BRASS, .05));
  ctx.fillStyle = gold; ctx.fillRect(-9, -10.4, 18, .9);
  // 6. Cintas de ferro (duas), com rebites; o ferro segue a curva da tampa.
  for (const bx of [-8.6, 8.6]) {
    ctx.fillStyle = OUTLINE; ctx.fillRect(bx - 2.4, -9.6, 4.8, 12.6);
    ctx.fillStyle = IRON; ctx.fillRect(bx - 1.7, -9.6, 3.4, 12.6);
    ctx.fillStyle = rgba(GLINT, .25); ctx.fillRect(bx - 1.7, -9.6, .8, 12.6);
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(bx - 1.4, -10); ctx.quadraticCurveTo(bx - 1.2, -18.4, bx * .12, -19.4);
    ctx.stroke();
    ctx.strokeStyle = IRON; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(bx - 1.4, -10); ctx.quadraticCurveTo(bx - 1.2, -18.2, bx * .12, -19.2);
    ctx.stroke();
    ellipse(ctx, bx, -7, .8, .8, rgba(GLINT, .55)); ellipse(ctx, bx, 0, .8, .8, rgba(GLINT, .4));
  }
  // 7. Fechadura de latão no meio da frente, com o buraco da chave.
  ctx.fillStyle = OUTLINE; ctx.fillRect(-3.4, -10.8, 6.8, 7.8);
  const brass = ctx.createLinearGradient(-3, -10, 3, -4);
  brass.addColorStop(0, mix(BRASS, GLINT, .5)); brass.addColorStop(1, shade(BRASS, -.35));
  ctx.fillStyle = brass; ctx.fillRect(-2.6, -10, 5.2, 6.2);
  ctx.fillStyle = "#1a1208"; ellipse(ctx, 0, -7.6, .9, .9, "#1a1208"); ctx.fillRect(-.35, -7.4, .7, 2);
  // 8. Cantos e pés: reforço de ferro nos cantos de baixo.
  for (const cx of [-13.2, 13.2]) { ctx.fillStyle = IRON; ctx.fillRect(cx - 1.4, 1, 2.8, 2.6); }
  // 9. Brilho especular por último, do lado da luz, e um ponto de ouro que pisca.
  ctx.strokeStyle = rgba(GLINT, .7); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-11.6, -11); ctx.quadraticCurveTo(-11.2, -17.2, -4.5, -18.4); ctx.stroke();
  ellipse(ctx, -9.8, -15.6, 2.4, .9, rgba(GLINT, .5), -.7);
  const sparkle = .45 + .45 * Math.sin(time * 3.1);
  ctx.fillStyle = rgba("#fff3b0", sparkle);
  ctx.beginPath(); ctx.arc(6.2, -10.2, 1.1, 0, TAU); ctx.fill();
  ctx.restore();
}
