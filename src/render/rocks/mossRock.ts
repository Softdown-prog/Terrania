import { hash2 } from "../../world/random.ts";
import { ellipse, rgba } from "../draw.ts";

/**
 * A pedra de sempre (cinza-esverdeada, com musgo no pé), movida de `scenery.ts` sem mudar o desenho (ADR 0035).
 * `b` é o formato (0 a 5): só balança os vértices do contorno.
 */
export function drawMossRock(c: CanvasRenderingContext2D, b: number): void {
  const j = (i: number): number => (hash2(i, b, 77) - 0.5) * 3;
  const P: Array<[number, number]> = [
    [-14 + j(1), 0], [-15 + j(2), -10 + j(3)], [-7 + j(4), -20 + j(5)], [6 + j(6), -19 + j(7)], [15 + j(8), -9 + j(9)], [13 + j(10), 0],
  ];
  ellipse(c, 2, 1, 19, 5, rgba("#102a21", 0.35));
  c.fillStyle = "#3d4c43";
  c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill();
  const top = c.createLinearGradient(-12, -20, 8, -6);
  top.addColorStop(0, "#c2c4ae"); top.addColorStop(1, "#8d9583");
  c.fillStyle = top;
  c.beginPath(); c.moveTo(P[1]![0], P[1]![1]); c.lineTo(P[2]![0], P[2]![1]); c.lineTo(P[3]![0], P[3]![1]); c.lineTo(1, -6); c.closePath(); c.fill();
  c.fillStyle = "#6f7e70";
  c.beginPath(); c.moveTo(1, -6); c.lineTo(P[3]![0], P[3]![1]); c.lineTo(P[4]![0], P[4]![1]); c.lineTo(P[5]![0], P[5]![1]); c.closePath(); c.fill();
  c.fillStyle = "#56655a";
  c.beginPath(); c.moveTo(P[0]![0], P[0]![1]); c.lineTo(P[1]![0], P[1]![1]); c.lineTo(1, -6); c.lineTo(P[5]![0], P[5]![1]); c.closePath(); c.fill();
  c.strokeStyle = rgba("#1d2b25", 0.6); c.lineWidth = 1;
  c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.stroke();
  c.strokeStyle = rgba("#1d2b25", 0.5);
  c.beginPath(); c.moveTo(-3, -17); c.lineTo(-5, -10); c.lineTo(-2, -6); c.moveTo(8, -12); c.lineTo(5, -8); c.stroke();
  c.strokeStyle = rgba("#ffffff", 0.45);
  c.beginPath(); c.moveTo(P[1]![0] + 1.4, P[1]![1] - 0.6); c.lineTo(P[2]![0] + 0.6, P[2]![1] + 1); c.lineTo(P[3]![0] - 1, P[3]![1] + 0.6); c.stroke();
  ellipse(c, -6, -2.4, 8, 2.8, "#6f8d4f"); ellipse(c, -7, -3.2, 5, 1.6, "#93b261");
  ellipse(c, 11, -1.2, 3, 1.5, "#7a9a58");
  ellipse(c, 17, 0.4, 2.6, 1.7, "#7d8a78"); ellipse(c, -19, 0.8, 2, 1.3, "#6a766a");
}
