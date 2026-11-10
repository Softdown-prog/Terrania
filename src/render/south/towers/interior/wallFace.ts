import { ellipse, mix, rgba, shade, softShadow } from "../../../draw.ts";
import type { TowerInteriorStyle } from "./types.ts";

/**
 * Face de tijolo na base de uma parede de torre (ADR 0021), peça física auditada como `prop`.
 * Faz o papel de `drawCaveWallFace` na planta de torre: duas fiadas de tijolo com juntas deslocadas,
 * luz em cima à esquerda, rachadura e lascas. Origem em (sx, sy) = meio da borda da parede; a
 * orientação leste gira o mesmo desenho. Passabilidade não muda.
 */
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

export function drawTowerWallFace(ctx: CanvasRenderingContext2D, style: TowerInteriorStyle,
  sx: number, sy: number, side: "south" | "east" = "south", variation = .5): void {
  const b = style.brick;
  const v = Math.max(0, Math.min(1, Number.isFinite(variation) ? variation : .5));
  const outline = (): void => {
    const chip = (v - .5) * 2.4;
    ctx.beginPath();
    ctx.moveTo(-16.5, -5);
    ctx.quadraticCurveTo(-11, -9 + chip, -6, -8);
    ctx.quadraticCurveTo(0, -9.5 - chip, 6, -8.4);
    ctx.quadraticCurveTo(12, -8 + chip, 16.5, -5);
    ctx.lineTo(16.5, 2.4);
    ctx.quadraticCurveTo(0, 3.4, -16.5, 2.4);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(sx, sy);
  if (side === "east") ctx.rotate(-Math.PI / 2);
  // 1. Contato: a sombra da parede cai no piso.
  softShadow(ctx, 0, 3, 19, 3.6, .3);
  // 2-3. Silhueta com topo lascado e volume em três tons, luz de cima à esquerda.
  const body = ctx.createLinearGradient(-14, -9, 12, 3);
  body.addColorStop(0, mix(b.light, GLINT, .14));
  body.addColorStop(.42, b.base);
  body.addColorStop(1, b.dark);
  outline();
  ctx.fillStyle = body;
  ctx.fill();
  // 4. Material recortado pela silhueta: duas fiadas, juntas deslocadas entre elas.
  ctx.save();
  outline();
  ctx.clip();
  ctx.strokeStyle = rgba(b.mortar, .9);
  ctx.lineWidth = 1;
  for (const y of [-4.6, -.2]) { ctx.beginPath(); ctx.moveTo(-17, y); ctx.lineTo(17, y); ctx.stroke(); }
  for (const [y0, y1, shift] of [[-9, -4.6, 0], [-4.6, -.2, 5.5], [-.2, 3, 1]] as const)
    for (let x = -14 + shift + v * 2; x < 17; x += 11) {
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    }
  for (let i = 0; i < 4; i++) {
    const x = -12 + i * 8 + v * 3, y = i % 2 ? -2.4 : -6.8;
    ellipse(ctx, x, y, 2.1, 1, rgba(mix(b.light, GLINT, .3), .34 - i * .04));
  }
  ctx.restore();
  // 5. Rachadura em três passadas (escura, média, clara), seguindo a junta.
  for (const [width, color] of [[2.4, OUTLINE], [1.4, b.dark], [.55, b.light]] as const) {
    ctx.lineWidth = width; ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(-9 + v * 6, -8);
    ctx.quadraticCurveTo(-7 + v * 6, -4.6, -9.5 + v * 6, -2.4);
    ctx.quadraticCurveTo(-11 + v * 6, -.6, -8.4 + v * 6, 1.6);
    ctx.stroke();
  }
  // 6. Oclusão: a base escurece onde encontra o piso.
  const occ = ctx.createLinearGradient(0, -2, 0, 3.4);
  occ.addColorStop(0, rgba(OUTLINE, 0));
  occ.addColorStop(1, rgba(OUTLINE, .5));
  ctx.fillStyle = occ;
  ctx.fillRect(-16.5, -2, 33, 5.4);
  // 7. Contorno único.
  outline();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
  // 8. Lascas caídas no pé da parede.
  ellipse(ctx, -11 + v * 5, 3.6, 2.2, 1, shade(b.dark, -.1));
  ellipse(ctx, 8 - v * 4, 4, 1.7, .8, b.base);
  // 9. Brilho do topo, por último.
  ctx.strokeStyle = rgba(GLINT, .55); ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(-13, -7.6); ctx.quadraticCurveTo(-6, -9.2, 0, -8.6); ctx.stroke();
  ctx.restore();
}
