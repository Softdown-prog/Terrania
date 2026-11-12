import { rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BONE, GLINT, OUTLINE, WINE } from "./palette.ts";
import { noise } from "../../towers/common.ts";

/** Tenda de Couro: cone de couro vinho em painéis costurados com remendos, entrada de aba levantada e ossos cruzados no alto. */
export function paintTendaDeCouro(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, w = 42, h = 46;
  b.shadow(w * 2, 70);
  b.rubble(19, 4, 56, BONE);
  const body = (): void => b.poly([[-w, 0], [-w + 5, -26], [-6, -h], [6, -h], [w - 5, -26], [w, 0]]);
  body(); c.fillStyle = b.gradient(-w, w, WINE); c.fill();
  c.save(); body(); c.clip();
  // painéis que partem do alto e abrem até a barra, com pontos de linha ao longo de cada costura
  for (let i = -3; i <= 3; i++) {
    const xb = i * (w / 3), xt = i * 1.6;
    b.line([[xb, 0], [xt, -h]], rgba("#1e1410", 0.55), 1.1);
    for (let t = 0.1; t < 0.95; t += 0.1) { const x = xb + (xt - xb) * t, y = -h * t; b.line([[x - 1.4, y + 0.6], [x + 1.4, y - 0.6]], rgba(WINE.light, 0.8), 0.8); }
  }
  for (let i = 0; i < 4; i++) {
    const px = -w + 8 + noise(i, 9, 141) * (w * 2 - 26), py = -h + 12 + noise(i, 9, 143) * (h - 28);
    c.fillStyle = rgba(WINE.light, 0.42); c.fillRect(px, py, 12, 8);
    c.strokeStyle = rgba("#1e1410", 0.6); c.lineWidth = 0.8; c.setLineDash([2, 1.6]); c.strokeRect(px, py, 12, 8); c.setLineDash([]);
  }
  const shade = c.createLinearGradient(0, -h, 0, 0); shade.addColorStop(0, "rgba(34,26,43,0)"); shade.addColorStop(1, "rgba(34,26,43,0.35)");
  c.fillStyle = shade; c.fillRect(-w, -h, w * 2, h);
  c.restore();
  body(); c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.stroke();
  // entrada: abertura escura com a aba de couro levantada e presa por uma vareta
  b.poly([[-12, 0], [-9, -22], [9, -22], [12, 0]]); c.fillStyle = "#171210"; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  b.poly([[-12, -22], [12, -22], [8, -30], [-8, -30]]); c.fillStyle = b.gradient(-12, 12, WINE); c.fill(); c.stroke();
  b.line([[10, -22], [15, -4]], "#a08f6c", 1.4);
  // ossos cruzados no alto e a franja de pelos na barra
  k.bone(-9, -h - 7, 9, -h + 2, 1.7); k.bone(9, -h - 7, -9, -h + 2, 1.7);
  for (let x = -w + 3; x < w; x += 4) b.line([[x, 0], [x + 0.6, 3 + noise(Math.floor(x), 9, 145) * 3]], rgba("#4f361e", 0.9), 1);
  b.sandSlope(-w, w, 26, 12);
  b.drift(-30, 3, 12, 2.6, 1); b.drift(32, 6, 11, 2.4, 2);
  b.line([[-w + 5, -4], [-w + 9, -24]], rgba(GLINT, 0.55), 1);
}
