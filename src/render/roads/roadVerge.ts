import { ellipse, mix, rgba, shade } from "../draw.ts";
import { hash2 } from "../../world/random.ts";
import { ROAD_GLINT, ROAD_OUTLINE, ROAD_PALETTE, clampVariation } from "./surface.ts";
import type { RoadVergePiece } from "./types.ts";

const GRASS = ["#3d6a45", "#4f7d44", "#78a257"] as const;

/**
 * Transição da estrada para o que a margeia, num lado do tile (ADR 0034). Com capim: lábio de terra solta,
 * folhas inclinadas sobre a borda, tufos e pedrinhas. Com areia: um lençol de areia que escorre sobre o leito,
 * marcas de vento, grãos e uma linha de sombra. A peça é desenhada para o lado norte e girada para o lado pedido.
 */
export function drawRoadVerge(ctx: CanvasRenderingContext2D, piece: RoadVergePiece, x: number, y: number): void {
  const p = ROAD_PALETTE[piece.edge === "sand" ? "sand" : "earth"];
  const v = clampVariation(piece.variation);
  const sub = (k: number): number => hash2(Math.floor(v * 65536), k, 991);
  ctx.save();
  ctx.translate(x + 16, y + 16);
  ctx.rotate(piece.side * Math.PI / 2);
  // Borda irregular que entra no leito, a mesma para o preenchimento e a linha de contorno.
  const reach = piece.edge === "sand" ? 9 : 7;
  // A margem irregular, só ela: o preenchimento fecha o caminho por cima, o contorno não passa pelas emendas do tile.
  const boundary = (): void => {
    ctx.lineTo(16.5, -16 + reach * (0.6 + sub(1) * 0.8));
    ctx.quadraticCurveTo(8, -16 + reach * (0.7 + sub(2) * 0.9), 1, -16 + reach * (0.5 + sub(3) * 0.8));
    ctx.quadraticCurveTo(-7, -16 + reach * (0.8 + sub(4) * 0.7), -16.5, -16 + reach * (0.6 + sub(5) * 0.8));
  };
  const lip = (): void => {
    ctx.beginPath();
    ctx.moveTo(-16.5, -16.5);
    ctx.lineTo(16.5, -16.5);
    boundary();
    ctx.closePath();
  };
  const lipLine = (): void => {
    ctx.beginPath();
    ctx.moveTo(16.5, -16 + reach * (0.6 + sub(1) * 0.8));
    ctx.quadraticCurveTo(8, -16 + reach * (0.7 + sub(2) * 0.9), 1, -16 + reach * (0.5 + sub(3) * 0.8));
    ctx.quadraticCurveTo(-7, -16 + reach * (0.8 + sub(4) * 0.7), -16.5, -16 + reach * (0.6 + sub(5) * 0.8));
  };
  if (piece.edge === "grass") {
    // 1. Lábio de terra solta, mais escuro junto ao capim e sumindo para dentro da estrada.
    const soil = ctx.createLinearGradient(0, -16, 0, -16 + reach + 3);
    soil.addColorStop(0, rgba(p.lipShade, 0.5));
    soil.addColorStop(0.55, rgba(p.groove, 0.2));
    soil.addColorStop(1, rgba(p.groove, 0));
    lip();
    ctx.fillStyle = soil;
    ctx.fill();
    // 2. Folhas de capim que avançam sobre a borda, em três tons.
    ctx.lineCap = "round";
    for (let i = 0; i < 8; i++) {
      const bx = -14 + i * 4 + sub(10 + i) * 2.5, len = 3.4 + sub(20 + i) * 4.6, lean = (sub(30 + i) - 0.5) * 5;
      ctx.strokeStyle = GRASS[i % 3]!;
      ctx.lineWidth = 1.15 + (i % 2) * 0.3;
      ctx.beginPath();
      ctx.moveTo(bx, -16.2);
      ctx.quadraticCurveTo(bx + lean * 0.4, -16.2 + len * 0.55, bx + lean, -16.2 + len);
      ctx.stroke();
    }
    // 3. Tufo escuro na raiz e pedrinhas no lábio, com sombra.
    ellipse(ctx, -4 + sub(40) * 9, -15.2, 4.2, 1.5, rgba(shade(GRASS[0], -0.3), 0.55));
    for (let i = 0; i < 2; i++) {
      const sx = -10 + sub(41 + i) * 20, sy = -12 + sub(43 + i) * 3;
      ellipse(ctx, sx + 0.4, sy + 0.6, 1.5, 0.8, rgba(p.groove, 0.34));
      ellipse(ctx, sx, sy, 1.3, 0.9, i ? p.stoneLight : p.stoneDark);
    }
    // 4. Contorno do lábio e pontas de folha com reflexo.
    lipLine();
    ctx.strokeStyle = rgba(ROAD_OUTLINE, 0.26);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ellipse(ctx, -9 + sub(45) * 6, -13.4, 0.8, 0.5, rgba(ROAD_GLINT, 0.5));
  } else {
    // 1. Lençol de areia que escorre sobre o leito, claro e sumindo para dentro da estrada.
    const spill = ctx.createLinearGradient(0, -16, 0, -16 + reach + 2);
    spill.addColorStop(0, rgba(mix(p.lip, p.bed, 0.3), 0.85));
    spill.addColorStop(0.6, rgba(p.bed, 0.4));
    spill.addColorStop(1, rgba(p.bed, 0));
    lip();
    ctx.fillStyle = spill;
    ctx.fill();
    // 2. Marcas de vento curvas na areia solta.
    ctx.lineCap = "round";
    for (let i = 0; i < 2; i++) {
      const wy = -15 + i * 3.4 + sub(10 + i) * 1.5, wx = -12 + sub(12 + i) * 8;
      ctx.strokeStyle = rgba(mix(p.lip, ROAD_GLINT, 0.3), 0.5);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 6, wy - 1.6, wx + 13, wy + 0.2);
      ctx.stroke();
    }
    // 3. Grãos soltos sobre o leito, claros e escuros.
    for (let i = 0; i < 6; i++) {
      const gx = -14 + sub(20 + i) * 28, gy = -14 + sub(26 + i) * (reach + 2);
      ellipse(ctx, gx + 0.3, gy + 0.4, 0.9, 0.55, rgba(p.groove, 0.28));
      ellipse(ctx, gx, gy, 0.8, 0.55, i % 2 ? p.stoneLight : p.dust);
    }
    // 3b. Palha seca espalhada na areia (sempre) e, em alguns tiles, um tufo que a areia não cobriu.
    for (let i = 0; i < 3; i++) {
      const sx = -12 + sub(50 + i) * 24, sy = -13 + sub(53 + i) * (reach - 2);
      ctx.strokeStyle = i % 2 ? "#b8a561" : "#8f8049";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (sub(56 + i) - 0.5) * 4.5, sy + (sub(59 + i) - 0.5) * 1.8);
      ctx.stroke();
    }
    if (sub(62) > 0.55) {
      const tx = -9 + sub(63) * 18;
      ellipse(ctx, tx, -15.3, 2.2, 0.8, rgba(mix(p.groove, ROAD_OUTLINE, 0.4), 0.45));
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = i % 2 ? "#b8a561" : "#8f8049";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(tx + (i - 1) * 1.2, -15.6);
        ctx.quadraticCurveTo(tx + (i - 1) * 2, -13.4, tx + (i - 1) * 3 + (sub(64 + i) - 0.5) * 1.6, -11.8 + sub(67 + i) * 1.4);
        ctx.stroke();
      }
    }
    // 4. Linha de sombra sob o lençol, onde a areia termina, e contorno fino.
    ctx.strokeStyle = rgba(p.lipShade, 0.38);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-16, -16 + reach * 0.72);
    ctx.quadraticCurveTo(0, -16 + reach * 0.95, 16, -16 + reach * 0.7);
    ctx.stroke();
    lipLine();
    ctx.strokeStyle = rgba(ROAD_OUTLINE, 0.2);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ellipse(ctx, -6 + sub(40) * 12, -14.2, 1.1, 0.5, rgba(ROAD_GLINT, 0.6));
  }
  ctx.restore();
}
