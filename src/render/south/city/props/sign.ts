import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BRONZE, GLINT, OUTLINE, WOOD } from "../buildings/palette.ts";

/**
 * Placa da cidade (ADR 0050): poste de madeira fincado na areia, tábua de aviso com o brilho do veio, pregos de ferro, o
 * risco entalhado das letras e uma caveirinha de osso pregada no canto. Cabe nos quatro letreiros (portões, poço e obelisco).
 */
export function paintCitySign(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b;
  b.shadow(34, 40);
  c.fillStyle = b.gradient(-2.5, 2.5, WOOD); c.fillRect(-2.5, -28, 5, 29);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-2.5, -28, 5, 29);
  // tábua com duas ripas e o veio
  c.fillStyle = b.gradient(-17, 17, WOOD); c.fillRect(-17, -31, 34, 14);
  b.line([[-17, -24], [17, -24]], rgba("#1e1410", 0.6), 0.9);
  for (const dy of [-29, -21]) for (let i = 0; i < 3; i++) b.line([[-14 + i * 11, dy], [-8 + i * 11, dy + 0.4]], rgba(WOOD.dark, 0.7), 0.8);
  // letras entalhadas: traços curtos de alturas diferentes
  for (let i = 0; i < 6; i++) b.line([[-12 + i * 4.2, -28], [-12 + i * 4.2, -26 - (i % 3)]], rgba("#1e1410", 0.85), 1.1);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-17, -31, 34, 14);
  b.line([[-16, -30], [16, -30]], rgba(GLINT, 0.55), 0.9);
  for (const [x, y] of [[-14, -28], [14, -28], [-14, -20], [14, -20]] as const) ellipse(c, x, y, 1, 1, "#3b3f46");
  k.skull(13, -19, 0.55);
  ellipse(c, 0, 1, 7, 1.8, rgba(BRONZE.dark, 0.35));
  b.drift(-6, 2, 8, 1.8, 1); b.drift(7, 3, 7, 1.6, 2);
}
