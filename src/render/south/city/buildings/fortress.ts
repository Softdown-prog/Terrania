import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BONE, BRONZE, CLAY, CLAY_WEAR, GLINT, OUTLINE, WINE } from "./palette.ts";

/** Fortaleza do Poço: bloco de alvenaria de barro, torre de menagem ao fundo com estandarte, ameias de osso e portão reforçado. */
export function paintFortaleza(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 58, top = -64;
  b.shadow(hw * 2, 118);
  b.rubble(10, 7, 72, CLAY);
  // torre de menagem, atrás do bloco: sobe até -118 com ameias e o pano de guerra
  k.facade(-19, 19, -112, top + 8, CLAY, 11, "adobe", CLAY_WEAR, false);
  k.crenels(-21, 21, -112, 4, 9, BONE);
  b.window(0, -86, 8, 16, CLAY);
  b.line([[0, -121], [0, -146]], "#3b3f46", 1.8);
  b.poly([[0, -146], [20, -142], [17, -137], [20, -132], [0, -134]]);
  c.fillStyle = b.gradient(0, 20, WINE); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  ellipse(c, 8, -139, 2.6, 2.6, BRONZE.base);
  // corpo principal
  b.sideFace(hw, 0, top, 12, CLAY, CLAY_WEAR);
  k.facade(-hw, hw, top, 0, CLAY, 10, "masonry", CLAY_WEAR);
  c.fillStyle = BRONZE.base; c.fillRect(-hw, top + 7, hw * 2, 2.4);
  c.fillStyle = rgba(GLINT, 0.5); c.fillRect(-hw, top + 7, hw * 2, 0.8);
  k.crenels(-hw - 2, hw + 2, top, 9, 11, BONE);
  // frestas de arqueiro, panos pendurados e o portão
  for (const x of [-42, -26, 26, 42]) { c.fillStyle = "#0b1519"; c.fillRect(x - 1.8, -52, 3.6, 15); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 1.8, -52, 3.6, 15); }
  for (const x of [-48, 48]) {
    b.poly([[x - 5, top + 11], [x + 5, top + 11], [x + 5, top + 36], [x, top + 31], [x - 5, top + 36]]);
    c.fillStyle = b.gradient(x - 5, x + 5, WINE); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    b.line([[x - 4, top + 14], [x + 4, top + 14]], rgba("#d9a24a", 0.9), 1.2);
  }
  b.door(0, 0, 26, 36, BONE);
  b.sandSlope(-hw, hw, 5, 18);
  b.drift(-40, 3, 15, 3, 1); b.drift(44, 5, 13, 2.8, 2);
  b.line([[-hw + 1.4, -4], [-hw + 1.4, top + 4]], rgba(GLINT, 0.6), 1);
}
