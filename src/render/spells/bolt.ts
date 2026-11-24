import { STAVES, type StaffId } from "../../engine/character/Staves.ts";
import { ellipse, mix, rgba } from "../draw.ts";

/**
 * O projétil da magia do cajado (ADR 0070), no referencial da cabeça do projétil: a origem é o centro dele e ele voa para +x (quem
 * desenha gira e posiciona). As cores vêm da gema da ficha do cajado, então cada cajado novo já ganha a cor dele.
 * `progress` (0..1) é quanto do voo já foi: a cauda se estica no começo e o brilho se firma; `time` faz o centro tremer de leve.
 */
export function drawSpellBolt(ctx: CanvasRenderingContext2D, staff: StaffId, progress: number, time = 0): void {
  const gem = STAVES[staff].visual.gem;
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const tail = 10 + 20 * Math.min(1, p * 3);
  const shimmer = 0.88 + 0.12 * Math.sin(time * 40);
  // a rampa da cabeça: sete tons, do contorno quase preto ao branco quente, todos puxados da gema do cajado
  const deep = mix(gem.dark, "#000000", 0.55), shade = mix(gem.dark, gem.mid, 0.5), lit = mix(gem.mid, gem.light, 0.5), bright = mix(gem.light, "#ffffff", 0.6);
  const ember = mix(gem.glow, gem.dark, 0.4), haze = mix(gem.glow, "#ffffff", 0.35);
  // cauda de cometa: uma gota afinada atrás da cabeça, de cor viva na ponta e sumindo no fim
  const streak = ctx.createLinearGradient(0, 0, -tail, 0);
  streak.addColorStop(0, rgba(gem.light, 0.95)); streak.addColorStop(0.35, rgba(gem.mid, 0.7)); streak.addColorStop(0.7, rgba(ember, 0.4)); streak.addColorStop(1, rgba(gem.glow, 0));
  ctx.fillStyle = streak;
  ctx.beginPath();
  ctx.moveTo(0, -3.4);
  ctx.quadraticCurveTo(-tail * 0.5, -2.6, -tail, -0.4);
  ctx.quadraticCurveTo(-tail * 0.5, 2.6, 0, 3.4);
  ctx.closePath(); ctx.fill();
  // fio de luz no meio da cauda
  ctx.strokeStyle = rgba(bright, 0.8); ctx.lineWidth = 0.9; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(-tail * 0.7, 0); ctx.stroke();
  // faíscas soltas pelo caminho
  for (let i = 0; i < 3; i++) {
    const back = 6 + i * (tail * 0.28), off = Math.sin(time * 23 + i * 2.1) * (2.4 + i * 0.5);
    ellipse(ctx, -back, off, 1.1 - i * 0.2, 1.1 - i * 0.2, rgba(i % 2 ? gem.light : bright, 0.85 - i * 0.18));
  }
  // auréola
  const halo = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 11);
  halo.addColorStop(0, rgba(haze, 0.85 * shimmer)); halo.addColorStop(0.5, rgba(gem.glow, 0.4 * shimmer)); halo.addColorStop(1, rgba(gem.glow, 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  // cabeça: contorno escuro, corpo da cor da gema e núcleo claro
  ellipse(ctx, 0, 0, 4.6, 4.2, rgba(deep, 0.9));
  ellipse(ctx, 0, 0, 3.8, 3.4, gem.dark);
  ellipse(ctx, 0.1, 0, 3.4, 3.1, shade);
  ellipse(ctx, 0.2, -0.1, 3, 2.7, gem.mid);
  ellipse(ctx, 0.35, -0.2, 2.4, 2.2, lit);
  ellipse(ctx, 0.5, -0.3, 1.9, 1.7, gem.light);
  ellipse(ctx, 0.8, -0.5, 1.4, 1.2, bright);
  ellipse(ctx, 1, -0.7, 0.9, 0.8, "#ffffff");
  // brilho em cruz
  ctx.strokeStyle = rgba("#ffffff", 0.55 * shimmer); ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
  ctx.lineCap = "butt";
}
