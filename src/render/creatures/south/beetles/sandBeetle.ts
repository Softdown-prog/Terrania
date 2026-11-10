import { monsterPose } from "../../../monsterMotion.ts";
import { sandBeetleBuried } from "../../../../actors/CreatureCatalog.ts";
import { clamp01, ellipse, mix, pill, rgba, softShadow } from "../../../draw.ts";

export interface SandBeetleVisual {
  readonly hp: number;
  readonly hurtTime?: number;
  readonly id?: string;
  readonly motionPhase?: number;
  readonly moving?: number;
}

/**
 * Besouro da Areia: silhueta 9 × 10 px em unidades do mundo (sem UI).
 * O desenho é procedural, como os demais monstros do Terrania; a imagem
 * de referência orienta o casco dourado, mandíbulas e seis patas.
 */
export function renderSandBeetle(
  ctx: CanvasRenderingContext2D, actor: SandBeetleVisual,
  sx: number, sy: number, time = 0,
): void {
  const buried = sandBeetleBuried(actor.hp);
  ctx.save();
  ctx.translate(sx, sy);
  softShadow(ctx, 0, .2, 4.15, .8, .28);
  const pose=monsterPose({kind:"sand-beetle",...actor},time);
  ctx.translate(pose.sway*.25,pose.lift*.12+(buried?.65:0));
  ctx.rotate(pose.tilt*.5);
  ctx.scale(pose.stretchX,pose.stretchY);

  // Seis patas articuladas: permanecem sob as placas de quitina.
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const y = -6.2 + i * 1.8;
    const startX = side * (i === 0 ? 1.6 : 2.3);
    const endX = side * (3.25 + (i % 2) * .55);
    const endY = Math.min(0, y + 2.15);
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.quadraticCurveTo(side * 3.3, y + .45, endX, endY);
    ctx.strokeStyle = "#29201b";
    ctx.lineWidth = .8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.quadraticCurveTo(side * 3.2, y + .2, endX, endY - .15);
    ctx.strokeStyle = i % 2 ? "#b87836" : "#e1a65a";
    ctx.lineWidth = .48;
    ctx.stroke();
    ellipse(ctx, endX, endY, .25, .28, "#583520");
  }

  // Abdômen/casco e duas asas rígidas em perspectiva três quartos.
  const shell = ctx.createLinearGradient(-2.7, -9.1, 3.5, -3.1);
  shell.addColorStop(0, "#fff2ba");
  shell.addColorStop(.26, "#eebb65");
  shell.addColorStop(.68, "#b77537");
  shell.addColorStop(1, "#5c3927");
  ellipse(ctx, .65, -6.35, 3.0, 3.1, "#251d1c", -.25);
  ellipse(ctx, .65, -6.45, 2.72, 2.85, shell, -.25);

  ctx.strokeStyle = "#704123";
  ctx.lineWidth = .5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-1.7 + i * .7, -8.45);
    ctx.quadraticCurveTo(.15 + i * .6, -7.2, 1.35 + i * .55, -4.55);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-1.5, -7.6);
  ctx.quadraticCurveTo(.45, -8.55, 2.25, -8.1);
  ctx.quadraticCurveTo(2.75, -6.9, 2.6, -5.45);
  ctx.strokeStyle = rgba("#ffe4a0", .85);
  ctx.lineWidth = .43;
  ctx.stroke();

  // Pronoto robusto e cabeça voltada para baixo/esquerda.
  const collar = ctx.createLinearGradient(-3.1, -6.1, 1.65, -2.5);
  collar.addColorStop(0, "#ffe5a1");
  collar.addColorStop(.48, "#e3a44b");
  collar.addColorStop(1, "#8b512e");
  ellipse(ctx, -1.05, -4.65, 2.2, 1.95, "#241d1b", -.33);
  ellipse(ctx, -1.07, -4.74, 1.95, 1.7, collar, -.33);
  ellipse(ctx, -1.55, -3.45, 1.33, 1.26, "#5f3825", -.2);
  ellipse(ctx, -1.65, -3.57, 1.1, 1.01, "#cf8b40", -.2);

  // Olhos, mandíbulas curvas (beliscão) e pontos de desgaste do casco.
  for (const x of [-2.22, -.92]) {
    ellipse(ctx, x, -3.75, .32, .39, "#251d1c");
    ellipse(ctx, x - .08, -3.88, .11, .13, "#fff4ce");
  }
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-1.55 + side * .63, -2.7);
    ctx.quadraticCurveTo(-1.55 + side * 1.18, -1.2, -1.6 + side * .36, -1.05);
    ctx.strokeStyle = "#3b221c";
    ctx.lineWidth = .75;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1.55 + side * .63, -2.7);
    ctx.quadraticCurveTo(-1.58 + side * 1.02, -1.45, -1.6 + side * .35, -1.1);
    ctx.strokeStyle = "#b77239";
    ctx.lineWidth = .35;
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const x = -.8 + (i % 4) * .84;
    const y = -8.05 + Math.floor(i / 4) * 1.05;
    ellipse(ctx, x, y, .18, .22, i % 2 ? "#fff1b9" : "#82502d", -.25);
  }
  ctx.strokeStyle = rgba("#fff9d8", .7);
  ctx.lineWidth = .24;
  ctx.beginPath();
  ctx.arc(.8, -6.6, 2.1, Math.PI * 1.1, Math.PI * 1.62);
  ctx.stroke();

  if (buried) {
    // O casco continua visível; somente o corpo inferior afunda na areia.
    ellipse(ctx, -.05, -1.65, 4.2, 1.55, "#725334");
    ellipse(ctx, -.1, -1.9, 3.9, 1.15, "#d8b477");
    for (let i = 0; i < 4; i++)
      ellipse(ctx, -2.65 + i * 1.7, -1.55 + (i % 2) * .28, .21, .12, "#f5dfac");
  }
  if ((actor.hurtTime ?? 0) > 0)
    ellipse(ctx, 0, -5.35, 3.5, 3.6, rgba("#fff3ca", clamp01((actor.hurtTime ?? 0) / .22) * .22));
  ctx.restore();

  // Interface separada da dimensão 9 × 10 da criatura.
  if (actor.hp < 40 && actor.hp > 0) {
    ctx.save();
    ctx.translate(sx, sy);
    const fraction = clamp01(actor.hp / 40);
    ctx.fillStyle = rgba("#241c1b", .9);
    pill(ctx, -4.5, -12.5, 9, 1.65);
    ctx.fill();
    ctx.fillStyle = mix("#d65b45", "#b9df7b", fraction);
    pill(ctx, -4, -12.2, 8 * fraction, 1.05);
    ctx.fill();
    ctx.restore();
  }
}
