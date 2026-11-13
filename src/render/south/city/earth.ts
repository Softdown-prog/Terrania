import { hash2 } from "../../../world/random.ts";

/**
 * Detalhes do chão de terra de dentro dos muros (ADR 0050): em alguns tiles, um ou dois seixos com sombra, um tufo de capim
 * seco ou uma rachadura curta. Tudo sai de `hash2` da posição e da semente, então o mesmo tile é sempre igual; e é raro, para a
 * terra pisada continuar parecendo pisada (e o chunk da cidade continuar barato).
 */
export class CityEarth {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  /** Pinta os detalhes do tile de terra em (x, y) no canvas e (tx, ty) no mundo; devolve quantos desenhou (0 a 2). */
  paint(x: number, y: number, tx: number, ty: number, seed: number): number {
    const c = this.c, r = (i: number): number => hash2(tx * 13 + i * 7, ty * 11 + i * 3, seed + 2100 + i);
    let drawn = 0;
    if (r(0) < 0.34) {
      // seixos: um maior e, às vezes, um menor ao lado, com sombra a sudeste e a quina clara a noroeste
      for (let i = 0; i < (r(1) < 0.4 ? 2 : 1); i++) {
        const px = x + 5 + r(2 + i) * 22, py = y + 6 + r(4 + i) * 20, rx = 2 + r(6 + i) * 2.2;
        c.fillStyle = "rgba(60,40,24,0.35)"; c.beginPath(); c.ellipse(px + 0.9, py + 0.9, rx, rx * 0.6, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = i ? "#9a8466" : "#8d7757"; c.beginPath(); c.ellipse(px, py, rx, rx * 0.64, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = "rgba(255,246,220,0.45)"; c.beginPath(); c.ellipse(px - rx * 0.3, py - rx * 0.2, rx * 0.4, rx * 0.2, 0, 0, Math.PI * 2); c.fill();
      }
      drawn++;
    }
    if (r(8) < 0.13) {
      // tufo de capim seco: poucos fios curvos, de dois tons
      const px = x + 8 + r(9) * 16, py = y + 12 + r(10) * 14;
      for (let k = -2; k <= 2; k++) {
        c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + k * 1.6, py - 4, px + k * 2.6, py - 7 - Math.abs(k) * -0.6 - r(11 + k + 3) * 2);
        c.strokeStyle = k % 2 ? "#8a7a46" : "#a39a63"; c.lineWidth = 1; c.stroke();
      }
      drawn++;
    }
    if (drawn < 2 && r(16) < 0.07) {
      const px = x + 6 + r(17) * 14, py = y + 8 + r(18) * 14;
      c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + 6, py + 2, px + 9, py - 2); c.quadraticCurveTo(px + 12, py - 5, px + 15, py - 4);
      c.strokeStyle = "rgba(60,40,24,0.5)"; c.lineWidth = 0.9; c.stroke();
      drawn++;
    }
    return drawn;
  }
}
