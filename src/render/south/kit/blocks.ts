import { ellipse, rgba } from "../../draw.ts";
import { OUTLINE, noise, type Point, type Ramp } from "./palette.ts";

/**
 * Entulho em volta da base (ADR 0041): blocos lapidados caídos, com três faces, contorno e sombra, e seixos miúdos
 * entre eles. De tamanho, giro e lugar fixos por sorteio (`noise`).
 */
export class MasonryBlocks {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  private poly(pts: readonly Point[]): void {
    const c = this.c;
    c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
    c.closePath();
  }
  /** Um bloco de largura `s` com a base em (x, y): frente com volume, topo claro e lado escuro. */
  block(x: number, y: number, s: number, ramp: Ramp, turn: number): void {
    const c = this.c, d = s * 0.45, lean = (turn - 0.5) * s * 0.3;
    ellipse(c, x + s * 0.35, y + 1, s * 0.9, s * 0.28, rgba("#2c1f14", 0.32));
    const g = c.createLinearGradient(x, 0, x + s, 0);
    g.addColorStop(0, ramp.light); g.addColorStop(0.42, ramp.base); g.addColorStop(1, ramp.dark);
    this.poly([[x, y], [x + s, y + lean * 0.2], [x + s, y - s * 0.55 + lean * 0.2], [x, y - s * 0.55]]);
    c.fillStyle = g; c.fill();
    this.poly([[x, y - s * 0.55], [x + s, y - s * 0.55 + lean * 0.2], [x + s + d * 0.6, y - s * 0.55 - d * 0.5], [x + d * 0.6, y - s * 0.55 - d * 0.5]]);
    c.fillStyle = ramp.light; c.fill();
    this.poly([[x + s, y + lean * 0.2], [x + s + d * 0.6, y - d * 0.5], [x + s + d * 0.6, y - s * 0.55 - d * 0.5], [x + s, y - s * 0.55 + lean * 0.2]]);
    c.fillStyle = ramp.dark; c.fill();
    this.poly([[x, y], [x + s, y + lean * 0.2], [x + s + d * 0.6, y - d * 0.5], [x + s + d * 0.6, y - s * 0.55 - d * 0.5], [x + d * 0.6, y - s * 0.55 - d * 0.5], [x, y - s * 0.55]]);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  }
  /** `count` peças em volta da base: a cada três, um seixo; as outras são blocos. */
  scatter(v: number, count: number, spread: number, ramp: Ramp): void {
    const c = this.c;
    for (let i = 0; i < count; i++) {
      const side = noise(i, v, 11) < 0.5 ? -1 : 1, x = side * (spread * 0.4 + noise(i, v, 13) * spread * 0.6);
      const y = 4 + noise(i, v, 17) * 20, r = 1.6 + noise(i, v, 19) * 3.6;
      if (i % 3 === 2) {
        ellipse(c, x + 1, y + 1, r * 1.3, r * 0.6, rgba("#2c1f14", 0.3));
        ellipse(c, x, y, r, r * 0.62, i % 2 ? ramp.base : ramp.light);
      } else this.block(x - r, y + 2, 4 + r * 1.6, ramp, noise(i, v, 21));
    }
  }
}
