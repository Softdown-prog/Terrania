import type { Player } from '../actors/Player.ts';
import type { Slime } from '../actors/Slime.ts';
export type HeroVisual = Pick<Player, 'faceX' | 'faceY' | 'walkTime' | 'attackTime'>;
export type SlimeVisual = Pick<Slime, 'hp' | 'bounce'>;
const TAU = Math.PI * 2;
export function renderHero(ctx: CanvasRenderingContext2D, player: HeroVisual, sx: number, sy: number): void {
  ctx.save(); ctx.translate(sx, sy);
  ctx.fillStyle = '#1d312d88';ctx.beginPath();ctx.ellipse(0, 10, 12, 5, 0, 0, TAU);ctx.fill();
  // Boneco top-down procedural. A orientação não depende de sprites/sheets.
  ctx.rotate(Math.atan2(player.faceY, player.faceX) - Math.PI / 2);
  const step = Math.sin(player.walkTime) * 3;
  ctx.fillStyle = '#272b47';ctx.fillRect(-7, 3 + step, 6, 9);ctx.fillRect(2, 3 - step, 6, 9);
  ctx.fillStyle = '#916635';ctx.fillRect(-10, -3, 20, 13);
  ctx.fillStyle = '#e4af70';ctx.fillRect(-13, 0 - step / 2, 5, 9);ctx.fillRect(8, 0 + step / 2, 5, 9);
  ctx.fillStyle = '#3d6790';ctx.fillRect(-8, -3, 16, 14);
  ctx.fillStyle = '#274763';ctx.fillRect(-2, -2, 4, 14);
  ctx.fillStyle = '#eac290';ctx.beginPath();ctx.arc(0, -8, 9, 0, TAU);ctx.fill();
  ctx.fillStyle = '#3b2b26';ctx.beginPath();ctx.arc(0, -11, 9, Math.PI, TAU);ctx.lineTo(8, -8);ctx.lineTo(-8, -8);ctx.fill();
  ctx.fillStyle = '#282320';ctx.fillRect(-4, -6, 2, 2);ctx.fillRect(3, -6, 2, 2);
  if (player.attackTime > 0) {
    ctx.save();ctx.rotate(-.35 + player.attackTime * 4);
    ctx.fillStyle = '#d2dce0';ctx.fillRect(10, -24, 4, 26);
    ctx.fillStyle = '#ffe0a2';ctx.fillRect(7, -3, 10, 3);
    ctx.strokeStyle = '#f5edb7b0';ctx.lineWidth = 3;ctx.beginPath();ctx.arc(0, 0, 30, -2.5, -.2);ctx.stroke();ctx.restore();
  } else {ctx.fillStyle = '#ccc8b7';ctx.fillRect(10, -6, 3, 17);ctx.fillStyle='#997047';ctx.fillRect(8, 4, 7, 3);}
  ctx.restore();
}
export function renderSlime(ctx: CanvasRenderingContext2D, slime: SlimeVisual, sx: number, sy: number): void {
  ctx.save();ctx.translate(sx, sy);
  ctx.fillStyle = '#24453766';ctx.beginPath();ctx.ellipse(0, 8, 13, 5, 0, 0, TAU);ctx.fill();
  ctx.scale(1 + slime.bounce * .04, 1 - slime.bounce * .08);
  ctx.fillStyle = '#275e6a';ctx.beginPath();ctx.ellipse(0, 0, 13, 12, 0, 0, TAU);ctx.fill();
  ctx.fillStyle = '#60c2ac';ctx.beginPath();ctx.ellipse(-2, -3, 11, 9, 0, 0, TAU);ctx.fill();
  ctx.fillStyle = '#e8fcf8';ctx.fillRect(-6, -5, 4, 5);ctx.fillRect(3, -5, 4, 5);
  ctx.fillStyle = '#132d2d';ctx.fillRect(-4, -3, 2, 3);ctx.fillRect(5, -3, 2, 3);
  if (slime.hp < 2) {ctx.fillStyle='#df7971';ctx.fillRect(-7,-18,14,3);}
  ctx.restore();
}
