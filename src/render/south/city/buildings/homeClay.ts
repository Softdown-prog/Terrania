import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BONE, CLAY, CLAY_WEAR, GLINT, OUTLINE, WOOD } from "./palette.ts";

/** Casa de Argila: reboco de barro com teto plano, vigas de madeira saindo da parede, janela redonda, varal de pimentas e potes. */
export function paintCasaDeArgila(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 38, top = -40;
  b.shadow(hw * 2, 80);
  b.rubble(18, 5, 54, CLAY);
  b.sideFace(hw, 0, top, 9, CLAY, CLAY_WEAR);
  k.facade(-hw, hw, top, 0, CLAY, 24, "adobe", CLAY_WEAR);
  // teto plano com platibanda arredondada e a ponta das vigas aparecendo sob ela
  c.fillStyle = b.gradient(-hw - 3, hw + 3, CLAY); c.beginPath(); c.roundRect(-hw - 3, top - 6, hw * 2 + 6, 8, 3); c.fill();
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  for (let x = -hw + 5; x < hw; x += 9) { ellipse(c, x, top + 5, 2.8, 2.4, WOOD.base); c.beginPath(); c.arc(x, top + 5, 2.8, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke(); ellipse(c, x - 0.6, top + 4.4, 1, 0.8, rgba(WOOD.light, 0.9)); }
  // janela redonda com cortina e janela de madeira
  c.beginPath(); c.arc(-22, -26, 6.5, 0, Math.PI * 2); c.fillStyle = "#0b1519"; c.fill();
  c.strokeStyle = BONE.light; c.lineWidth = 2.4; c.stroke();
  c.beginPath(); c.arc(-22, -26, 6.5, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  b.poly([[-27, -31], [-22, -29], [-17, -31], [-18, -22], [-26, -22]]); c.fillStyle = b.gradient(-27, -17, { light: "#c9503f", base: "#8a3b5c", dark: "#5e2440" }); c.fill();
  b.door(8, 0, 16, 24, BONE);
  // varal de pimentas e potes de barro
  b.line([[20, top + 10], [37, top + 12]], "#5a3a24", 1);
  for (let i = 0; i < 5; i++) { const x = 22 + i * 3.4; ellipse(c, x, top + 14.5 + i * 0.4, 1.2, 2.8, i % 2 ? "#c9503f" : "#e0a24a"); }
  for (const [x, r] of [[-32, 6], [-24, 4.6]] as const) {
    c.fillStyle = b.gradient(x - r, x + r, CLAY); c.beginPath(); c.ellipse(x, -r, r, r * 1.1, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    ellipse(c, x, -r * 2, r * 0.5, 1.1, "#1e1410");
  }
  b.sandSlope(-hw, hw, 25, 14);
  b.drift(-26, 3, 12, 2.6, 1); b.drift(30, 6, 12, 2.4, 2);
  b.line([[-hw + 1.4, -4], [-hw + 1.4, top + 2]], rgba(GLINT, 0.6), 1);
}
