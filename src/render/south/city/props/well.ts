import { ellipse, rgba } from "../../../draw.ts";
import { noise } from "../../kit/index.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BONE, BRONZE, CLAY, GLINT, OUTLINE, STONE, WOOD } from "../buildings/palette.ts";

/** A água do poço: elipse de dentro (centro e raios) em px, relativa ao centro do poço. */
export const WELL_WATER = { x: 0, y: -5, rx: 49, ry: 30 } as const;

/**
 * Poço Negro (ADR 0049): o poço que dá nome à cidade. Borda de pedra em blocos com volume (os de trás mais escuros, os de
 * frente mais claros), água escura funda com degradê, a pedra molhada logo acima da linha d'água, e no meio o totem de osso
 * com a caveira, a travessa de madeira, a corda e o balde. A água se mexe por cima (ver flames.ts); aqui fica o que não muda.
 */
export function paintCityWell(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b;
  // sombra para a direita e para baixo
  ellipse(c, 8, 8, 72, 46, "rgba(34,26,43,0.34)");
  ellipse(c, 0, 4, 67, 45, STONE.dark);
  // anel de blocos: primeiro os do fundo (mais escuros), depois a água, depois os da frente (mais claros, por cima)
  const ring = 22, blocks = (front: boolean): void => {
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2, s = Math.sin(a);
      if ((s >= -0.05) !== front) continue;
      const x = Math.cos(a) * 58, y = -2 + s * 38, w = 14 + noise(i, 1, 281) * 3, h = 10 + (front ? 4 : 0);
      const tone = front ? STONE.light : STONE.base;
      const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, tone); g.addColorStop(1, STONE.dark); c.fillStyle = g;
      c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 2.4); c.fill();
      c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
      c.fillStyle = rgba(GLINT, front ? 0.3 : 0.12); c.fillRect(x - w / 2 + 1, y - h / 2 + 1, w - 3, 1.2);
    }
  };
  blocks(false);
  // água: degradê do claro (reflexo do céu) ao negro do fundo, com a pedra molhada na borda
  ellipse(c, 0, -5, 53, 33, rgba("#1b1424", 0.9));
  const water = c.createRadialGradient(-16, -18, 2, 0, -5, 56);
  water.addColorStop(0, "#4b5870"); water.addColorStop(0.55, "#232b3b"); water.addColorStop(1, "#0d121a");
  c.fillStyle = water; c.beginPath(); c.ellipse(WELL_WATER.x, WELL_WATER.y, WELL_WATER.rx, WELL_WATER.ry, 0, 0, Math.PI * 2); c.fill();
  ellipse(c, -10, -9, 30, 11, rgba("#7f8fb0", 0.2));
  c.beginPath(); c.ellipse(WELL_WATER.x, WELL_WATER.y, WELL_WATER.rx, WELL_WATER.ry, 0, Math.PI * 0.05, Math.PI * 0.95);
  c.strokeStyle = rgba("#0d121a", 0.7); c.lineWidth = 3; c.stroke();
  blocks(true);
  c.beginPath(); c.ellipse(0, -2, 58, 38, 0, Math.PI * 1.05, Math.PI * 1.9); c.strokeStyle = rgba(GLINT, 0.55); c.lineWidth = 1.2; c.stroke();
  // totem de osso no meio: poste com volume, travessa de madeira, balde de bronze pendurado por uma corda e a caveira grande
  c.fillStyle = b.gradient(-5, 5, BONE); c.fillRect(-4, -50, 8, 46);
  for (const y of [-40, -28, -16]) b.line([[-4, y], [4, y + 1]], rgba(BONE.dark, 0.5), 0.8);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-4, -50, 8, 46);
  c.fillStyle = b.gradient(-14, 14, WOOD); c.fillRect(-14, -46, 28, 6);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-14, -46, 28, 6);
  b.line([[8, -40], [8, -20]], rgba("#d3c3a0", 0.95), 1);
  c.fillStyle = b.gradient(4, 12, BRONZE); c.beginPath(); c.moveTo(4, -20); c.lineTo(12, -20); c.lineTo(11, -12); c.lineTo(5, -12); c.closePath(); c.fill();
  c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  k.skull(0, -50, 1.9);
  // areia soprada sobre a borda e pedrinhas no entorno
  b.drift(-52, 22, 14, 3, 1); b.drift(50, 24, 13, 2.8, 2); b.drift(-6, 44, 16, 3, 3);
  for (let i = 0; i < 5; i++) ellipse(c, -60 + noise(i, 2, 283) * 120, 38 + noise(i, 3, 285) * 8, 1.6 + noise(i, 4, 287) * 1.4, 1, i % 2 ? CLAY.dark : CLAY.light);
}
