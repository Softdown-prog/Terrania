import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BONE, BRONZE, CLAY, GLINT, OUTLINE, POISON, WINE, WOOD } from "../buildings/palette.ts";

/** As cores de pano das cinco tendas da feira, na ordem da variação (vinho claro, vinho escuro, verde, bronze, vinho claro). */
const CLOTH = [WINE, { light: "#a64d70", base: "#7a3050", dark: "#4a1c34" }, POISON, BRONZE, { light: "#b0587a", base: "#8a3b5c", dark: "#5e2440" }] as const;

/**
 * Tenda da feira (ADR 0050): pano esticado em dois mastros com a bainha recortada, listras na cor da variação, cordas e estacas,
 * a boca aberta com o interior escuro, caixotes e um saco de areia no pé. Para cada uma das cinco variações o pano muda de cor.
 */
export function paintCityTent(c: CanvasRenderingContext2D, variant: number): void {
  const v = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 5, cloth = CLOTH[v]!, k = new BuildingKit(c), b = k.b;
  b.shadow(88, 56);
  // interior escuro da boca da tenda e o piso de terra batida
  ellipse(c, 0, 4, 40, 7, rgba("#2c1f14", 0.45));
  c.fillStyle = "#1c1612"; c.fillRect(-26, -18, 52, 20);
  c.fillStyle = b.gradient(-26, 26, WOOD); c.fillRect(-22, -9, 14, 11);  // caixote
  b.line([[-22, -4], [-8, -4]], rgba("#1e1410", 0.6), 0.9); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-22, -9, 14, 11);
  // pano do teto: dois planos, o de trás mais escuro e o da frente com o degradê de volume e as listras
  b.poly([[-42, -18], [-24, -49], [8, -55], [42, -23], [36, -17]]); c.fillStyle = cloth.dark; c.fill();
  const roof = (): void => b.poly([[-40, -20], [-24, -47], [8, -53], [0, -18]]);
  roof(); c.fillStyle = b.gradient(-40, 8, cloth); c.fill();
  c.save(); roof(); c.clip();
  for (let i = -3; i < 4; i++) b.line([[i * 6 - 18, -20], [i * 3 - 8, -53]], rgba(cloth.light, i % 2 ? 0.4 : 0.15), 3);
  c.restore();
  roof(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  b.poly([[0, -18], [8, -53], [40, -22], [36, -17]]); c.fillStyle = b.gradient(0, 40, CLAY); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  // bainha recortada em ondas, nas duas águas do pano
  for (let x = -38; x < 0; x += 7) { c.beginPath(); c.arc(x + 3.5, -19, 3.5, 0, Math.PI); c.fillStyle = cloth.base; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke(); }
  // mastros de osso com a ponta de bronze, cordas até as estacas e o saco de areia
  for (const x of [-42, 39]) {
    c.fillStyle = b.gradient(x - 1.5, x + 1.5, BONE); c.fillRect(x - 1.5, -22, 3, 28);
    ellipse(c, x, -23, 2.6, 2.6, BRONZE.base); c.strokeStyle = OUTLINE; c.lineWidth = 0.7; c.strokeRect(x - 1.5, -22, 3, 28);
    b.line([[x, -20], [x + (x < 0 ? -12 : 12), 5]], rgba("#d3c3a0", 0.9), 0.9);
    c.fillStyle = BONE.dark; c.fillRect(x + (x < 0 ? -13 : 11), 3, 2.6, 4);
  }
  c.fillStyle = b.gradient(28, 40, CLAY); c.beginPath(); c.ellipse(32, 0, 6, 4.4, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  b.drift(-30, 5, 11, 2.4, v); b.drift(26, 7, 10, 2.2, v + 1);
  b.line([[-38, -23], [-24, -46]], rgba(GLINT, 0.55), 1);
}
