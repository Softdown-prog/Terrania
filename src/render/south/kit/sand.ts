import { ellipse, rgba } from "../../draw.ts";
import { GLINT, noise } from "./palette.ts";

/** Areia junto à base das torres (ADR 0041): montes com volume e a rampa que o vento empilha contra a parede. */
export class SandDrift {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  /** Monte de areia: degradê do lado da luz para o da sombra e uma crista clara. */
  drift(x: number, y: number, rx: number, ry: number, i: number): void {
    const c = this.c;
    ellipse(c, x + 1.2, y + 1.2, rx, ry, rgba("#a07f4d", 0.38));
    const g = c.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
    g.addColorStop(0, rgba("#ecd29a", 0.98)); g.addColorStop(0.55, rgba("#d3b377", 0.96)); g.addColorStop(1, rgba("#a07f4d", 0.9));
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill();
    c.beginPath(); c.ellipse(x - rx * 0.1, y - ry * 0.35, rx * (0.55 + noise(i, 3, 91) * 0.2), ry * 0.45, 0, Math.PI * 1.08, Math.PI * 1.7);
    c.strokeStyle = rgba(GLINT, 0.5); c.lineWidth = 0.8; c.stroke();
  }
  /** Rampa de areia encostada na parede, de `x0` a `x1`, que sobe uns 7 px e some, com a borda irregular.
   *  `gap` deixa livre a faixa da porta (−gap a +gap), para a entrada nunca ficar soterrada. */
  slope(x0: number, x1: number, v: number, gap = 0): void {
    if (gap > 0 && x0 < -gap && x1 > gap) { this.slope(x0, -gap, v); this.slope(gap, x1, v + 1); return; }
    const c = this.c;
    c.beginPath(); c.moveTo(x0, 1);
    for (let x = x0; x <= x1; x += 4) c.lineTo(x, -3 - noise(Math.floor(x), v, 93) * 4.5 - Math.sin((x - x0) / (x1 - x0) * Math.PI) * 2.5);
    c.lineTo(x1, 1); c.closePath();
    const g = c.createLinearGradient(0, -9, 0, 2);
    g.addColorStop(0, rgba("#ecd29a", 0.2)); g.addColorStop(0.5, rgba("#d3b377", 0.9)); g.addColorStop(1, rgba("#a07f4d", 0.95));
    c.fillStyle = g; c.fill();
    c.beginPath(); c.moveTo(x0 + 2, -4);
    for (let x = x0 + 2; x <= x1 - 2; x += 4) c.lineTo(x, -4 - noise(Math.floor(x), v, 93) * 4.5 - Math.sin((x - x0) / (x1 - x0) * Math.PI) * 2.5);
    c.strokeStyle = rgba(GLINT, 0.22); c.lineWidth = 0.8; c.stroke();
  }
}
