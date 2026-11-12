import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BONE, CLAY, CLAY_WEAR, GLINT, OUTLINE, WINE } from "./palette.ts";

/** Hospedaria Sombra do Escorpião: casa de barro com telhado vinho, janelas acesas, lanterna na porta e a caveira na tabuleta. */
export function paintHospedaria(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 44, top = -36;
  b.shadow(hw * 2, 84);
  b.rubble(12, 6, 58, CLAY);
  b.sideFace(hw, 0, top, 9, CLAY, CLAY_WEAR);
  k.facade(-hw, hw, top, 0, CLAY, 14, "adobe", CLAY_WEAR);
  k.tiledRoof(-hw, hw, top, top - 28, 7, WINE, 15);
  for (const x of [-28, 28]) { k.spill(x, -20, 17, "#ffcf6a"); b.window(x, -10, 10, 15, BONE, "#ffcf6a"); }
  b.door(0, 0, 20, 28, BONE);
  // lanterna ao lado da porta e a tabuleta com a caveira
  b.line([[16, -30], [16, -25]], "#3b3f46", 1.2);
  c.fillStyle = "#3b3f46"; c.fillRect(13.5, -25, 5, 7); c.fillStyle = "#ffcf6a"; c.fillRect(14.5, -24, 3, 5);
  k.spill(16, -22, 12, "#ffcf6a");
  k.hangingSign(34, top + 12, 18, 14);
  ellipse(c, 34, top + 20, 4.4, 4, BONE.base);
  c.fillStyle = "#1e1410"; c.fillRect(32, top + 19, 1.6, 1.8); c.fillRect(35, top + 19, 1.6, 1.8); c.fillRect(33.6, top + 22, 1.8, 1.6);
  // barril e banco à esquerda
  c.fillStyle = b.gradient(-40, -30, CLAY); c.fillRect(-40, -12, 10, 13);
  c.fillStyle = "#3b3f46"; c.fillRect(-40, -9, 10, 1.4); c.fillRect(-40, -3, 10, 1.4);
  ellipse(c, -35, -12, 5, 1.6, CLAY.light);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-40, -12, 10, 13);
  b.sandSlope(-hw, hw, 7, 14);
  b.drift(-26, 3, 13, 2.6, 1); b.drift(30, 6, 12, 2.4, 2);
  b.line([[-hw + 1.4, -4], [-hw + 1.4, top + 2]], rgba(GLINT, 0.6), 1);
}
