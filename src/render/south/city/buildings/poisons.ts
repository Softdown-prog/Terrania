import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BONE, GLINT, OUTLINE, POISON, STONE, STONE_WEAR, WINE } from "./palette.ts";

/** Chaminé do alambique da Casa de Venenos: onde a chama verde animada se apoia (relativo à base do prédio). */
export const POISONS_STILL_TOP = { x: -36, y: -66 } as const;

/** Casa de Venenos: alvenaria roxa, janelas acesas em verde, alambique com fumaça, prateleira de frascos e trepadeira. */
export function paintCasaDeVenenos(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 44, top = -40;
  b.shadow(hw * 2, 88);
  b.rubble(14, 6, 58, STONE);
  // alambique: torre estreita de pedra no canto da esquerda, com a boca de cobre no alto
  k.facade(-44, -28, -62, top + 6, STONE, 17, "masonry", STONE_WEAR, false);
  c.fillStyle = "#b97a2a"; c.fillRect(-47, -66, 22, 5); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-47, -66, 22, 5);
  b.sideFace(hw, 0, top, 9, STONE, STONE_WEAR);
  k.facade(-hw, hw, top, 0, STONE, 18, "masonry", STONE_WEAR);
  c.fillStyle = b.gradient(-hw - 3, hw + 3, STONE); c.fillRect(-hw - 3, top - 5, hw * 2 + 6, 6);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-hw - 3, top - 5, hw * 2 + 6, 6);
  for (const x of [-26, 26]) { k.spill(x, -22, 17, "#8bd450"); b.window(x, -10, 9, 15, STONE, "#8bd450"); }
  b.door(0, 0, 20, 27, STONE);
  // caveira de aviso sobre a porta e um fio de fumaça verde do alambique
  ellipse(c, 0, top + 8, 5, 4.4, BONE.base);
  c.fillStyle = "#1e1410"; c.fillRect(-2.4, top + 7, 1.8, 2); c.fillRect(0.8, top + 7, 1.8, 2);
  const smoke = c.createLinearGradient(0, -72, 0, -96); smoke.addColorStop(0, "rgba(139,212,80,0.35)"); smoke.addColorStop(1, "rgba(139,212,80,0)");
  c.fillStyle = smoke; c.beginPath(); c.ellipse(-36, -82, 5, 14, 0, 0, Math.PI * 2); c.fill();
  // prateleira de frascos na direita
  c.fillStyle = b.gradient(24, 46, { light: "#b98255", base: "#8a5e3b", dark: "#5a3a24" }); c.fillRect(22, -18, 24, 3);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(22, -18, 24, 3);
  for (let i = 0; i < 5; i++) {
    const x = 25 + i * 4.6, h = 6 + (i % 3) * 2, ramp = i % 2 ? POISON : WINE;
    c.fillStyle = b.gradient(x - 1.6, x + 1.6, ramp); c.fillRect(x - 1.6, -18 - h, 3.2, h);
    c.fillStyle = BONE.base; c.fillRect(x - 0.8, -19 - h, 1.6, 1.6);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.7; c.strokeRect(x - 1.6, -18 - h, 3.2, h);
    b.line([[x - 0.9, -17 - h], [x - 0.9, -20]], rgba(GLINT, 0.55), 0.7);
  }
  // trepadeira seca subindo pela parede da esquerda
  for (let i = 0; i < 3; i++) {
    c.beginPath(); c.moveTo(-40 + i * 3, 1); c.quadraticCurveTo(-34 + i * 5, -18 - i * 6, -38 + i * 4, -34 - i * 2);
    c.strokeStyle = i % 2 ? "#356a1f" : "#5aa032"; c.lineWidth = 1.1; c.stroke();
    for (let l = 0; l < 3; l++) ellipse(c, -37 + i * 3 + l * 2.4, -10 - l * 8 - i * 2, 2.2, 1.2, i % 2 ? "#5aa032" : "#8bd450", 0.6);
  }
  b.sandSlope(-hw, hw, 9, 13);
  b.drift(-24, 3, 12, 2.6, 1); b.drift(30, 6, 13, 2.4, 2);
  b.line([[-hw + 1.4, -4], [-hw + 1.4, top + 2]], rgba(GLINT, 0.6), 1);
}
