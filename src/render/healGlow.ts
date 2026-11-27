/**
 * O brilho de cura da poção: uma poça de luz no chão com anéis que se abrem, uma coluna de luz atrás do herói, e, por cima dele, uma aura dourada e verde com um clarão
 * no começo e faíscas em cruz que sobem. Dura `HEAL_GLOW_SECONDS` (entra rápido e se apaga nos últimos instantes). Só desenho: quem guarda o tempo é `Player.healGlow`,
 * e quem o liga é o uso da poção (nada de regra de jogo aqui). Duas camadas, porque o herói é desenhado entre elas: `back` (chão e coluna) e `front` (aura e faíscas).
 */
import { HEAL_GLOW_SECONDS } from "../actors/Player.ts";
import { clamp01, ellipse, rgba, TAU } from "./draw.ts";

export type HealGlowLayer = "back" | "front";

const GREEN = "#8ff0a4", DEEP = "#3fbf78", GOLD = "#ffe58a", WHITE = "#fffbe6", LIME = "#c8ff9e", AMBER = "#ffc857";
const SPARKLES = 9;

export function renderHealGlow(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, seconds: number, layer: HealGlowLayer, lift = 0): void {
  if (!(seconds > 0) || !Number.isFinite(seconds) || !Number.isFinite(time) || !Number.isFinite(lift)) return;
  const p = clamp01(1 - seconds / HEAL_GLOW_SECONDS);
  const fade = Math.min(1, seconds * 3.2) * Math.min(1, .35 + p * 6);
  ctx.save(); ctx.translate(x, y);
  if (layer === "back") {
    const pool = ctx.createRadialGradient(0, 2, 1, 0, 2, 22); pool.addColorStop(0, rgba(GOLD, .6 * fade)); pool.addColorStop(.55, rgba(GREEN, .34 * fade)); pool.addColorStop(1, rgba(DEEP, 0));
    ellipse(ctx, 0, 2, 22, 8, pool);
    for (let ring = 0; ring < 2; ring++) {
      const q = clamp01(p * 1.6 - ring * .28), r = 7 + q * 24;
      ctx.strokeStyle = rgba(ring ? LIME : AMBER, .75 * fade * (1 - q * .7)); ctx.lineWidth = 1.7 - q;
      ctx.beginPath(); ctx.ellipse(0, 2, r, r * .34, 0, 0, TAU); ctx.stroke();
    }
    const column = ctx.createLinearGradient(0, 2, 0, -54); column.addColorStop(0, rgba(GOLD, .42 * fade)); column.addColorStop(1, rgba(GREEN, 0));
    ctx.fillStyle = column; ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-11 + p * 3, -26, -6, -54); ctx.lineTo(6, -54); ctx.quadraticCurveTo(11 - p * 3, -26, 9, 2); ctx.closePath(); ctx.fill();
  } else {
    ctx.translate(0, -lift);
    const aura = ctx.createRadialGradient(0, -18, 3, 0, -18, 26), pulse = .78 + Math.sin(time * 14) * .22;
    aura.addColorStop(0, rgba(WHITE, .5 * fade * pulse)); aura.addColorStop(.4, rgba(GOLD, .34 * fade * pulse)); aura.addColorStop(.75, rgba(GREEN, .18 * fade)); aura.addColorStop(1, rgba(GREEN, 0));
    ellipse(ctx, 0, -18, 26, 30, aura);
    if (p < .12) ellipse(ctx, 0, -18, 15, 21, rgba(WHITE, (1 - p / .12) * .42));
    for (let k = 0; k < SPARKLES; k++) {
      const phase = (p * 1.7 + k * .137) % 1, sx = Math.sin(k * 2.4 + time * 3) * (8 + (k % 3) * 3.4), sy = -3 - phase * 42, size = 1.5 + (k % 3) * .55, a = Math.sin(phase * Math.PI) * fade;
      ctx.strokeStyle = rgba(k % 2 ? GOLD : k % 3 ? WHITE : LIME, .9 * a); ctx.lineWidth = .9;
      ctx.beginPath(); ctx.moveTo(sx - size, sy); ctx.lineTo(sx + size, sy); ctx.moveTo(sx, sy - size); ctx.lineTo(sx, sy + size); ctx.stroke();
      ellipse(ctx, sx, sy, .7, .7, rgba(k % 2 ? WHITE : GREEN, a));
    }
  }
  ctx.restore();
}
