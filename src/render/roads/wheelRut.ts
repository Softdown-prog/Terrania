import { ellipse, mix, rgba, shade, softShadow } from "../draw.ts";
import { hash2 } from "../../world/random.ts";
import { ROAD_GLINT, ROAD_OUTLINE, ROAD_PALETTE, clampVariation } from "./surface.ts";
import type { WheelRutPiece } from "./types.ts";

/**
 * Marca de roda que cruza um tile (ADR 0034): sulco com sombra, leito batido no fundo, lábio claro do lado da
 * luz (noroeste) e lábio escuro do outro, pedrinhas no sulco e reflexo. Corre na horizontal ou na vertical
 * conforme a estrada. A largura da marca acompanha a intensidade na entrada e na saída, então ela some e volta
 * sem corte no limite do tile, e o desvio lateral é o mesmo nos dois lados de cada emenda.
 */
export function drawWheelRut(ctx: CanvasRenderingContext2D, piece: WheelRutPiece, x: number, y: number): void {
  const p = ROAD_PALETTE[piece.surface];
  const v = clampVariation(piece.variation);
  const a = piece.across + piece.shiftA, b = piece.across + piece.shiftB, mid = (a + b) / 2 + (v - 0.5) * 1.1;
  const fadeA = Math.max(0, Math.min(1, piece.fadeA)), fadeB = Math.max(0, Math.min(1, piece.fadeB));
  const half = 3.3; // meia largura do sulco com intensidade total (cerca de 6,5 px)
  const wA = half * fadeA, wB = half * fadeB, wMid = (wA + wB) / 2;
  const sub = (k: number): number => hash2(Math.floor(v * 65536), k, 977);
  // Borda de um lado do sulco: curva de (u = -1, a) a (u = 33, b) que passa por `mid` no meio do tile.
  const edge = (sign: number, scale: number): void => {
    ctx.quadraticCurveTo(16, 2 * mid - (a + b) / 2 + sign * wMid * scale, 33, b + sign * wB * scale);
  };
  const ribbon = (scale: number): void => {
    ctx.beginPath();
    ctx.moveTo(-1, a - wA * scale);
    edge(-1, scale);
    ctx.lineTo(33, b + wB * scale);
    ctx.quadraticCurveTo(16, 2 * mid - (a + b) / 2 + wMid * scale, -1, a + wA * scale);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(x, y);
  // Na estrada vertical a marca corre em y: troca os eixos (a luz de noroeste continua do lado menor).
  if (piece.axis === "y") ctx.transform(0, 1, 1, 0, 0, 0);
  // 1. Sombra do sulco, macia: escura no meio e sem borda dura.
  const groove = ctx.createLinearGradient(0, mid - half * 1.4, 0, mid + half * 1.4);
  groove.addColorStop(0, rgba(p.groove, 0));
  groove.addColorStop(0.5, rgba(p.groove, 0.36));
  groove.addColorStop(1, rgba(p.groove, 0));
  ribbon(1.35);
  ctx.fillStyle = groove;
  ctx.fill();
  // 2. Leito batido no fundo do sulco: mais claro, compactado pela roda.
  ribbon(0.42);
  ctx.fillStyle = rgba(mix(p.bed, p.lip, 0.3), 0.55);
  ctx.fill();
  // 3. Lábio claro do lado da luz (noroeste) e lábio escuro do lado oposto.
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-1, a - wA * 1.05);
  edge(-1, 1.05);
  ctx.strokeStyle = rgba(p.lip, 0.72);
  ctx.lineWidth = 1.15;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-1, a + wA * 1.1);
  edge(1, 1.1);
  ctx.strokeStyle = rgba(p.lipShade, 0.5);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // 4. Fio escuro no fundo do sulco, só o suficiente para marcar a profundidade.
  ctx.beginPath();
  ctx.moveTo(-1, a);
  ctx.quadraticCurveTo(16, 2 * mid - (a + b) / 2, 33, b);
  ctx.strokeStyle = rgba(ROAD_OUTLINE, 0.26 * Math.max(fadeA, fadeB));
  ctx.lineWidth = 0.85;
  ctx.stroke();
  // 5. Pedrinhas no sulco, com sombra, só onde a marca está forte.
  if (wMid > half * 0.45) {
    for (let i = 0; i < 2; i++) {
      const u = 5 + sub(1 + i) * 22, off = (sub(3 + i) - 0.5) * wMid * 1.1;
      const py = mid + off, size = 0.9 + sub(5 + i) * 1.1;
      ellipse(ctx, u + 0.5, py + 0.7, size * 1.1, size * 0.6, rgba(shade(p.groove, -0.1), 0.38));
      ellipse(ctx, u, py, size, size * 0.72, i ? p.stoneLight : p.stoneDark);
      ellipse(ctx, u - size * 0.3, py - size * 0.25, size * 0.35, size * 0.2, rgba(ROAD_GLINT, 0.55));
    }
  }
  // 6. Poeira fina espalhada pelo lábio e reflexo claro.
  for (let i = 0; i < 3; i++)
    ellipse(ctx, 3 + sub(10 + i) * 26, mid + (sub(13 + i) - 0.5) * wMid * 2.6, 0.9, 0.5, rgba(p.dust, 0.45));
  softShadow(ctx, 16, mid + wMid * 0.5, 14, Math.max(0.5, wMid * 0.5), 0.1);
  ctx.strokeStyle = rgba(ROAD_GLINT, 0.4 * Math.max(fadeA, fadeB));
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(4 + v * 6, a - wA * 1.1);
  ctx.quadraticCurveTo(10 + v * 6, mid - wMid * 1.2, 16 + v * 6, mid - wMid * 1.15);
  ctx.stroke();
  ctx.restore();
}
