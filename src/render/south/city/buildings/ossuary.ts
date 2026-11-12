import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BONE, BONE_WEAR, CLAY, GLINT, OUTLINE, STONE } from "./palette.ts";

/** Ossuário: alvenaria cor de osso com um friso de nichos, cada um com uma caveira, espetos de osso no alto e ossos no chão. */
export function paintOssuario(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 46, top = -46;
  b.shadow(hw * 2, 84);
  b.rubble(16, 6, 60, BONE);
  b.sideFace(hw, 0, top, 10, BONE, BONE_WEAR);
  k.facade(-hw, hw, top, 0, BONE, 20, "masonry", BONE_WEAR);
  // friso de nichos fundos, uma caveira em cada um
  c.fillStyle = "#1e1818"; c.fillRect(-hw + 4, top + 8, hw * 2 - 8, 12);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-hw + 4, top + 8, hw * 2 - 8, 12);
  const niches = 7, step = (hw * 2 - 8) / niches;
  for (let i = 0; i < niches; i++) { const x = -hw + 4 + step * (i + 0.5); k.skull(x, top + 17, 0.85); if (i) b.line([[x - step / 2, top + 8], [x - step / 2, top + 20]], OUTLINE, 0.9); }
  // cornija e espetos de osso
  c.fillStyle = BONE.light; c.fillRect(-hw - 3, top - 4, hw * 2 + 6, 5);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-hw - 3, top - 4, hw * 2 + 6, 5);
  for (let i = 0; i < 9; i++) {
    const x = -hw + 2 + i * ((hw * 2 - 4) / 8), h = 9 + (i % 3) * 3;
    b.poly([[x - 2.6, top - 4], [x + 2.6, top - 4], [x + 0.4, top - 4 - h]]); c.fillStyle = b.gradient(x - 2.6, x + 2.6, BONE); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  }
  // porta escura, com caveira sobre o lintel e as duas urnas ao lado
  b.door(0, 0, 20, 26, STONE);
  k.skull(0, -33, 1.3);
  for (const x of [-30, 30]) {
    c.fillStyle = b.gradient(x - 6, x + 6, CLAY); c.beginPath(); c.ellipse(x, -7, 6, 8, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    ellipse(c, x, -14.5, 3.4, 1.2, "#1e1410");
    b.line([[x - 3, -10], [x - 3, -4]], rgba(GLINT, 0.55), 0.9);
  }
  // pilha de ossos no canto da direita
  for (const [x1, y1, x2, y2] of [[34, 4, 44, 6], [35, 7, 46, 5], [38, 2, 47, 8]] as const) k.bone(x1, y1, x2, y2, 1.6);
  k.skull(40, 3, 0.9);
  b.sandSlope(-hw, hw, 21, 16);
  b.drift(-32, 3, 14, 2.8, 1); b.drift(24, 7, 12, 2.5, 2);
  b.line([[-hw + 1.4, -4], [-hw + 1.4, top + 2]], rgba(GLINT, 0.6), 1);
}
