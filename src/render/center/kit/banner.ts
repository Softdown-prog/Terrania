import { ellipse, rgba } from "../../draw.ts";
import { GLINT, GOLD, OUTLINE, ROYAL } from "./palette.ts";

/**
 * Estandarte da capital: pano azul com a borda dourada, o sol dourado da Concórdia e a ponta em V. O pano pende reto,
 * com uma dobra de luz à esquerda e outra de sombra à direita. A origem é o meio da barra de cima.
 */
export class Banner {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  /** Pano de largura `w` e comprimento `h` (a ponta em V incluída), com a barra de cima em (x, y). */
  hang(x: number, y: number, w: number, h: number): void {
    const c = this.c, hw = w / 2, notch = Math.min(9, h * 0.22);
    // barra de madeira com as pontas douradas
    c.fillStyle = "#5a3a24"; c.fillRect(x - hw - 2, y - 2.2, w + 4, 2.6);
    ellipse(c, x - hw - 2.4, y - 0.9, 1.8, 1.8, GOLD.base); ellipse(c, x + hw + 2.4, y - 0.9, 1.8, 1.8, GOLD.base);
    // pano com a ponta em V
    const cloth = (): void => {
      c.beginPath(); c.moveTo(x - hw, y); c.lineTo(x + hw, y);
      c.quadraticCurveTo(x + hw + 0.8, y + h * 0.5, x + hw, y + h); c.lineTo(x, y + h - notch); c.lineTo(x - hw, y + h);
      c.quadraticCurveTo(x - hw - 0.8, y + h * 0.5, x - hw, y); c.closePath();
    };
    const g = c.createLinearGradient(x - hw, 0, x + hw, 0);
    g.addColorStop(0, ROYAL.light); g.addColorStop(0.4, ROYAL.base); g.addColorStop(1, ROYAL.dark);
    cloth(); c.fillStyle = g; c.fill();
    c.save(); cloth(); c.clip();
    c.strokeStyle = GOLD.base; c.lineWidth = 1.6; c.strokeRect(x - hw + 1.4, y + 1.4, w - 2.8, h);
    // dobras do pano: luz à esquerda, sombra à direita
    c.fillStyle = rgba(GLINT, 0.16); c.fillRect(x - hw + 2, y, 2.4, h);
    c.fillStyle = rgba(OUTLINE, 0.22); c.fillRect(x + hw - 4.4, y, 2.6, h);
    // o sol: disco com oito raios curtos
    const sx = x, sy = y + Math.min(h * 0.38, w * 0.9), r = Math.min(hw * 0.5, 5.5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.ray(sx, sy, a, r + 1.2, r + 3.4);
    }
    ellipse(c, sx, sy, r, r, GOLD.base); ellipse(c, sx - r * 0.25, sy - r * 0.3, r * 0.5, r * 0.4, rgba(GOLD.light, 0.9));
    c.restore();
    cloth(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  }
  private ray(x: number, y: number, a: number, r0: number, r1: number): void {
    const c = this.c;
    c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    c.strokeStyle = GOLD.base; c.lineWidth = 1.1; c.stroke();
  }
}
