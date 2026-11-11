import { ellipse, mix, rgba, shade, softShadow } from "../draw.ts";
import { hash2 } from "../../world/random.ts";
import { ROAD_GLINT, ROAD_OUTLINE, ROAD_PALETTE, clampVariation } from "./surface.ts";
import type { RoadStonesPiece } from "./types.ts";

/**
 * Pedras e cascalho cravados no leito da estrada (ADR 0034): de uma a três pedras de tamanhos diferentes,
 * cada uma com sombra no chão, volume com luz de noroeste, uma rachadura, contorno e reflexo, e um punhado
 * de pedrisco solto em volta. Não muda a colisão: é só o acabamento do chão.
 */
export function drawRoadStones(ctx: CanvasRenderingContext2D, piece: RoadStonesPiece, x: number, y: number): void {
  const p = ROAD_PALETTE[piece.surface];
  const v = clampVariation(piece.variation);
  const sub = (k: number): number => hash2(Math.floor(v * 65536), k, 983);
  ctx.save();
  // A peça fica na posição dela dentro do tile (`piece.x`, `piece.y`), contada a partir do canto (`x`, `y`) do tile.
  ctx.translate(x + piece.x, y + piece.y);
  // Pedrisco solto em volta: poucos pontos, claros e escuros.
  for (let i = 0; i < 5; i++) {
    const gx = (sub(1 + i) - 0.5) * 14, gy = (sub(6 + i) - 0.5) * 9;
    ellipse(ctx, gx + 0.4, gy + 0.5, 0.9, 0.55, rgba(shade(p.groove, -0.05), 0.3));
    ellipse(ctx, gx, gy, 0.75, 0.55, i % 2 ? p.stoneLight : p.dust);
  }
  const count = 1 + Math.floor(sub(12) * 2.99);
  for (let i = 0; i < count; i++) {
    const sx = i === 0 ? 0 : (sub(13 + i) - 0.5) * 11, sy = i === 0 ? 0 : (sub(16 + i) - 0.5) * 6;
    const rx = (i === 0 ? 3.1 : 1.8) + sub(19 + i) * 1.3, ry = rx * (0.68 + sub(22 + i) * 0.12);
    // Sombra projetada para sudeste e oclusão no contato.
    softShadow(ctx, sx + rx * 0.35, sy + ry * 0.55, rx * 1.5, ry * 0.8, 0.3);
    ellipse(ctx, sx + 0.3, sy + ry * 0.45, rx * 0.95, ry * 0.4, rgba(ROAD_OUTLINE, 0.32));
    // Corpo com luz de noroeste: claro em cima à esquerda, escuro embaixo à direita.
    const body = ctx.createLinearGradient(sx - rx, sy - ry, sx + rx, sy + ry);
    body.addColorStop(0, mix(p.stoneLight, ROAD_GLINT, 0.25));
    body.addColorStop(0.5, i % 2 ? p.stoneDark : mix(p.stoneDark, p.stoneLight, 0.35));
    body.addColorStop(1, shade(p.stoneDark, -0.3));
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, ry, (sub(25 + i) - 0.5) * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    // Rachadura curta e contorno fino.
    ctx.strokeStyle = rgba(shade(p.stoneDark, -0.4), 0.6);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(sx - rx * 0.1, sy - ry * 0.7);
    ctx.quadraticCurveTo(sx + rx * 0.25, sy - ry * 0.1, sx + rx * 0.05, sy + ry * 0.55);
    ctx.stroke();
    ctx.strokeStyle = rgba(ROAD_OUTLINE, 0.55);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, ry, (sub(25 + i) - 0.5) * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    // Reflexo no quadrante superior esquerdo.
    ellipse(ctx, sx - rx * 0.38, sy - ry * 0.4, rx * 0.28, ry * 0.18, rgba(ROAD_GLINT, 0.7));
  }
  ctx.restore();
}
