import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BONE, CLAY_WEAR, GLINT, HIDE, OUTLINE, WOOD } from "./palette.ts";

/** Barraca sobre Estacas: cabana de tábuas erguida em estacas, com escada de mão, plataforma, telhado de couro e potes pendurados. */
export function paintBarracaSobreEstacas(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 36, floor = -14, top = -46;
  b.shadow(hw * 2, 76);
  b.rubble(21, 4, 52, WOOD);
  // estacas fincadas no chão, com a sombra embaixo e travessas em X
  for (const x of [-30, -10, 10, 30]) {
    ellipse(c, x + 2, 3, 5, 1.8, "rgba(34,26,43,0.35)");
    c.fillStyle = b.gradient(x - 3, x + 3, WOOD); c.fillRect(x - 3, floor, 6, -floor + 2);
    for (let y = floor + 4; y < 0; y += 5) b.line([[x - 3, y], [x + 3, y + 0.6]], rgba("#1e1410", 0.45), 0.8);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 3, floor, 6, -floor + 2);
  }
  b.line([[-30, floor + 2], [-10, -1]], "#5a3a24", 1.6); b.line([[-10, floor + 2], [-30, -1]], "#5a3a24", 1.6);
  b.line([[10, floor + 2], [30, -1]], "#5a3a24", 1.6); b.line([[30, floor + 2], [10, -1]], "#5a3a24", 1.6);
  // plataforma de tábuas com a borda à mostra
  c.fillStyle = b.gradient(-hw - 4, hw + 4, WOOD); c.fillRect(-hw - 4, floor - 4, hw * 2 + 8, 5);
  for (let x = -hw - 2; x < hw + 4; x += 6) b.line([[x, floor - 4], [x, floor + 1]], rgba("#1e1410", 0.6), 0.8);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-hw - 4, floor - 4, hw * 2 + 8, 5);
  b.line([[-hw - 3, floor - 4], [hw + 3, floor - 4]], rgba(GLINT, 0.5), 0.9);
  // cabana: paredes de tábuas e telhado de couro
  b.sideFace(hw - 2, floor - 4, top, 8, WOOD, CLAY_WEAR);
  k.facade(-hw + 2, hw - 2, top, floor - 4, WOOD, 29, "plank", CLAY_WEAR, false);
  k.hideRoof(-hw + 2, hw - 2, top, top - 24, 6, HIDE, 30);
  b.door(2, floor - 4, 14, 22, BONE);
  // escada de mão até a porta, potes pendurados no beiral
  for (const x of [-16, -8]) b.line([[x, floor - 3], [x - 6, 2]], "#5a3a24", 2);
  for (let y = floor + 1, i = 0; y < 1; y += 4, i++) b.line([[-16 - (y - floor) * 0.5, y], [-8 - (y - floor) * 0.5, y]], "#8a5e3b", 1.4);
  for (const x of [18, 27]) {
    b.line([[x, top + 2], [x, top + 8]], "#3b3f46", 0.9);
    c.fillStyle = b.gradient(x - 3, x + 3, { light: "#d98b5b", base: "#a8613a", dark: "#6a3a24" }); c.beginPath(); c.ellipse(x, top + 11, 3, 3.4, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  }
  b.drift(-26, 3, 12, 2.6, 1); b.drift(30, 6, 11, 2.4, 2);
  b.line([[-hw + 3, floor - 6], [-hw + 3, top + 2]], rgba(GLINT, 0.5), 1);
}
