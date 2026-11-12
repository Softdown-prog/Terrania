import { rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BONE, GLINT, HIDE, OUTLINE } from "./palette.ts";
import { noise } from "../../towers/common.ts";

/** Casebre de Ossos: paredes de ossos longos empilhados, telhado de couro, caveira grande sobre a porta e costelas de moldura. */
export function paintCasebreDeOssos(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 36, top = -34;
  b.shadow(hw * 2, 78);
  b.rubble(20, 5, 52, BONE);
  b.sideFace(hw, 0, top, 8, BONE, { stain: "#4a3a22", lichenA: "#b79a52", lichenB: "#8a8f4e", salt: "#fff6dc" });
  // parede: fiadas de ossos longos deitados, cada um com as duas cabeças e vão escuro entre eles
  c.fillStyle = "#2a2018"; c.fillRect(-hw, top, hw * 2, -top);
  for (let row = 0, y = -4; y > top; row++, y -= 6) {
    const off = (row % 2) * 7;
    for (let x = -hw + 2 - off; x < hw - 2; x += 22) k.bone(Math.max(-hw + 2, x), y, Math.min(hw - 2, x + 19), y + (noise(row, Math.floor(x), 151) - 0.5) * 1.2, 2.1);
  }
  c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.strokeRect(-hw, top, hw * 2, -top);
  const occ = c.createLinearGradient(0, -8, 0, 1); occ.addColorStop(0, "rgba(34,26,43,0)"); occ.addColorStop(1, "rgba(34,26,43,0.4)");
  c.fillStyle = occ; c.fillRect(-hw, -8, hw * 2, 9);
  k.hideRoof(-hw, hw, top, top - 26, 6, HIDE, 27);
  // porta com costelas em arco e a caveira grande no alto
  b.door(0, 0, 16, 24, BONE);
  for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 12, -22, 9, s < 0 ? Math.PI * 1.1 : Math.PI * 1.9, s < 0 ? Math.PI * 1.9 : Math.PI * 1.1, s > 0); c.strokeStyle = "#d3c3a0"; c.lineWidth = 2; c.stroke(); }
  k.skull(0, -27, 1.5);
  // pilha de ossos e uma caveira no chão
  for (const [x1, y1, x2, y2] of [[22, 4, 33, 6], [24, 7, 34, 4]] as const) k.bone(x1, y1, x2, y2, 1.6);
  k.skull(-27, 3, 0.9);
  b.sandSlope(-hw, hw, 28, 12);
  b.drift(-24, 3, 12, 2.6, 1); b.drift(28, 7, 11, 2.4, 2);
  b.line([[-hw + 1.4, -3], [-hw + 1.4, top + 2]], rgba(GLINT, 0.45), 1);
}
