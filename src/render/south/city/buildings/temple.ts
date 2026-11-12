import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "./kit.ts";
import { BONE, BONE_WEAR, BRONZE, GLINT, OUTLINE } from "./palette.ts";

/** Templo do Sol Negro: pedra clara com frontão, o disco de bronze com raios, duas pilastras e três degraus na frente. */
export function paintTemplo(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b, hw = 55, top = -46;
  b.shadow(hw * 2, 90);
  b.rubble(15, 7, 70, BONE);
  b.sideFace(hw, 0, top, 11, BONE, BONE_WEAR);
  k.facade(-hw, hw, top, 0, BONE, 19, "masonry", BONE_WEAR);
  // frontão com cornija e o disco de bronze dentro
  const pediment = (): void => b.poly([[-hw - 7, top], [0, top - 26], [hw + 7, top]]);
  pediment(); c.fillStyle = b.gradient(-hw - 7, hw + 7, BONE); c.fill();
  c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.stroke();
  b.line([[-hw + 6, top - 3], [0, top - 22]], rgba(GLINT, 0.55), 1);
  c.fillStyle = BONE.light; c.fillRect(-hw - 8, top - 1, hw * 2 + 16, 5);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-hw - 8, top - 1, hw * 2 + 16, 5);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.line([[Math.cos(a) * 9, top - 11 + Math.sin(a) * 9], [Math.cos(a) * 13, top - 11 + Math.sin(a) * 13]], BRONZE.base, 1.4); }
  const disc = c.createRadialGradient(-2, top - 13, 1, 0, top - 11, 9);
  disc.addColorStop(0, BRONZE.light); disc.addColorStop(0.6, BRONZE.base); disc.addColorStop(1, BRONZE.dark);
  ellipse(c, 0, top - 11, 8.4, 8.4, disc);
  c.beginPath(); c.arc(0, top - 11, 8.4, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  ellipse(c, 0, top - 11, 3.4, 3.4, "#1b1424");
  ellipse(c, -3, top - 14, 2.2, 1.2, rgba(GLINT, 0.7));
  // pilastras com capitel e base
  for (const x of [-38, 38]) {
    c.fillStyle = b.gradient(x - 5, x + 5, BONE); c.fillRect(x - 5, top + 4, 10, -top - 4);
    for (const dx of [-1.8, 1.8]) b.line([[x + dx, top + 6], [x + dx, -4]], rgba(BONE.dark, 0.45), 0.8);
    c.fillStyle = BONE.light; c.fillRect(x - 7, top + 2, 14, 4); c.fillRect(x - 7, -5, 14, 5);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 5, top + 4, 10, -top - 9); c.strokeRect(x - 7, top + 2, 14, 4); c.strokeRect(x - 7, -5, 14, 5);
  }
  b.door(0, 0, 22, 32, BONE);
  // três degraus à frente, cada um mais largo
  for (let i = 0; i < 3; i++) {
    const w = 24 + i * 8, y = 1 + i * 3.4;
    c.fillStyle = b.gradient(-w, w, BONE); c.fillRect(-w, y, w * 2, 3.4);
    c.fillStyle = rgba(GLINT, 0.4); c.fillRect(-w, y, w * 2, 0.8);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-w, y, w * 2, 3.4);
  }
  b.sandSlope(-hw, hw, 10, 26);
  b.drift(-46, 6, 14, 2.8, 1); b.drift(50, 8, 13, 2.6, 2);
  b.line([[-hw + 1.4, -4], [-hw + 1.4, top + 3]], rgba(GLINT, 0.6), 1);
}
