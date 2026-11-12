import { ellipse, rgba } from "../../draw.ts";
import { GLINT, LICHEN, OUTLINE, SAND, STAIN, noise, type Ramp } from "./palette.ts";

/** Pincéis que as peças das ruínas dividem (degradê de volume, polígono, traço, sombra de contato e areia acumulada). */
export class RuinBrush {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }
  readonly volume = (x0: number, x1: number, ramp: Ramp): CanvasGradient => {
    const g = this.c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, ramp.light); g.addColorStop(0.42, ramp.base); g.addColorStop(1, ramp.dark);
    return g;
  };
  readonly poly = (pts: ReadonlyArray<readonly [number, number]>): void => {
    const c = this.c;
    c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
    c.closePath();
  };
  readonly line = (pts: ReadonlyArray<readonly [number, number]>, color: string, width = 1): void => {
    const c = this.c;
    c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
    c.strokeStyle = color; c.lineWidth = width; c.stroke();
  };
  /** Escurece onde a peça encontra o chão (oclusão ambiente). */
  readonly occlusion = (x: number, y: number, w: number): void => {
    const c = this.c, g = c.createLinearGradient(0, y - 7, 0, y + 1);
    g.addColorStop(0, rgba("#2c1f14", 0)); g.addColorStop(1, rgba("#2c1f14", 0.42));
    c.fillStyle = g; c.fillRect(x - w / 2, y - 7, w, 8);
  };
  /** Areia acumulada pelo vento: monte com volume (claro no lado da luz, sombra no outro) e uma crista fina. */
  readonly drift = (x: number, y: number, rx: number, ry: number, v: number, i: number): void => {
    const c = this.c, k = noise(i, v, 7);
    ellipse(c, x + 1.2, y + 1.2, rx, ry, rgba(SAND.dark, 0.38));
    const g = c.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
    g.addColorStop(0, rgba(SAND.light, 0.98)); g.addColorStop(0.55, rgba(SAND.base, 0.96)); g.addColorStop(1, rgba(SAND.dark, 0.9));
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill();
    // crista: um traço claro curto no alto do monte, que muda de comprimento por sorteio
    c.beginPath(); c.ellipse(x - rx * 0.1, y - ry * 0.35, rx * (0.55 + k * 0.2), ry * 0.45, 0, Math.PI * 1.08, Math.PI * 1.7);
    c.strokeStyle = rgba(GLINT, 0.5); c.lineWidth = 0.8; c.stroke();
  };
  /** Riscos de chuva e fuligem que descem do topo (o chamador recorta na silhueta da peça). */
  readonly streaks = (x0: number, x1: number, yTop: number, yBase: number, seed: number, v: number): void => {
    const c = this.c, n = Math.max(2, Math.round((x1 - x0) / 14));
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.3 + noise(i, v, seed) * 0.5) / n) * (x1 - x0), len = (yBase - yTop) * (0.45 + noise(i, v, seed + 3) * 0.5);
      const g = c.createLinearGradient(0, yTop, 0, yTop + len);
      g.addColorStop(0, rgba(STAIN.dark, 0.5)); g.addColorStop(1, rgba(STAIN.dark, 0));
      c.fillStyle = g; c.fillRect(x, yTop, 1.6 + noise(i, v, seed + 5) * 1.4, len);
    }
  };
  /** Mancha de líquen: um disco ocre e um olivo menor por cima, nunca regular. */
  readonly lichen = (x: number, y: number, r: number): void => {
    const c = this.c;
    ellipse(c, x, y, r, r * 0.62, rgba(LICHEN.ochre, 0.7));
    ellipse(c, x - r * 0.25, y - r * 0.1, r * 0.55, r * 0.34, rgba(LICHEN.olive, 0.75));
  };
  /** Bloco lapidado caído: três faces (topo claro, frente, lado escuro), contorno e sombra de contato. */
  readonly rubble = (x: number, y: number, s: number, ramp: Ramp, turn: number): void => {
    const c = this.c, d = s * 0.45, lean = (turn - 0.5) * s * 0.3;
    ellipse(c, x + s * 0.35, y + 1, s * 0.9, s * 0.28, rgba("#2c1f14", 0.32));
    this.poly([[x, y], [x + s, y + lean * 0.2], [x + s, y - s * 0.55 + lean * 0.2], [x, y - s * 0.55]]);
    c.fillStyle = this.volume(x, x + s, ramp); c.fill();
    this.poly([[x, y - s * 0.55], [x + s, y - s * 0.55 + lean * 0.2], [x + s + d * 0.6, y - s * 0.55 - d * 0.5], [x + d * 0.6, y - s * 0.55 - d * 0.5]]);
    c.fillStyle = ramp.light; c.fill();
    this.poly([[x + s, y + lean * 0.2], [x + s + d * 0.6, y - d * 0.5], [x + s + d * 0.6, y - s * 0.55 - d * 0.5], [x + s, y - s * 0.55 + lean * 0.2]]);
    c.fillStyle = ramp.dark; c.fill();
    this.poly([[x, y], [x + s, y + lean * 0.2], [x + s + d * 0.6, y - d * 0.5], [x + s + d * 0.6, y - s * 0.55 - d * 0.5], [x + d * 0.6, y - s * 0.55 - d * 0.5], [x, y - s * 0.55]]);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  };
  /** Brilho fino da quina voltada para a luz. */
  readonly glintLine = (pts: ReadonlyArray<readonly [number, number]>, alpha = 0.7): void => this.line(pts, rgba(GLINT, alpha), 1);
}
