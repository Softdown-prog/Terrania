import { hash2 } from "../../../world/random.ts";
import { ellipse, mix, rgba, shade, softShadow, TAU } from "../../draw.ts";
import { DECOR_GLINT, DECOR_OUTLINE, DECOR_SAND, decorShape } from "./palette.ts";

const GREEN = { dark: "#2f5a3c", mid: "#4f7d4c", light: "#86ad64" } as const;

/** Espinhos: pontinhos claros ao longo de uma costela, sempre os mesmos para a mesma semente de formato. */
function spines(c: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>): void {
  c.strokeStyle = rgba("#f1e4b8", 0.85);
  c.lineWidth = 0.55;
  c.beginPath();
  for (const [x, y] of pts) { c.moveTo(x - 0.9, y - 0.6); c.lineTo(x + 0.9, y + 0.6); c.moveTo(x - 0.9, y + 0.6); c.lineTo(x + 0.9, y - 0.6); }
  c.stroke();
}

/** Um braço ou tronco cilíndrico de baixo (x, y0) até y1, com volume, costelas e ponta arredondada. */
function column(c: CanvasRenderingContext2D, x: number, y0: number, y1: number, w: number): void {
  const g = c.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, GREEN.light); g.addColorStop(0.45, GREEN.mid); g.addColorStop(1, GREEN.dark);
  c.beginPath();
  c.moveTo(x - w, y0); c.lineTo(x - w, y1 + w); c.quadraticCurveTo(x - w, y1 - w * 0.3, x, y1 - w * 0.4); c.quadraticCurveTo(x + w, y1 - w * 0.3, x + w, y1 + w); c.lineTo(x + w, y0); c.closePath();
  c.fillStyle = g; c.fill();
  c.strokeStyle = rgba(shade(GREEN.dark, -0.2), 0.7); c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(x - w * 0.33, y0); c.lineTo(x - w * 0.33, y1 + w * 0.6); c.moveTo(x + w * 0.35, y0); c.lineTo(x + w * 0.35, y1 + w * 0.6); c.stroke();
  c.strokeStyle = rgba(DECOR_OUTLINE, 0.7); c.lineWidth = 1;
  c.beginPath(); c.moveTo(x - w, y0); c.lineTo(x - w, y1 + w); c.quadraticCurveTo(x - w, y1 - w * 0.3, x, y1 - w * 0.4); c.quadraticCurveTo(x + w, y1 - w * 0.3, x + w, y1 + w); c.lineTo(x + w, y0); c.stroke();
  c.strokeStyle = rgba(DECOR_GLINT, 0.55); c.lineWidth = 0.7;
  c.beginPath(); c.moveTo(x - w * 0.62, y0 - 1); c.lineTo(x - w * 0.62, y1 + w * 0.8); c.stroke();
}

/**
 * Cacto do deserto (ADR 0036), baixo o bastante para o herói passar por cima sem parecer errado: formato 0, cacto-barril
 * com costelas, espinhos e uma flor; 1, palma (figo-da-índia) com raquetes, espinhos e frutos vermelhos; 2, cacto alto
 * com dois braços; 3, grupo de três pequenos. Verde em três tons com contorno, espinhos claros e reflexo.
 */
export function drawDesertCactus(c: CanvasRenderingContext2D, variant: number): void {
  const v = decorShape(variant);
  const h = (i: number): number => hash2(i, v, 229);
  softShadow(c, 3, 1.4, 14, 4, 0.34);
  ellipse(c, 0, 0.6, 9, 2.4, rgba(DECOR_SAND.drift, 0.7));
  if (v === 0) {
    const body = c.createRadialGradient(-3, -9, 1, 0, -6, 9);
    body.addColorStop(0, GREEN.light); body.addColorStop(0.55, GREEN.mid); body.addColorStop(1, GREEN.dark);
    c.beginPath(); c.ellipse(0, -6.5, 7.4, 6.8, 0, 0, TAU); c.fillStyle = body; c.fill();
    c.strokeStyle = rgba(shade(GREEN.dark, -0.25), 0.75); c.lineWidth = 0.7;
    for (const k of [-4.6, -1.7, 1.6, 4.4]) { c.beginPath(); c.moveTo(k * 0.45, -12.8); c.quadraticCurveTo(k * 1.35, -6.5, k * 0.9, 0); c.stroke(); }
    spines(c, [[-4, -8], [-1.4, -10], [1.6, -9], [4, -7], [-3.2, -3], [0, -4], [3, -3.6]]);
    c.strokeStyle = rgba(DECOR_OUTLINE, 0.75); c.lineWidth = 1.05;
    c.beginPath(); c.ellipse(0, -6.5, 7.4, 6.8, 0, 0, TAU); c.stroke();
    // Flor rosa no topo.
    for (let i = 0; i < 5; i++) ellipse(c, Math.cos((i / 5) * TAU) * 2, -13 + Math.sin((i / 5) * TAU) * 1.1, 1.6, 1, i % 2 ? "#e07a9c" : "#f0a0b8");
    ellipse(c, 0, -13, 1, 0.8, "#f3cf5a");
    ellipse(c, -3.6, -10.4, 2.2, 1, rgba(DECOR_GLINT, 0.6));
  } else if (v === 1) {
    // Raquetes de palma: elipses achatadas unidas, a de baixo maior; frutos vermelhos nas bordas.
    const pads: ReadonlyArray<readonly [number, number, number, number, number]> = [[0, -5, 8, 5.4, 0], [-6, -13, 6, 4.4, -0.5], [6, -12, 6.4, 4.6, 0.45], [1, -19, 5, 3.6, 0.1]];
    for (const [px, py, rx, ry, rot] of pads) {
      const g = c.createLinearGradient(px - rx, py - ry, px + rx, py + ry);
      g.addColorStop(0, GREEN.light); g.addColorStop(0.5, GREEN.mid); g.addColorStop(1, GREEN.dark);
      c.beginPath(); c.ellipse(px, py, rx, ry, rot, 0, TAU); c.fillStyle = g; c.fill();
      c.strokeStyle = rgba(DECOR_OUTLINE, 0.7); c.lineWidth = 1; c.beginPath(); c.ellipse(px, py, rx, ry, rot, 0, TAU); c.stroke();
      spines(c, [[px - rx * 0.4, py - ry * 0.2], [px + rx * 0.2, py + ry * 0.3], [px + rx * 0.5, py - ry * 0.4], [px - rx * 0.1, py - ry * 0.55]]);
      ellipse(c, px - rx * 0.4, py - ry * 0.5, rx * 0.28, ry * 0.18, rgba(DECOR_GLINT, 0.5));
    }
    for (const [fx, fy] of [[-9, -16.6], [9.4, -15.6], [4.2, -21.4]] as const) { ellipse(c, fx, fy, 1.5, 1.7, "#b8324a"); ellipse(c, fx - 0.4, fy - 0.5, 0.5, 0.5, rgba(DECOR_GLINT, 0.75)); }
  } else if (v === 2) {
    column(c, 0, 0, -21, 3.1);
    column(c, -7.4, -6, -13.5, 2.1);
    c.strokeStyle = GREEN.mid; c.lineWidth = 3; c.lineCap = "round";
    c.beginPath(); c.moveTo(-3, -7); c.quadraticCurveTo(-7, -7, -7.4, -9); c.stroke();
    column(c, 7.2, -8, -16.5, 2.2);
    c.strokeStyle = GREEN.mid; c.lineWidth = 3;
    c.beginPath(); c.moveTo(3, -9); c.quadraticCurveTo(7, -9, 7.2, -11); c.stroke();
    spines(c, [[0, -17], [0, -12], [0, -6], [-7.4, -10], [7.2, -12]]);
    ellipse(c, 0, -22, 1.5, 1, "#e07a9c");
  } else {
    for (const [cx, w, tall, tone] of [[-7, 3, 7, 0], [1, 3.9, 11, 1], [8, 2.8, 6, 2]] as const) {
      const g = c.createLinearGradient(cx - w, 0, cx + w, 0);
      g.addColorStop(0, GREEN.light); g.addColorStop(0.5, tone === 1 ? GREEN.mid : mix(GREEN.mid, GREEN.light, 0.3)); g.addColorStop(1, GREEN.dark);
      c.beginPath(); c.ellipse(cx, -tall * 0.55, w, tall * 0.62, 0, 0, TAU); c.fillStyle = g; c.fill();
      c.strokeStyle = rgba(DECOR_OUTLINE, 0.7); c.lineWidth = 0.95; c.beginPath(); c.ellipse(cx, -tall * 0.55, w, tall * 0.62, 0, 0, TAU); c.stroke();
      spines(c, [[cx - w * 0.3, -tall * 0.7], [cx + w * 0.3, -tall * 0.35]]);
      ellipse(c, cx - w * 0.4, -tall * 0.85, w * 0.3, tall * 0.1, rgba(DECOR_GLINT, 0.55));
    }
  }
  for (let i = 0; i < 4; i++) ellipse(c, -11 + h(40 + i) * 22, 1 + h(44 + i) * 2, 0.8, 0.5, i % 2 ? rgba(DECOR_SAND.light, 0.8) : rgba(DECOR_SAND.shade, 0.55));
}
