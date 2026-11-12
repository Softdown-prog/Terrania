import { ellipse, rgba, shade } from "../../draw.ts";
import { GLINT, OUTLINE, PALE_STONE, MasonryBrush, PATINA_WEAR } from "../kit/index.ts";

/** Torre da Miragem: alta, esguia e afunilada, com faixas de pedra, janelas de vidro violeta aceso e cúpula de vidro. */
const BASE = 24, TOP = 19, HEIGHT = 150;
const VIOLET = { light: "#c9a8ff", base: "#8a5be0", dark: "#3d2578" } as const;
const halfAt = (y: number): number => BASE + (TOP - BASE) * Math.min(1, -y / HEIGHT);

export function paintTorreDaMiragem(c: CanvasRenderingContext2D): void {
  c.save();
  const b = new MasonryBrush(c);
  // 1. sombra de contato e, ao pé da torre, a miragem: um véu claro e fraco no chão
  b.shadow(BASE * 2, HEIGHT);
  ellipse(c, 0, 5, 44, 6, rgba("#f3e7cb", 0.14));
  ellipse(c, -6, 3, 30, 3.4, rgba("#c9a8ff", 0.12));
  b.rubble(2, 6, 50, PALE_STONE);
  // 2. silhueta afunilada com anel de pedra no alto, onde a cúpula se assenta
  const body = (): void => b.poly([[-BASE, 0], [-TOP, -HEIGHT], [TOP, -HEIGHT], [BASE, 0]]);
  // 3-4. volume e material
  b.sideFace(BASE, 0, -HEIGHT, 8, PALE_STONE, PATINA_WEAR);
  b.brickFace(body, -BASE, BASE, -HEIGHT, 0, PALE_STONE, 2, 8, PATINA_WEAR);
  // 5. faixas ornamentais em três passadas (sombra, pedra, fio de luz) nos limites dos andares
  for (const y of [-50, -100, -HEIGHT + 4]) {
    const w = halfAt(y) + 3;
    c.fillStyle = OUTLINE; c.fillRect(-w - 0.6, y - 4.6, w * 2 + 1.2, 6);
    c.fillStyle = PALE_STONE.base; c.fillRect(-w, y - 4, w * 2, 4.6);
    c.fillStyle = rgba(GLINT, 0.5); c.fillRect(-w, y - 4, w * 2, 0.9);
    // azinhavre que escorre da faixa, em três riscos de comprimento próprio
    for (let k = 0; k < 3; k++) {
      const x = -w * 0.6 + k * w * 0.55 + (k % 2) * 2, len = 9 + ((k * 7 + Math.round(-y)) % 9);
      const g = c.createLinearGradient(0, y + 0.6, 0, y + 0.6 + len);
      g.addColorStop(0, rgba(PATINA_WEAR.lichenA, 0.75)); g.addColorStop(1, rgba(PATINA_WEAR.lichenA, 0));
      c.fillStyle = g; c.fillRect(x, y + 0.6, 1.8, len);
    }
  }
  // 6-7. oclusão e contorno único
  b.occlusion(0, 0, BASE * 2 + 4);
  body(); c.strokeStyle = OUTLINE; c.lineWidth = 1.3; c.stroke();
  // 8. janelas de vidro violeta aceso, três por andar, e a porta com moldura em arco
  b.window(0, -34, 9, 17, PALE_STONE, VIOLET.base);
  b.window(-8, -78, 8, 15, PALE_STONE, VIOLET.base); b.window(8, -78, 8, 15, PALE_STONE, VIOLET.base);
  b.window(0, -124, 9, 16, PALE_STONE, VIOLET.light);
  // luz violeta das janelas que vaza para a pedra em volta
  for (const [wx, wy, wr] of [[0, -34, 14], [-8, -78, 12], [8, -78, 12], [0, -124, 13]] as const) {
    const spill = c.createRadialGradient(wx, wy - 8, 1, wx, wy - 8, wr);
    spill.addColorStop(0, rgba(VIOLET.light, 0.32)); spill.addColorStop(1, rgba(VIOLET.light, 0));
    c.fillStyle = spill; c.fillRect(wx - wr, wy - 8 - wr, wr * 2, wr * 2);
  }
  b.door(0, 0, 13, 21, PALE_STONE);
  // cúpula de vidro violeta com anel de pedra, mastro e esfera no alto
  const dome = c.createLinearGradient(-TOP, -HEIGHT - 26, TOP, -HEIGHT);
  dome.addColorStop(0, VIOLET.light); dome.addColorStop(0.5, VIOLET.base); dome.addColorStop(1, VIOLET.dark);
  c.beginPath(); c.moveTo(-TOP - 1, -HEIGHT); c.quadraticCurveTo(-TOP - 1, -HEIGHT - 30, 0, -HEIGHT - 31);
  c.quadraticCurveTo(TOP + 1, -HEIGHT - 30, TOP + 1, -HEIGHT); c.closePath();
  c.fillStyle = dome; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.stroke();
  for (const dx of [-9, 0, 9]) b.line([[dx, -HEIGHT], [dx * 0.55, -HEIGHT - 29]], rgba(shade(VIOLET.dark, -0.2), 0.7), 0.9);
  b.line([[0, -HEIGHT - 31], [0, -HEIGHT - 43]], OUTLINE, 1.6);
  ellipse(c, 0, -HEIGHT - 45, 3.2, 3.2, VIOLET.light); c.beginPath(); c.arc(0, -HEIGHT - 45, 3.2, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  const glow = c.createRadialGradient(0, -HEIGHT - 45, 1, 0, -HEIGHT - 45, 22);
  glow.addColorStop(0, rgba(VIOLET.light, 0.4)); glow.addColorStop(1, rgba(VIOLET.light, 0));
  c.fillStyle = glow; c.fillRect(-24, -HEIGHT - 68, 48, 46);
  b.sandSlope(-BASE, BASE, 2, 11);
  b.drift(-20, 3, 12, 2.6, 1); b.drift(18, 5, 11, 2.4, 2);
  // 9. brilho especular por último: aresta clara da pedra e reflexo na cúpula
  b.line([[-BASE + 1.4, -4], [-TOP + 1.4, -HEIGHT + 3]], rgba(GLINT, 0.7), 1);
  c.beginPath(); c.ellipse(-8, -HEIGHT - 18, 5, 9, -0.5, 0, Math.PI * 2); c.fillStyle = rgba(GLINT, 0.5); c.fill();
  c.restore();
}
