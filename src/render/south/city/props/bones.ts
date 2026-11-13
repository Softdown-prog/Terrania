import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BONE, GLINT, OUTLINE } from "../buildings/palette.ts";

/**
 * Ossos espalhados (ADR 0050): uma caveira de animal grande com as costelas arqueadas ao lado, ossos longos cruzados e algumas
 * vértebras no chão, com a sombra de cada um. Marca os cantos da cidade onde ninguém limpa.
 */
export function paintCityBones(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b;
  ellipse(c, 2, 2, 34, 6, rgba("#2c1f14", 0.28));
  // costelas: quatro arcos que se afinam, saindo de uma coluna
  b.line([[-26, 0], [-4, -1]], BONE.dark, 2.4);
  for (let i = 0; i < 4; i++) {
    const x = -23 + i * 6;
    c.beginPath(); c.arc(x, 0, 6 - i * 0.6, Math.PI * 1.05, Math.PI * 1.95);
    c.strokeStyle = BONE.base; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(x - 0.6, -0.4, 6 - i * 0.6, Math.PI * 1.15, Math.PI * 1.5); c.strokeStyle = BONE.light; c.lineWidth = 0.9; c.stroke();
  }
  // ossos longos cruzados
  k.bone(2, -2, 22, -5, 2.1); k.bone(4, -6, 20, 0, 2);
  // a caveira, maior e com o focinho
  k.skull(11, -3, 1.5);
  b.poly([[15, -3], [24, -2], [23, 1], [14, 1]]); c.fillStyle = b.gradient(14, 24, BONE); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  // vértebras soltas
  for (const [x, y] of [[-30, 2], [-28, 4], [28, 3]] as const) { ellipse(c, x, y, 2.4, 1.6, BONE.base); ellipse(c, x - 0.6, y - 0.4, 1, 0.6, rgba(GLINT, 0.6)); }
  b.drift(-18, 4, 9, 1.8, 1); b.drift(20, 5, 8, 1.7, 2);
  b.line([[-24, -6], [-12, -6]], rgba(GLINT, 0.4), 0.8);
}
