import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BONE, BRONZE, CLAY, GLINT, OUTLINE, POISON, WINE, WOOD } from "../buildings/palette.ts";

/**
 * Barraca de feira (ADR 0050): balcão de madeira com as frentes de tábua, toldo listrado e as mercadorias em cima (frutas, potes
 * e ossos de um lado, um fardo de couro do outro), um caixote ao lado e a areia que o vento trouxe.
 */
export function paintCityStall(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b;
  b.shadow(60, 44);
  // balcão: tampo, frente de tábuas e pés
  c.fillStyle = b.gradient(-27, 27, WOOD); c.fillRect(-27, -17, 54, 17);
  for (let x = -27; x < 27; x += 9) b.line([[x + 9, -17], [x + 9, 0]], rgba("#1e1410", 0.65), 0.9);
  c.fillStyle = BRONZE.base; c.fillRect(-28, -19, 56, 4); c.fillStyle = rgba(GLINT, 0.5); c.fillRect(-28, -19, 56, 0.9);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-27, -17, 54, 17); c.strokeRect(-28, -19, 56, 4);
  // mercadorias sobre o tampo: frutas, potes de barro, uma caveira de enfeite e feixes de ossos
  for (let i = 0; i < 5; i++) {
    const x = -21 + i * 10, ramp = i % 2 ? POISON : WINE;
    c.fillStyle = b.gradient(x - 4, x + 4, ramp); c.beginPath(); c.ellipse(x, -23, 4, 3.4, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
    ellipse(c, x - 1.2, -24.4, 1.2, 0.8, rgba(GLINT, 0.6));
  }
  for (const [x, r] of [[-8, 4.4], [14, 3.6]] as const) {
    c.fillStyle = b.gradient(x - r, x + r, CLAY); c.beginPath(); c.ellipse(x, -22 - r * 0.2, r, r * 1.2, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  }
  k.skull(22, -20, 0.85);
  k.bone(-26, -21, -17, -23, 1.3);
  // toldo listrado por cima, preso em dois postes
  for (const x of [-25, 25]) { c.fillStyle = b.gradient(x - 1.4, x + 1.4, WOOD); c.fillRect(x - 1.4, -43, 2.8, 26); c.strokeStyle = OUTLINE; c.lineWidth = 0.7; c.strokeRect(x - 1.4, -43, 2.8, 26); }
  k.awning(-30, 30, -44, 9, WINE, BONE, 6);
  // caixote ao lado e saco de grãos
  c.fillStyle = b.gradient(31, 41, WOOD); c.fillRect(31, -9, 10, 9); b.line([[31, -4.5], [41, -4.5]], rgba("#1e1410", 0.6), 0.8);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(31, -9, 10, 9);
  b.drift(-24, 3, 10, 2.2, 1); b.drift(22, 5, 9, 2, 2);
  b.line([[-28, -18], [-28, -43]], rgba(GLINT, 0.4), 0.9);
}
