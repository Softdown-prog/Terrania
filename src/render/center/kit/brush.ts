import { ellipse, rgba, softShadow } from "../../draw.ts";
import { GLINT, MOSS, STAIN, noise, type Point, type Ramp } from "./palette.ts";

/**
 * Pincel de pedra da região central (ADR 0056): degradê de volume, polígonos, traços, sombra de contato, musgo e fuligem.
 * São métodos de uma classe porque o portão de arte exige registrar toda função exportada que recebe um Canvas, e as
 * peças daqui são a muralha, o portão e as torres. Origem (0, 0) = o pé da peça, no centro da frente.
 */
export class StoneBrush {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  /** Degradê horizontal da luz (esquerda) à sombra (direita). */
  gradient(x0: number, x1: number, ramp: Ramp): CanvasGradient {
    const g = this.c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, ramp.light); g.addColorStop(0.42, ramp.base); g.addColorStop(1, ramp.dark);
    return g;
  }
  /** Degradê vertical, de cima (claro) a baixo (escuro). */
  vertical(y0: number, y1: number, ramp: Ramp): CanvasGradient {
    const g = this.c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, ramp.light); g.addColorStop(0.5, ramp.base); g.addColorStop(1, ramp.dark);
    return g;
  }
  poly(pts: readonly Point[]): void {
    const c = this.c;
    c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
    c.closePath();
  }
  line(pts: readonly Point[], color: string, width = 1): void {
    const c = this.c;
    c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
    c.strokeStyle = color; c.lineWidth = width; c.stroke();
  }
  /** Sombra no chão, projetada para a direita e para baixo (a luz vem de noroeste). */
  shadow(width: number, height: number): void {
    softShadow(this.c, width * 0.28, 4, width * 0.78 + height * 0.16, 9, 0.36);
  }
  /** Manchas de musgo que sobem do chão pela pedra: `v` muda o desenho; só entra onde o sorteio mandar. */
  moss(x0: number, x1: number, yBase: number, height: number, v: number): void {
    const c = this.c;
    for (let x = x0; x < x1; x += 7) {
      const n = noise(Math.round(x), v, 301);
      if (n < 0.45) continue;
      const h = height * (0.35 + n * 0.65), g = c.createLinearGradient(0, yBase - h, 0, yBase);
      g.addColorStop(0, rgba(MOSS.base, 0)); g.addColorStop(1, rgba(MOSS.dark, 0.5 + n * 0.25));
      c.fillStyle = g; c.fillRect(x, yBase - h, 7, h);
      ellipse(c, x + 3.5, yBase - h * 0.3, 2.2, 1.1, rgba(MOSS.light, 0.55));
    }
  }
  /** Riscos de chuva que descem de um ponto, em curva, na cor da fuligem. */
  streak(x: number, y: number, length: number, alpha = 0.4): void {
    const c = this.c, g = c.createLinearGradient(0, y, 0, y + length);
    g.addColorStop(0, rgba(STAIN, alpha)); g.addColorStop(1, rgba(STAIN, 0));
    c.fillStyle = g; c.fillRect(x - 1, y, 2.4, length);
  }
  /** Um clarão de luz na quina de cima e à esquerda de uma peça. */
  glint(x0: number, x1: number, y: number, alpha = 0.5): void {
    this.line([[x0, y], [x1, y]], rgba(GLINT, alpha), 0.9);
  }
}
