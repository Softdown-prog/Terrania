import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BRONZE, CLAY, CLAY_WEAR, GLINT, OUTLINE, STONE, STONE_WEAR } from "./palette.ts";

/** Chaminé da forja: sobe até este ponto (relativo à base do prédio) e é onde a chama animada se apoia. */
export const FORGE_CHIMNEY_TOP = { x: 30, y: -84 } as const;

/** Fornalha dos Trolls: casa de barro com platibanda, chaminé de pedra, fornalha acesa na janela, bigorna e carvão. */
export function paintFornalha(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 44, top = -38;
  b.shadow(hw * 2, 90);
  b.rubble(11, 6, 58, CLAY);
  // chaminé de pedra, atrás da casa, com a boca larga no alto
  k.facade(22, 38, -78, top + 6, STONE, 12, "masonry", STONE_WEAR, false);
  c.fillStyle = STONE.light; c.fillRect(19, -82, 22, 5); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(19, -82, 22, 5);
  c.fillStyle = "#1e1410"; c.fillRect(23, -81, 14, 3);
  const soot = c.createLinearGradient(0, -78, 0, -48); soot.addColorStop(0, "rgba(14,8,20,0.55)"); soot.addColorStop(1, "rgba(14,8,20,0)");
  c.fillStyle = soot; c.fillRect(22, -78, 16, 30);
  // casa
  b.sideFace(hw, 0, top, 9, CLAY, CLAY_WEAR);
  k.facade(-hw, hw, top, 0, CLAY, 13, "adobe", CLAY_WEAR);
  c.fillStyle = CLAY.light; c.fillRect(-hw - 3, top - 5, hw * 2 + 6, 6);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-hw - 3, top - 5, hw * 2 + 6, 6);
  const under = c.createLinearGradient(0, top + 1, 0, top + 8); under.addColorStop(0, "rgba(34,26,43,0.4)"); under.addColorStop(1, "rgba(34,26,43,0)");
  c.fillStyle = under; c.fillRect(-hw, top + 1, hw * 2, 7);
  // fornalha acesa na janela da esquerda e brasa vazando para a parede
  k.spill(-27, -20, 22, "#ff9a3c");
  b.window(-27, -9, 11, 15, STONE, "#ff9a3c");
  b.door(4, 0, 22, 28, STONE);
  // bigorna, carvão com brasas e um barril de água
  b.poly([[26, 4], [40, 4], [38, -1], [41, -3], [24, -3], [27, -1]]);
  c.fillStyle = "#3b3f46"; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  b.line([[26, -2.4], [40, -2.4]], rgba(GLINT, 0.55), 0.9);
  ellipse(c, -38, 6, 8, 3, "#241a1a");
  for (const [x, y] of [[-41, 5], [-37, 6.5], [-34, 5], [-39, 7.4]] as const) ellipse(c, x, y, 1.1, 0.9, i0(x) ? "#ff9a3c" : "#ffd27a");
  k.hangingSign(-10, top + 4, 15, 11);
  b.line([[-14, top + 9], [-6, top + 9]], rgba(BRONZE.light, 0.9), 1.4);
  b.sandSlope(-hw, hw, 6, 15);
  b.drift(-30, 3, 13, 2.6, 1); b.drift(34, 6, 12, 2.4, 2);
  b.line([[-hw + 1.4, -4], [-hw + 1.4, top + 2]], rgba(GLINT, 0.6), 1);
}
const i0 = (x: number): boolean => Math.round(x) % 2 === 0;
