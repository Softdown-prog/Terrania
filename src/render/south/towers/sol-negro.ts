import { ellipse, rgba, shade } from "../../draw.ts";
import { BASALT, GLINT, GOLD, OUTLINE, MasonryBrush, BASALT_WEAR } from "../kit/index.ts";

/** Torre do Sol Negro: três degraus de basalto roxo, braseiros de fogo violeta, estandarte negro e o disco dourado no alto. */
const TIERS = [{ half: 42, top: -52 }, { half: 31, top: -98 }, { half: 20, top: -134 }] as const;
const FLAME = "#b985ff";

function tier(c: CanvasRenderingContext2D, half: number, yBase: number, yTop: number, v: number, ground: boolean): void {
  const b = new MasonryBrush(c);
  const body = (): void => { c.beginPath(); c.rect(-half, yTop, half * 2, yBase - yTop); };
  b.sideFace(half, yBase, yTop, 9, BASALT, BASALT_WEAR);
  b.brickFace(body, -half, half, yTop, yBase, BASALT, v, 10, BASALT_WEAR, ground);
  // brilho de obsidiana: faixas verticais de luz fria no basalto polido, em tamanhos e lugares fixos
  c.save(); body(); c.clip();
  for (let k = 0; k < 3; k++) {
    const sx = -half + 6 + k * (half * 2 - 12) / 2.4 + (v % 2) * 3, sheen = c.createLinearGradient(sx, 0, sx + 5, 0);
    sheen.addColorStop(0, "rgba(185,168,216,0)"); sheen.addColorStop(0.5, "rgba(185,168,216,0.2)"); sheen.addColorStop(1, "rgba(185,168,216,0)");
    c.fillStyle = sheen; c.fillRect(sx, yTop + 2, 5, yBase - yTop - 4);
  }
  c.restore();
  // 5. cornija em três passadas
  c.fillStyle = OUTLINE; c.fillRect(-half - 4.6, yTop - 5.2, half * 2 + 9.2, 6.4);
  c.fillStyle = BASALT.base; c.fillRect(-half - 4, yTop - 4.6, half * 2 + 8, 5);
  c.fillStyle = rgba(GOLD.light, 0.55); c.fillRect(-half - 4, yTop - 4.6, half * 2 + 8, 0.9);
  body(); c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.stroke();
}

export function paintTorreDoSolNegro(c: CanvasRenderingContext2D): void {
  c.save();
  const b = new MasonryBrush(c);
  // 1. sombra de contato
  b.shadow(84, 150);
  b.rubble(3, 8, 76, BASALT);
  // 2-4. três degraus, do mais largo ao mais estreito, pintados de baixo para cima
  tier(c, TIERS[0].half, 0, TIERS[0].top, 3, true);
  tier(c, TIERS[1].half, TIERS[0].top - 5, TIERS[1].top, 4, false);
  tier(c, TIERS[2].half, TIERS[1].top - 5, TIERS[2].top, 5, false);
  b.occlusion(0, 0, 92);
  // 8. janelas estreitas aceso em violeta, porta com sol dourado, braseiros e estandarte negro
  b.window(-20, -34, 7, 15, BASALT, FLAME); b.window(20, -34, 7, 15, BASALT, FLAME);
  b.window(0, -80, 8, 16, BASALT, FLAME);
  b.window(0, -120, 7, 13, BASALT, FLAME);
  b.door(0, 0, 15, 24, BASALT);
  const sun = c.createRadialGradient(0, -33, 1, 0, -33, 6);
  sun.addColorStop(0, GOLD.light); sun.addColorStop(1, GOLD.base);
  ellipse(c, 0, -33, 5.4, 5.4, sun); c.beginPath(); c.arc(0, -33, 5.4, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  for (const side of [-1, 1]) {
    const x = side * 27;
    // braseiro de ferro com fogo violeta (brilho, chama e fio de luz)
    const glow = c.createRadialGradient(x, -17, 1, x, -17, 17);
    glow.addColorStop(0, rgba(FLAME, 0.55)); glow.addColorStop(1, rgba(FLAME, 0));
    c.fillStyle = glow; c.fillRect(x - 18, -36, 36, 36);
    b.line([[x, -2], [x, -11]], "#3b3f46", 2);
    b.poly([[x - 5.5, -11], [x + 5.5, -11], [x + 3, -6], [x - 3, -6]]); c.fillStyle = "#3b3f46"; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    b.poly([[x - 3.4, -11], [x + 0.4, -22], [x + 3.4, -11]]); c.fillStyle = FLAME; c.fill();
    b.poly([[x - 1.6, -11], [x + 0.6, -17], [x + 2, -11]]); c.fillStyle = shade(FLAME, 0.5); c.fill();
  }
  b.poly([[TIERS[0].half - 12, TIERS[0].top + 4], [TIERS[0].half - 1, TIERS[0].top + 4], [TIERS[0].half - 1, TIERS[0].top + 30], [TIERS[0].half - 6, TIERS[0].top + 25], [TIERS[0].half - 12, TIERS[0].top + 31]]);
  c.fillStyle = "#1b1424"; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  ellipse(c, TIERS[0].half - 6.5, TIERS[0].top + 15, 3, 3, GOLD.base);
  // o disco dourado no alto, com raios curtos, em cima de um pino de ferro
  const top = TIERS[2].top - 5;
  b.line([[0, top], [0, top - 14]], "#3b3f46", 2.2);
  const halo = c.createRadialGradient(0, top - 28, 2, 0, top - 28, 34);
  halo.addColorStop(0, rgba(GOLD.light, 0.5)); halo.addColorStop(1, rgba(GOLD.light, 0));
  c.fillStyle = halo; c.fillRect(-36, top - 64, 72, 72);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.line([[Math.cos(a) * 15, top - 28 + Math.sin(a) * 15], [Math.cos(a) * 21, top - 28 + Math.sin(a) * 21]], GOLD.base, 1.8); }
  const disc = c.createRadialGradient(-4, top - 32, 1, 0, top - 28, 15);
  disc.addColorStop(0, GOLD.light); disc.addColorStop(0.6, GOLD.base); disc.addColorStop(1, GOLD.dark);
  ellipse(c, 0, top - 28, 14, 14, disc);
  c.beginPath(); c.arc(0, top - 28, 14, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.stroke();
  ellipse(c, 0, top - 28, 6.5, 6.5, "#1b1424");
  b.sandSlope(-TIERS[0].half, TIERS[0].half, 3, 13);
  b.drift(-34, 3, 15, 3, 1); b.drift(36, 5, 14, 2.8, 2);
  // fuligem do fogo violeta sobe pela pedra acima dos braseiros e fagulhas soltas no ar
  for (const side of [-1, 1]) {
    const x = side * 27, soot = c.createLinearGradient(0, -44, 0, -22);
    soot.addColorStop(0, "rgba(14,8,20,0)"); soot.addColorStop(1, "rgba(14,8,20,0.55)");
    c.fillStyle = soot; c.fillRect(x - 6, -44, 12, 22);
    for (let k = 0; k < 4; k++) ellipse(c, x + (k - 1.5) * 2.6 + side, -26 - k * 4.4, 0.8, 0.8, k % 2 ? rgba(FLAME, 0.9) : rgba(shade(FLAME, 0.5), 0.9));
  }
  // 9. brilho especular por último
  b.line([[-TIERS[0].half + 1.4, -4], [-TIERS[0].half + 1.4, TIERS[0].top + 3]], rgba(GLINT, 0.55), 1);
  ellipse(c, -6, top - 34, 4, 2.2, rgba(GLINT, 0.7));
  c.restore();
}
