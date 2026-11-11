import { hash2 } from "../../../world/random.ts";
import { ellipse, mix, rgba, shade } from "../../draw.ts";
import { DECOR_GLINT, DECOR_OUTLINE, DECOR_SAND, decorShape } from "./palette.ts";

/** Contorno irregular e achatado do trecho de terra rachada, suave, que serve de recorte e de borda. */
function patch(c: CanvasRenderingContext2D, rx: number, ry: number, shape: number): void {
  const n = 9;
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, wob = 0.82 + hash2(i % n, shape, 233) * 0.3;
    const x = Math.cos(a) * rx * wob, y = Math.sin(a) * ry * wob;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
}

/**
 * Trecho de terra rachada do deserto (ADR 0036): lama seca em placas, rachaduras que se ramificam, bordas das placas
 * levantadas do lado da luz (noroeste) e sombra dentro das frestas. É um desenho rente ao chão, sem altura. O formato
 * (0 a 3) muda o tamanho, a quantidade de placas e se há uma fenda larga.
 */
export function drawCrackedEarth(c: CanvasRenderingContext2D, variant: number): void {
  const v = decorShape(variant);
  const h = (i: number): number => hash2(i, v, 239);
  const rx = [13, 16, 11, 18][v]!, ry = [5.6, 6.4, 4.8, 7][v]!;
  const cy = -ry * 0.4;
  c.save();
  c.translate(0, cy);
  // 1. Terra seca, mais clara no meio e escurecida na borda.
  const bed = c.createRadialGradient(-rx * 0.2, -ry * 0.3, 1, 0, 0, rx);
  bed.addColorStop(0, rgba(mix(DECOR_SAND.mid, DECOR_SAND.light, 0.35), 0.95));
  bed.addColorStop(0.7, rgba(DECOR_SAND.mid, 0.85));
  bed.addColorStop(1, rgba(DECOR_SAND.shade, 0.35));
  patch(c, rx, ry, v);
  c.fillStyle = bed;
  c.fill();
  c.save();
  patch(c, rx, ry, v);
  c.clip();
  // 1b. Placas de lama seca: cada uma de um tom, com a borda levantada clara do lado da luz e escura do outro.
  const tones = ["#c9a15f", "#dcb978", "#b98f52", "#e6cb8f", "#c2995a"] as const;
  for (let i = 0; i < 6; i++) {
    const px = (h(60 + i) - 0.5) * rx * 1.5, py = (h(66 + i) - 0.5) * ry * 1.3, pw = rx * (0.28 + h(72 + i) * 0.16), ph = ry * (0.38 + h(78 + i) * 0.2), rot = (h(84 + i) - 0.5) * 1.1;
    ellipse(c, px, py, pw, ph, rgba(tones[i % tones.length]!, 0.8), rot);
    c.strokeStyle = rgba(DECOR_SAND.light, 0.65); c.lineWidth = 0.6;
    c.beginPath(); c.ellipse(px, py, pw, ph, rot, Math.PI * 0.95, Math.PI * 1.6); c.stroke();
    c.strokeStyle = rgba("#6a4a2a", 0.55); c.lineWidth = 0.6;
    c.beginPath(); c.ellipse(px, py, pw, ph, rot, Math.PI * -0.05, Math.PI * 0.6); c.stroke();
  }
  // 2. Rachaduras: uma rede que parte de dois pontos e se ramifica em curvas.
  c.lineCap = "round";
  const seeds: ReadonlyArray<readonly [number, number]> = [[-rx * 0.2 + h(1) * 3, -ry * 0.1], [rx * 0.3, ry * 0.2 + h(2)]];
  seeds.forEach(([sx, sy], s) => {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + s + h(10 + k + s * 5) * 0.8, len = rx * (0.5 + h(20 + k + s * 5) * 0.5);
      const ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len * 0.45, mx = sx + Math.cos(a + 0.4) * len * 0.5, my = sy + Math.sin(a + 0.4) * len * 0.22;
      // Sombra da fresta (larga e escura), depois o fio de luz do lábio (fino e claro, deslocado para sudeste).
      c.strokeStyle = rgba(DECOR_OUTLINE, 0.46); c.lineWidth = 1.05;
      c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
      c.strokeStyle = rgba(shade(DECOR_SAND.shade, -0.3), 0.55); c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(ex, ey); c.quadraticCurveTo(mx, my, sx, sy); c.stroke();
      c.strokeStyle = rgba(DECOR_SAND.light, 0.8); c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(sx + 0.7, sy + 0.8); c.quadraticCurveTo(mx + 0.7, my + 0.8, ex + 0.7, ey + 0.8); c.stroke();
      // Ramo curto no meio da rachadura.
      c.strokeStyle = rgba(DECOR_OUTLINE, 0.36); c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(mx, my); c.quadraticCurveTo(mx + (h(30 + k) - 0.5) * 6, my + (h(34 + k) - 0.2) * 3, mx + (h(38 + k) - 0.5) * 9, my + (h(42 + k) - 0.3) * 4); c.stroke();
    }
  });
  if (v === 3) {
    c.strokeStyle = rgba(DECOR_OUTLINE, 0.55); c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-rx, ry * 0.1); c.quadraticCurveTo(-rx * 0.2, -ry * 0.5, rx * 0.5, ry * 0.15); c.quadraticCurveTo(rx * 0.8, ry * 0.3, rx, ry * 0.2); c.stroke();
  }
  c.restore();
  // 3. Contorno suave da borda e reflexo no lado da luz.
  patch(c, rx, ry, v);
  c.strokeStyle = rgba(DECOR_OUTLINE, 0.32); c.lineWidth = 0.9; c.stroke();
  c.strokeStyle = rgba(DECOR_GLINT, 0.55); c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-rx * 0.8, -ry * 0.25); c.quadraticCurveTo(-rx * 0.5, -ry * 0.75, -rx * 0.05, -ry * 0.82); c.stroke();
  for (let i = 0; i < 5; i++) ellipse(c, -rx * 1.05 + h(50 + i) * rx * 2.1, ry * 0.5 + h(56 + i) * 2.4, 0.85, 0.5, i % 2 ? rgba(DECOR_SAND.light, 0.85) : rgba(DECOR_SAND.shade, 0.55));
  c.restore();
}
