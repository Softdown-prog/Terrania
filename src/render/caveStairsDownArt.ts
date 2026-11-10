import { ellipse, mix, rgba, shade, softShadow, TAU } from "./draw.ts";
import type { CaveTheme } from "../world/caves.ts";
import { CAVE_PALETTE } from "./caveDetails.ts";

/**
 * Escada que DESCE ao andar de baixo (ADR 0018). Arte pura, peça física auditada como `prop`.
 * Não se confunde com a escada de saída (`drawCaveExitStair`, que sobe): aqui o poço é fundo e
 * escuro, os degraus estreitam e escurecem ao descer, e um lampião de ferro marca o lugar.
 * Origem em (sx, sy) = centro da boca. Luz da esquerda e de cima.
 */
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";
const IRON = "#3b3f46";

export function drawCaveDownStair(ctx: CanvasRenderingContext2D, theme: CaveTheme, sx: number, sy: number): void {
  const p = CAVE_PALETTE[theme];
  ctx.save();
  ctx.translate(sx, sy);
  // 1. Sombra de contato no chão, antes de qualquer forma.
  softShadow(ctx, 1, 9, 30, 11, .5);
  // 2-3. Aro de pedra (silhueta oval) com volume: luz em cima à esquerda, sombra embaixo à direita.
  const rim = ctx.createLinearGradient(-26, -15, 26, 14);
  rim.addColorStop(0, p.light);
  rim.addColorStop(.38, p.rim);
  rim.addColorStop(1, shade(p.wall, -.38));
  ellipse(ctx, 0, 0, 28, 16.5, rim);
  // O poço: quase preto no fundo, só um pouco mais claro na borda de cima.
  const pit = ctx.createLinearGradient(0, -10, 0, 12);
  pit.addColorStop(0, shade(p.wall, -.42));
  pit.addColorStop(.55, rgba("#0b1519", .96));
  pit.addColorStop(1, "#05090c");
  ellipse(ctx, 0, 1, 22.5, 11.5, OUTLINE);
  ellipse(ctx, 0, 1.4, 20.5, 9.6, pit);
  // 4. Os degraus, recortados no poço: descem, estreitam e escurecem.
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 1.4, 20.5, 9.6, 0, 0, TAU); ctx.clip();
  for (let step = 0; step < 5; step++) {
    const y = -8 + step * 3.3, half = 16 - step * 2.6, dark = step * .13;
    ctx.fillStyle = rgba(OUTLINE, .85);
    ctx.fillRect(-half - .6, y, half * 2 + 1.2, 3.2);
    ctx.fillStyle = shade(mix(p.rim, p.light, .3), -dark - .08);
    ctx.fillRect(-half, y, half * 2, 2.1);
    // 5. Fio de luz na quina de cada degrau, que some junto com a luz.
    ctx.fillStyle = rgba(GLINT, Math.max(.05, .42 - step * .09));
    ctx.fillRect(-half, y, half * 2, .7);
  }
  // 6. Oclusão: a escuridão do fundo sobe pelas bordas.
  const fall = ctx.createRadialGradient(0, 7, 2, 0, 5, 19);
  fall.addColorStop(0, rgba("#05090c", .75));
  fall.addColorStop(1, rgba("#05090c", 0));
  ctx.fillStyle = fall;
  ctx.fillRect(-24, -4, 48, 20);
  ctx.restore();
  // 7. Contorno único do aro.
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 28, 16.5, 0, 0, TAU); ctx.stroke();
  // 8. Lascas de pedra no aro e o lampião de ferro, que dá leitura de "há algo aqui embaixo".
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 1.05 + i * 0.36, rx = 25 + (i % 2) * 1.4, ry = 14.2 + (i % 2) * .8;
    ellipse(ctx, Math.cos(a) * rx, Math.sin(a) * ry, 2.3, 1.3, i % 2 ? p.rim : shade(p.light, .12), a);
  }
  const lx = 21, ly = -10;
  ctx.strokeStyle = IRON; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(lx, ly + 12); ctx.quadraticCurveTo(lx - 1, ly + 3, lx + .5, ly - 4); ctx.stroke();
  const glow = ctx.createRadialGradient(lx + .5, ly - 7, 1, lx + .5, ly - 7, 13);
  glow.addColorStop(0, rgba(p.accent, .5)); glow.addColorStop(1, rgba(p.accent, 0));
  ctx.fillStyle = glow; ctx.fillRect(lx - 14, ly - 21, 28, 28);
  ctx.fillStyle = IRON; ctx.fillRect(lx - 2.6, ly - 11, 5.2, 7);
  ctx.fillStyle = rgba(p.accent, .95); ctx.fillRect(lx - 1.6, ly - 10, 3.2, 5);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9; ctx.strokeRect(lx - 2.6, ly - 11, 5.2, 7);
  // 9. Brilho especular por último, do lado da luz.
  ctx.strokeStyle = rgba(GLINT, .8); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(-2, -1.5, 24, 12.6, 0, Math.PI, TAU * 1.9); ctx.stroke();
  ellipse(ctx, -15, -8.5, 3.4, 1.1, rgba(GLINT, .62));
  ctx.restore();
}
