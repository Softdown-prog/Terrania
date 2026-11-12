import { rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BONE, BRONZE, CLAY, CLAY_WEAR, GLINT, OUTLINE, POISON, WINE } from "./palette.ts";

/** Bazar das Raridades: casa de barro com toldo listrado, caixotes e potes na frente, panos pendurados e uma bandeira. */
export function paintBazar(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 44, top = -36;
  b.shadow(hw * 2, 86);
  b.rubble(13, 6, 58, CLAY);
  b.sideFace(hw, 0, top, 9, CLAY, CLAY_WEAR);
  k.facade(-hw, hw, top, 0, CLAY, 16, "adobe", CLAY_WEAR);
  c.fillStyle = CLAY.light; c.fillRect(-hw - 3, top - 5, hw * 2 + 6, 6);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-hw - 3, top - 5, hw * 2 + 6, 6);
  // bandeira no alto e panos tingidos pendurados na parede da direita
  b.line([[-30, top - 5], [-30, top - 28]], "#3b3f46", 1.6);
  b.poly([[-30, top - 28], [-12, top - 25], [-15, top - 20], [-12, top - 16], [-30, top - 18]]);
  c.fillStyle = b.gradient(-30, -12, POISON); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  for (const [x, ramp] of [[24, WINE], [33, BRONZE], [41, POISON]] as const) {
    b.poly([[x - 3.5, top + 4], [x + 3.5, top + 4], [x + 3.5, top + 20], [x, top + 16], [x - 3.5, top + 20]]);
    c.fillStyle = b.gradient(x - 3.5, x + 3.5, ramp); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  }
  b.window(-27, -12, 10, 14, BONE, "#ffcf6a");
  k.spill(-27, -20, 15, "#ffcf6a");
  b.door(0, 0, 20, 26, BONE);
  k.awning(-38, 38, top + 2, 12, WINE, BONE, 8);
  // caixotes empilhados à esquerda e potes de barro à direita
  for (const [x, y, s] of [[-40, 0, 12], [-27, 0, 10], [-36, -12, 9]] as const) {
    c.fillStyle = b.gradient(x, x + s, CLAY); c.fillRect(x, y - s, s, s);
    b.line([[x, y - s / 2], [x + s, y - s / 2]], rgba("#1e1410", 0.6), 0.9);
    b.line([[x + s / 2, y - s], [x + s / 2, y]], rgba("#1e1410", 0.45), 0.8);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x, y - s, s, s);
  }
  for (const [x, r] of [[22, 6], [32, 5], [40, 4.2]] as const) {
    c.fillStyle = b.gradient(x - r, x + r, CLAY); c.beginPath(); c.ellipse(x, -r, r, r * 1.1, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    c.fillStyle = rgba("#1e1410", 0.8); c.beginPath(); c.ellipse(x, -r * 2, r * 0.5, 1.1, 0, 0, Math.PI * 2); c.fill();
  }
  b.sandSlope(-hw, hw, 8, 13);
  b.drift(-22, 3, 12, 2.6, 1); b.drift(26, 6, 13, 2.4, 2);
  b.line([[-hw + 1.4, -4], [-hw + 1.4, top + 2]], rgba(GLINT, 0.6), 1);
}
