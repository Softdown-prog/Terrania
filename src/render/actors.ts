import type { Player } from "../actors/Player.ts";
import type { Slime } from "../actors/Slime.ts";
import { ATTACK_DURATION, ATTACK_WINDUP } from "../engine/combat.ts";
export type HeroVisual = Pick<
  Player,
  "faceX" | "faceY" | "walkTime" | "attackTime"
> &
  Partial<Pick<Player, "vx" | "vy" | "hurtTime">>;
export type SlimeVisual = Pick<Slime, "hp" | "bounce"> & { hurtTime?: number };
const TAU = Math.PI * 2;
function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}
/** Upright silhouette, directional face and independent weapon; no rotating head. */
export function renderHero(
  ctx: CanvasRenderingContext2D,
  player: HeroVisual,
  sx: number,
  sy: number,
): void {
  ctx.save();
  ctx.translate(sx, sy);
  const speed = Math.min(1, Math.hypot(player.vx ?? 70, player.vy ?? 0) / 85);
  const step = Math.sin(player.walkTime) * 3 * speed;
  const bob = Math.cos(player.walkTime * 2) * speed * 0.65;
  const back = player.faceY < -0.35,
    side = player.faceX > 0.3 ? 1 : player.faceX < -0.3 ? -1 : 0;
  ellipse(ctx, 1, 3, 11, 4, "#102e2a55");
  ctx.translate(0, bob);
  // Traveling cloak, leather boots and layered armor.
  ctx.fillStyle = "#203e46";
  ctx.beginPath();
  ctx.moveTo(-9, -24);
  ctx.lineTo(8, -24);
  ctx.lineTo(11 - step / 2, -2);
  ctx.lineTo(-12 - step / 2, -3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#182f39";
  ctx.fillRect(-6, -6 + step, 5, 8);
  ctx.fillRect(2, -6 - step, 5, 8);
  ctx.fillStyle = "#584536";
  ctx.fillRect(-7, -1 + step, 7, 4);
  ctx.fillRect(2, -1 - step, 7, 4);
  ctx.fillStyle = "#b48d59";
  ctx.fillRect(-6, -1 + step, 4, 1);
  ctx.fillRect(3, -1 - step, 4, 1);
  ctx.fillStyle = (player.hurtTime ?? 0) > 0.13 ? "#ebd9ba" : "#4e7681";
  ctx.beginPath();
  ctx.moveTo(-8, -24);
  ctx.lineTo(7, -24);
  ctx.lineTo(9, -7);
  ctx.lineTo(-9, -7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#71979c";
  ctx.fillRect(-6, -22, 3, 12);
  ctx.fillStyle = "#2e515d";
  ctx.fillRect(2, -20, 5, 12);
  ctx.fillStyle = "#8b704b";
  ctx.fillRect(-9, -9, 18, 3);
  ctx.fillStyle = "#d4bc7f";
  ctx.fillRect(-1, -9, 4, 3);
  ctx.save();
  ctx.translate(-10, -19 + step * 0.4);
  ctx.rotate(-0.12);
  ctx.fillStyle = "#9ba9a0";
  ctx.fillRect(-2, -3, 6, 5);
  ctx.fillStyle = "#345764";
  ctx.fillRect(-2, 2, 5, 7);
  ctx.fillStyle = "#d7b185";
  ctx.fillRect(-2, 9, 5, 4);
  ctx.restore();
  ctx.fillStyle = "#a0aca2";
  ctx.fillRect(7, -23, 6, 5);
  ctx.fillStyle = "#345763";
  ctx.fillRect(8, -18, 5, 9);
  ctx.fillStyle = "#d7b185";
  ctx.fillRect(8, -10, 4, 5);
  // Hair and face stay upright for all eight movement directions.
  ellipse(ctx, 0, -29, 8.5, 9, "#392f29");
  if (!back) {
    ctx.fillStyle = "#ddb88b";
    ctx.beginPath();
    ctx.moveTo(-7, -32);
    ctx.lineTo(6, -32);
    ctx.lineTo(7, -25);
    ctx.lineTo(3, -21);
    ctx.lineTo(-4, -22);
    ctx.lineTo(-7, -26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#af815c";
    ctx.fillRect(3, -27, 3, 4);
    ctx.fillStyle = "#1d3333";
    if (side <= 0) ctx.fillRect(-4 + side, -28, 2, 2);
    if (side >= 0) ctx.fillRect(3 + side, -28, 2, 2);
    ctx.fillStyle = "#6e4b39";
    ctx.fillRect(-1 + side * 2, -23, 3, 1);
  }
  ctx.fillStyle = "#4e3d2d";
  ctx.beginPath();
  ctx.moveTo(-8, -30);
  ctx.lineTo(-9, -35);
  ctx.lineTo(-4, -39);
  ctx.lineTo(3, -38);
  ctx.lineTo(8, -34);
  ctx.lineTo(7, -27);
  ctx.lineTo(3, -31);
  ctx.lineTo(0, -33);
  ctx.lineTo(-5, -30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#7d6443";
  ctx.fillRect(-5, -36, 6, 2);
  if (back) {
    ctx.fillStyle = "#293f43";
    ctx.fillRect(-6, -23, 12, 6);
    ctx.fillStyle = "#78948a";
    ctx.fillRect(-4, -23, 8, 2);
  }
  const attacking = player.attackTime > 0;
  ctx.save();
  ctx.translate(0, -12);
  if (attacking) {
    const elapsed = ATTACK_DURATION - player.attackTime;
    const progress = Math.min(
      1,
      Math.max(
        0,
        (elapsed - ATTACK_WINDUP * 0.55) / (ATTACK_DURATION - ATTACK_WINDUP),
      ),
    );
    const sweep = progress * progress * (3 - 2 * progress);
    const facing = Math.atan2(player.faceY, player.faceX);
    const angle = facing - 1.25 + sweep * 2.5;
    if (progress > 0.08 && progress < 0.96) {
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = (["#f9ebbaaa", "#e1c98a66", "#fbf5da33"][i] ?? "#fbf5da33");
        ctx.lineWidth = 2.4 + i * 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 37 - i * 4, angle - 0.7, angle);
        ctx.stroke();
      }
    }
    ctx.rotate(angle);
  } else {
    ctx.translate(10, 3);
    ctx.rotate(0.95);
  }
  ctx.fillStyle = "#443f34";
  ctx.fillRect(4, -2, 10, 4);
  ctx.fillStyle = "#b49c65";
  ctx.fillRect(12, -6, 3, 12);
  ctx.fillStyle = "#d4ddd1";
  ctx.beginPath();
  ctx.moveTo(15, -3);
  ctx.lineTo(attacking ? 45 : 33, 0);
  ctx.lineTo(15, 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#f2f0d2";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(15, -2);
  ctx.lineTo(attacking ? 44 : 32, 0);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}
export function renderSlime(
  ctx: CanvasRenderingContext2D,
  slime: SlimeVisual,
  sx: number,
  sy: number,
): void {
  ctx.save();
  ctx.translate(sx, sy);
  const hop = Math.max(0, slime.bounce) * 4;
  ellipse(ctx, 1, 4, 12 - hop * 0.45, 4 - hop * 0.16, "#173c3255");
  ctx.translate(0, -hop);
  ctx.scale(1 - hop * 0.02, 1 + hop * 0.035);
  const fill = ctx.createRadialGradient(-5, -13, 1, 0, -5, 17);
  fill.addColorStop(0, (slime.hurtTime ?? 0) > 0.1 ? "#e4eed6" : "#aed8a3");
  fill.addColorStop(0.45, "#66ac91");
  fill.addColorStop(1, "#2e6d66");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-13, 1);
  ctx.bezierCurveTo(-15, -9, -8, -19, 0, -19);
  ctx.bezierCurveTo(10, -18, 17, -8, 13, 1);
  ctx.quadraticCurveTo(1, 7, -13, 1);
  ctx.fill();
  ctx.strokeStyle = "#204d4999";
  ctx.lineWidth = 1;
  ctx.stroke();
  ellipse(ctx, -5, -13, 4, 2.5, "#e0f1cb80");
  ellipse(ctx, 9, -3, 2, 2, "#c5e7c540");
  ctx.fillStyle = "#d8eed6";
  ctx.fillRect(-7, -9, 4, 5);
  ctx.fillRect(3, -9, 4, 5);
  ctx.fillStyle = "#203b3d";
  ctx.fillRect(-5, -8, 2, 4);
  ctx.fillRect(5, -8, 2, 4);
  ctx.fillStyle = "#1f514a";
  ctx.fillRect(-1, -2, 3, 1);
  if (slime.hp < 2) {
    ctx.fillStyle = "#17342f";
    ctx.fillRect(-10, -27, 20, 4);
    ctx.fillStyle = "#e0b578";
    ctx.fillRect(-9, -26, 9, 2);
  }
  ctx.restore();
}
