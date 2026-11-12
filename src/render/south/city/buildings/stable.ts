import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BRONZE, GLINT, OUTLINE, STRAW, WOOD } from "./palette.ts";
import { CLAY_WEAR } from "./palette.ts";

/** Estábulo de Lagartos: tábuas de madeira, telhado de palha, baia aberta de meia-porta, feno, cocho e poste com argola. */
export function paintEstabulo(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 46, top = -36;
  b.shadow(hw * 2, 84);
  b.rubble(17, 5, 60, WOOD);
  b.sideFace(hw, 0, top, 9, WOOD, CLAY_WEAR);
  k.facade(-hw, hw, top, 0, WOOD, 22, "plank", CLAY_WEAR);
  k.thatchRoof(-hw, hw, top, top - 30, 7, STRAW, 23);
  // baia: abertura escura com meia-porta de madeira, ferragem e uma argola de ferro
  c.fillStyle = "#171210"; c.fillRect(-14, -30, 28, 30);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-14, -30, 28, 30);
  ellipse(c, 4, -18, 3.6, 1.4, "rgba(255,207,106,0.35)"); // um olho amarelo de lagarto no escuro
  ellipse(c, -2, -18, 3.6, 1.4, "rgba(255,207,106,0.35)");
  c.fillStyle = b.gradient(-14, 14, WOOD); c.fillRect(-14, -13, 28, 13);
  for (const x of [-7, 0, 7]) b.line([[x, -13], [x, 0]], rgba("#1e1410", 0.7), 0.9);
  c.fillStyle = "#3b3f46"; c.fillRect(-14, -9, 28, 1.8);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-14, -13, 28, 13);
  for (const x of [-16, 16]) { c.fillStyle = b.gradient(x - 2, x + 2, WOOD); c.fillRect(x - 2, -32, 4, 32); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 2, -32, 4, 32); }
  // fardo de feno à esquerda e cocho com água à direita
  c.fillStyle = b.gradient(-42, -24, STRAW); c.fillRect(-42, -13, 18, 13);
  for (let i = 0; i < 7; i++) b.line([[-41 + i * 2.6, -12], [-40 + i * 2.6, -1]], rgba(i % 2 ? STRAW.light : STRAW.dark, 0.7), 0.9);
  b.line([[-42, -9], [-24, -9]], "#6a4a2a", 1.4);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-42, -13, 18, 13);
  c.fillStyle = b.gradient(24, 44, WOOD); c.fillRect(24, -8, 20, 8);
  ellipse(c, 34, -8, 9, 1.8, "#2f6f73"); ellipse(c, 31, -8.4, 4, 0.8, rgba(GLINT, 0.5));
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(24, -8, 20, 8);
  // poste com argola e corda
  b.line([[-20, 2], [-20, -24]], "#5a3a24", 3);
  ellipse(c, -20, -20, 2.6, 2.6, "rgba(0,0,0,0)"); c.beginPath(); c.arc(-20, -18, 2.4, 0, Math.PI * 2); c.strokeStyle = "#3b3f46"; c.lineWidth = 1.2; c.stroke();
  b.line([[-20, -16], [-22, -8], [-21, -3]], BRONZE.dark, 0.9);
  b.sandSlope(-hw, hw, 24, 16);
  b.drift(-30, 3, 13, 2.6, 1); b.drift(30, 7, 13, 2.4, 2);
  b.line([[-hw + 1.4, -4], [-hw + 1.4, top + 2]], rgba(GLINT, 0.6), 1);
}
