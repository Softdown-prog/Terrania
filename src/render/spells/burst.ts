import { STAVES, type StaffId } from "../../engine/character/Staves.ts";
import { ellipse, mix, rgba } from "../draw.ts";

const FLY_DIRECTIONS = 8;

/**
 * O estouro da magia ao acertar (ADR 0070), centrado no ponto do impacto: clarão, anel que se abre, raios e faíscas que caem.
 * `progress` (0..1) é a idade do estouro; `kill` faz o estouro maior, para a magia que derrota o alvo. As faíscas saem em direções fixas
 * (sem sorteio) para a cena ser reproduzível em teste e captura.
 */
export function drawSpellBurst(ctx: CanvasRenderingContext2D, staff: StaffId, progress: number, kill = false): void {
  const gem = STAVES[staff].visual.gem;
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)), fade = 1 - p, open = 1 - fade * fade;
  const size = kill ? 1.6 : 1;
  const deep = mix(gem.dark, "#000000", 0.5), lit = mix(gem.mid, gem.light, 0.5), bright = mix(gem.light, "#ffffff", 0.6), shade = mix(gem.dark, gem.mid, 0.5);
  const ember = mix(gem.glow, gem.dark, 0.4), haze = mix(gem.glow, "#ffffff", 0.35), pale = mix(gem.mid, "#ffffff", 0.35);
  // clarão
  const flash = ctx.createRadialGradient(0, 0, 0.5, 0, 0, (7 + 15 * open) * size);
  flash.addColorStop(0, rgba("#ffffff", 0.95 * fade)); flash.addColorStop(0.2, rgba(bright, 0.85 * fade)); flash.addColorStop(0.4, rgba(gem.light, 0.7 * fade)); flash.addColorStop(0.7, rgba(haze, 0.3 * fade)); flash.addColorStop(1, rgba(gem.glow, 0));
  ctx.fillStyle = flash; ctx.beginPath(); ctx.arc(0, 0, (7 + 15 * open) * size, 0, Math.PI * 2); ctx.fill();
  // sombra do estouro, para o clarão não sumir no chão claro
  ctx.fillStyle = rgba(deep, 0.16 * fade); ctx.beginPath(); ctx.arc(0, 1.5, (5 + 11 * open) * size, 0, Math.PI * 2); ctx.fill();
  // anel
  ctx.strokeStyle = rgba(gem.light, 0.9 * fade); ctx.lineWidth = 0.7 + 2.8 * fade; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, 0, (3 + 15 * open) * size, 0, Math.PI * 2); ctx.stroke();
  if (kill) { ctx.strokeStyle = rgba(gem.glow, 0.6 * fade); ctx.lineWidth = 0.6 + 1.6 * fade; ctx.beginPath(); ctx.arc(0, 0, 8 + 26 * open, 0, Math.PI * 2); ctx.stroke(); }
  // brasa: um segundo anel mais fraco e mais aberto, que dura um pouco mais
  ctx.strokeStyle = rgba(ember, 0.55 * fade); ctx.lineWidth = 0.5 + 1.4 * fade;
  ctx.beginPath(); ctx.arc(0, 0, (5 + 20 * open) * size, 0, Math.PI * 2); ctx.stroke();
  // raios
  const rays = kill ? 8 : 6;
  ctx.strokeStyle = rgba(lit, 0.9 * fade); ctx.lineWidth = 1.2 * fade + 0.4;
  ctx.beginPath();
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + 0.3, from = (2 + 5 * open) * size, to = (6 + 12 * open) * size;
    ctx.moveTo(Math.cos(a) * from, Math.sin(a) * from); ctx.lineTo(Math.cos(a) * to, Math.sin(a) * to);
  }
  ctx.stroke();
  // faíscas: saem em direções fixas e caem um pouco
  for (let i = 0; i < FLY_DIRECTIONS; i++) {
    const a = (i / FLY_DIRECTIONS) * Math.PI * 2 + 0.7 * (i % 2), reach = (10 + (i % 3) * 6 + 14 * open) * size;
    ellipse(ctx, Math.cos(a) * reach, Math.sin(a) * reach * 0.8 + 9 * p * p, 1.4 * fade + 0.3, 1.4 * fade + 0.3, rgba(i % 4 === 0 ? bright : i % 4 === 1 ? gem.light : i % 4 === 2 ? pale : shade, 0.9 * fade));
  }
  ctx.lineCap = "butt";
}
