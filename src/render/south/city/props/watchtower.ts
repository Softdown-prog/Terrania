import { rgba } from "../../../draw.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BONE, BRONZE, CLAY, CLAY_WEAR, GLINT, OUTLINE, STONE, WINE } from "../buildings/palette.ts";

/** Onde o fogo do braseiro da torre de guarda se apoia (relativo à base da torre): o centro do braseiro, no alto. */
export const WATCHTOWER_BRAZIER = { x: 0, y: -95 } as const;
const HALF = 23, TOP = -74;

/**
 * Torre de guarda da cidade (ADR 0049): alvenaria de barro com soco de pedra, frestas, estandarte e um braseiro de ferro
 * no alto. A variante 0 é a da esquerda do portão e a 1 a da direita (estandarte e brasa mudam de cor).
 */
export function paintCityWatchtower(c: CanvasRenderingContext2D, variant: number): void {
  const v = Number.isFinite(variant) && Math.round(variant) === 1 ? 1 : 0, k = new BuildingKit(c), b = k.b;
  b.shadow(HALF * 2, 90);
  b.rubble(70 + v, 4, 40, CLAY);
  b.sideFace(HALF, 0, TOP, 8, CLAY, CLAY_WEAR);
  k.facade(-HALF, HALF, TOP, 0, CLAY, 70 + v, "masonry", CLAY_WEAR);
  // soco de pedra roxa e faixa de bronze
  c.fillStyle = b.gradient(-HALF, HALF, STONE); c.fillRect(-HALF, -10, HALF * 2, 10);
  b.line([[-HALF, -10], [HALF, -10]], rgba(GLINT, 0.25), 0.9);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-HALF, -10, HALF * 2, 10);
  c.fillStyle = BRONZE.base; c.fillRect(-HALF, TOP + 12, HALF * 2, 2.4);
  c.fillStyle = rgba(GLINT, 0.5); c.fillRect(-HALF, TOP + 12, HALF * 2, 0.8);
  // frestas de arqueiro em dois andares
  for (const [x, y] of [[-9, -52], [9, -52], [0, -30]] as const) {
    c.fillStyle = "#0b1519"; c.beginPath(); c.moveTo(x - 2.6, y + 14); c.lineTo(x - 2.6, y + 2.6); c.arc(x, y + 2.6, 2.6, Math.PI, 0); c.lineTo(x + 2.6, y + 14); c.closePath(); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  }
  // cornija e ameias de osso
  c.fillStyle = b.gradient(-HALF - 3, HALF + 3, BONE); c.fillRect(-HALF - 3, TOP - 5, HALF * 2 + 6, 5);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-HALF - 3, TOP - 5, HALF * 2 + 6, 5);
  k.crenels(-HALF - 3, HALF + 3, TOP - 5, 5, 10, BONE);
  // estandarte pendurado na face da frente, na cor da brasa da sua torre
  const bx = v === 0 ? -HALF + 6 : HALF - 6, flag = v === 0 ? WINE : { light: "#8bd450", base: "#5aa032", dark: "#356a1f" };
  b.poly([[bx - 4.5, TOP + 16], [bx + 4.5, TOP + 16], [bx + 4.5, TOP + 36], [bx, TOP + 31], [bx - 4.5, TOP + 36]]);
  c.fillStyle = b.gradient(bx - 4.5, bx + 4.5, flag); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  // braseiro de ferro no alto: a bacia, o pé e as brasas (o fogo é animado, ver flames.ts)
  const by = TOP - 15;
  b.poly([[-9, by], [9, by], [6, by + 8], [-6, by + 8]]); c.fillStyle = "#3b3f46"; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  b.line([[-9, by + 0.6], [9, by + 0.6]], rgba(GLINT, 0.4), 0.9);
  c.fillStyle = v === 0 ? "#8a3b5c" : "#5aa032"; c.beginPath(); c.ellipse(0, by, 8, 2.6, 0, 0, Math.PI * 2); c.fill();
  b.sandSlope(-HALF, HALF, 80 + v);
  b.drift(-22, 3, 11, 2.4, 1); b.drift(24, 4, 10, 2.2, 2);
  b.line([[-HALF + 1.4, -3], [-HALF + 1.4, TOP + 3]], rgba(GLINT, 0.55), 1);
}
