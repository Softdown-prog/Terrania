import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BRONZE, GLINT, OUTLINE, STONE } from "../buildings/palette.ts";

/** Onde o fogo da tocha se apoia (relativo ao pé do poste): o centro da bacia. */
export const TORCH_FIRE = { x: 0, y: -29 } as const;

/**
 * Tocha de rua da cidade (ADR 0050): poste de bronze com anéis, uma base de pedra, bacia de ferro com as brasas e a
 * sombra no chão. O fogo é animado por quadro (`animation.ts`): violeta nas tochas de variação par, verde nas ímpares.
 */
export function paintCityTorch(c: CanvasRenderingContext2D, variant: number): void {
  const v = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 2, k = new BuildingKit(c), b = k.b;
  b.shadow(18, 34);
  // base de pedra
  c.fillStyle = b.gradient(-7, 7, STONE); c.beginPath(); c.roundRect(-7, -6, 14, 7, 2); c.fill();
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  // poste de bronze com três anéis
  c.fillStyle = b.gradient(-2.5, 2.5, BRONZE); c.fillRect(-2.5, -26, 5, 21);
  for (const y of [-22, -15, -9]) { c.fillStyle = BRONZE.light; c.fillRect(-3.4, y, 6.8, 1.8); }
  c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(-2.5, -26, 5, 21);
  b.line([[-1.4, -24], [-1.4, -7]], rgba(GLINT, 0.55), 0.8);
  // bacia de ferro com as brasas na cor do fogo
  b.poly([[-9, -29], [9, -29], [6, -23], [-6, -23]]); c.fillStyle = b.gradient(-9, 9, { light: "#6a7078", base: "#3b3f46", dark: "#1f2227" }); c.fill();
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  c.fillStyle = v === 0 ? "#8a3b5c" : "#5aa032"; c.beginPath(); c.ellipse(0, -29, 8, 2.4, 0, 0, Math.PI * 2); c.fill();
  ellipse(c, -2, -29.4, 3, 0.9, rgba(v === 0 ? "#e3ccff" : "#8bd450", 0.8));
  b.drift(-10, 2, 7, 1.6, v); b.drift(9, 3, 6, 1.5, v + 1);
}
