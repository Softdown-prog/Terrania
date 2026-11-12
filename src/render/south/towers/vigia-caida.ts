import { ellipse, rgba } from "../../draw.ts";
import { GLINT, OUTLINE, SANDSTONE, MasonryBrush, WOOD, noise } from "../kit/index.ts";

/** Torre do Vigia Caída: guarita de pedra do deserto, topo quebrado, plataforma de madeira que sobrou e um estandarte rasgado. */
const HALF = 31, HEIGHT = 112, DEPTH = 14;

export function paintTorreDoVigiaCaida(c: CanvasRenderingContext2D): void {
  c.save();
  const b = new MasonryBrush(c);
  // 1. sombra de contato, antes de qualquer forma
  b.shadow(HALF * 2, HEIGHT);
  b.rubble(1, 9, 62, SANDSTONE);
  // 2. silhueta: corpo de pedra com o topo em dentes quebrados (alturas fixas por sorteio)
  const top: Array<readonly [number, number]> = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const k = i / n, h = HEIGHT - 4 - Math.abs(Math.sin(i * 1.9 + 0.6)) * 20 - (i === 5 || i === 6 ? 14 : 0) - noise(i, 1, 23) * 5;
    top.push([-HALF + k * HALF * 2, -h]);
  }
  const body = (): void => b.poly([[-HALF, 0], ...top, [HALF, 0]]);
  // 3-4. volume e material recortado na silhueta
  // dentes do topo quebrado: a espessura da parede à mostra, em tom mais claro, atrás da face frontal
  b.crown(top, SANDSTONE);
  b.sideFace(HALF, 0, -HEIGHT + 22, DEPTH, SANDSTONE);
  b.brickFace(body, -HALF, HALF, -HEIGHT, 0, SANDSTONE, 1);
  // faixa do segundo andar e frestas de arqueiro
  b.line([[-HALF, -52], [HALF, -52]], rgba(SANDSTONE.dark, 0.85), 1.6);
  b.line([[-HALF, -53.4], [HALF, -53.4]], rgba(SANDSTONE.light, 0.7), 0.9);
  for (const x of [-16, 16]) { c.fillStyle = "#0b1519"; c.fillRect(x - 1.6, -88, 3.2, 13); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x - 1.6, -88, 3.2, 13); }
  b.window(0, -62, 11, 18, SANDSTONE);
  // rachadura que desce do topo quebrado
  b.line([[6, -100], [3, -86], [8, -74], [5, -60]], rgba("#2c1f14", 0.7), 1.3);
  // 5. plataforma de madeira que sobrou, saindo do alto à esquerda (acabamento em 3 passadas)
  for (let i = 0; i < 4; i++) {
    const x = -HALF - 14 + i * 5.2, y = -78 + i * 0.4;
    c.fillStyle = OUTLINE; c.fillRect(x - 0.6, y - 0.6, 5.2, 4.2);
    c.fillStyle = b.gradient(x, x + 4, WOOD); c.fillRect(x, y, 4, 3);
    c.fillStyle = rgba(GLINT, 0.4); c.fillRect(x, y, 4, 0.7);
  }
  b.line([[-HALF - 14, -76], [-HALF - 1, -64]], WOOD.dark, 1.6);
  // 6-7. oclusão na base e contorno único do corpo
  b.occlusion(0, 0, HALF * 2 + 6);
  body(); c.strokeStyle = OUTLINE; c.lineWidth = 1.3; c.stroke();
  // 8. profundidade: porta com moldura em arco, estandarte vinho rasgado preso ao lado direito, areia na base
  b.door(0, 0, 14, 22, SANDSTONE);
  const bx = HALF - 5, by = -48;
  b.poly([[bx, by], [bx + 11, by + 1], [bx + 12, by + 23], [bx + 8, by + 19], [bx + 5, by + 28], [bx + 2, by + 21], [bx, by + 30]]);
  c.fillStyle = "#5e2440"; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  b.line([[bx + 1, by + 3], [bx + 11, by + 3]], rgba("#d9a24a", 0.9), 1.2);
  b.sandSlope(-HALF, HALF, 1, 12);
  b.drift(-24, 3, 14, 3, 1); b.drift(22, 5, 12, 2.6, 2); b.drift(4, 8, 9, 2, 3);
  // vigas e tábuas caídas da plataforma, ao pé da parede, do lado da sombra
  for (const [x, y, w, a] of [[26, 11, 20, -0.12], [-38, 13, 14, 0.18]] as const) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = OUTLINE; c.fillRect(-w / 2 - 0.6, -2.6, w + 1.2, 5.2);
    c.fillStyle = b.gradient(-w / 2, w / 2, WOOD); c.fillRect(-w / 2, -2, w, 4);
    b.line([[-w / 2 + 2, -0.6], [w / 2 - 3, -0.6]], rgba(GLINT, 0.4), 0.8);
    c.restore();
  }
  ellipse(c, -4, 2, 3, 1.2, rgba("#1e1410", 0.25));
  // 9. brilho especular por último, do lado da luz
  b.line([[-HALF + 1.4, -4], [-HALF + 1.4, top[0]![1] + 4]], rgba(GLINT, 0.65), 1);
  b.line(top.slice(0, 3).map(([x, y]) => [x + 0.6, y + 1] as const), rgba(GLINT, 0.7), 1);
  c.restore();
}
