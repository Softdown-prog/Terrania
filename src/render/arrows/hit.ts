import { ellipse, rgba } from "../draw.ts";
import { REED_ARROW_LOOK } from "./arrow.ts";

const SPLINTERS = 7;
/** Terra levantada pelo impacto: sombra, torrão escuro e poeira. */
const EARTH = { shadow: "#0b1c17", clod: "#4a3d22", dust: "#9c8a5c" } as const;

/**
 * O impacto da flecha ao acertar (ADR 0112), centrado no ponto atingido: um sopro de poeira, um anel curto e lascas que saltam. Menor
 * e mais seco que o estouro da magia. `progress` (0..1) é a idade do impacto; `kill` aumenta tudo, para o tiro que derruba o alvo. As
 * lascas saem em direções fixas (sem sorteio), para a cena ser reproduzível.
 */
export function drawArrowHit(ctx: CanvasRenderingContext2D, progress: number, kill = false): void {
  const L = REED_ARROW_LOOK, p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)), fade = 1 - p, open = 1 - fade * fade, size = kill ? 1.5 : 1;
  // sombra do impacto no chão, para o sopro claro não sumir na grama
  ellipse(ctx, 0, 4, (6 + 7 * open) * size, (2.4 + 2.4 * open) * size, rgba(EARTH.shadow, 0.28 * fade));
  const puff = ctx.createRadialGradient(0, 0, 0.5, 0, 0, (5 + 9 * open) * size);
  puff.addColorStop(0, rgba("#ffffff", 0.85 * fade)); puff.addColorStop(0.45, rgba(L.shaftLight, 0.55 * fade)); puff.addColorStop(1, rgba(L.shaft, 0));
  ctx.fillStyle = puff; ctx.beginPath(); ctx.arc(0, 0, (5 + 9 * open) * size, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(L.shaftLight, 0.8 * fade); ctx.lineWidth = 0.6 + 1.8 * fade; ctx.beginPath(); ctx.arc(0, 0, (2.5 + 9 * open) * size, 0, Math.PI * 2); ctx.stroke();
  ctx.lineCap = "round"; ctx.strokeStyle = rgba(L.shaft, 0.95 * fade); ctx.lineWidth = 1 * fade + 0.3;
  ctx.beginPath();
  for (let i = 0; i < SPLINTERS; i++) {
    const a = (i / SPLINTERS) * Math.PI * 2 + 0.4, from = (2 + 3 * open) * size, to = (5 + 9 * open) * size;
    ctx.moveTo(Math.cos(a) * from, Math.sin(a) * from); ctx.lineTo(Math.cos(a) * to, Math.sin(a) * to);
  }
  ctx.stroke(); ctx.lineCap = "butt";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.9 * (i % 2), reach = (7 + (i % 3) * 4 + 9 * open) * size;
    ellipse(ctx, Math.cos(a) * reach, Math.sin(a) * reach * 0.8 + 6 * p * p, 1.2 * fade + 0.3, 1.2 * fade + 0.3, rgba(i % 2 ? L.shaftLight : L.head, 0.9 * fade));
  }
  // torrões e lascas de pedra da ponta: caem mais devagar que as faíscas
  const chips = [EARTH.clod, L.headDark, EARTH.dust, L.binding, L.headLight, L.featherDark];
  for (let i = 0; i < chips.length; i++) {
    const a = (i / chips.length) * Math.PI * 2 + 0.35, reach = (4 + (i % 2) * 3 + 8 * open) * size;
    ellipse(ctx, Math.cos(a) * reach, Math.sin(a) * reach * 0.7 + 4 * p, 1.5 * fade + 0.2, 1.1 * fade + 0.2, rgba(chips[i]!, 0.9 * fade), a);
  }
}
