import { ellipse, rgba, TAU } from "../../draw.ts";
import { RuinBrush } from "./brush.ts";
import { BONE, GLAZE, OUTLINE, SAND, SANDSTONE, SCRUB, noise } from "./palette.ts";

/** Chão em volta: areia acumulada, seixos, tufos secos, cacos de azulejo e, na torre, ossos de quem ficou. */
export function paintRuinGround(c: CanvasRenderingContext2D, v: number): void {
  const { line, poly, drift } = new RuinBrush(c);
  // língua de areia que o vento empurrou contra a ruína, do lado sudeste, com marcas de ondulação
  const tongue = c.createRadialGradient(-30, 8, 4, 10, 18, 120);
  tongue.addColorStop(0, rgba(SAND.light, 0.5)); tongue.addColorStop(0.6, rgba(SAND.base, 0.3)); tongue.addColorStop(1, rgba(SAND.dark, 0));
  c.beginPath(); c.ellipse(10, 18, 118, 30, -0.04, 0, TAU); c.fillStyle = tongue; c.fill();
  for (let i = 0; i < 7; i++) {
    const rx = -96 + i * 30 + noise(i, v, 181) * 14, ry = 30 + noise(i, v, 183) * 22;
    c.beginPath(); c.moveTo(rx, ry); c.quadraticCurveTo(rx + 9, ry - 2.2, rx + 18, ry + 0.4);
    c.strokeStyle = rgba(SAND.dark, 0.42); c.lineWidth = 0.9; c.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const a = noise(i, v, 109) * TAU, d = 40 + noise(i, v, 113) * 70;
    drift(Math.cos(a) * d * 1.1, 10 + Math.sin(a) * d * 0.3, 8 + noise(i, v, 117) * 12, 2.4 + noise(i, v, 121) * 1.4, v, i);
  }
  for (let i = 0; i < 12; i++) {
    const x = (noise(i, v, 127) - 0.5) * 200, y = -20 + noise(i, v, 131) * 66, s = 1 + noise(i, v, 137) * 1.8;
    ellipse(c, x + 0.8, y + 0.8, s * 1.3, s * 0.6, rgba("#2c1f14", 0.3));
    ellipse(c, x, y, s, s * 0.6, i % 3 ? SANDSTONE.base : SANDSTONE.light);
  }
  for (let i = 0; i < 5; i++) {
    const x = (noise(i, v, 139) - 0.5) * 190, y = 4 + noise(i, v, 149) * 36;
    for (const k of [-2, 0, 2]) line([[x + k, y], [x + k * 1.8, y - 5 - noise(i + k, v, 151) * 3]], rgba("#8a7a46", 0.85), 0.9);
  }
  for (let i = 0; i < 2; i++) {
    // arbusto seco: poucos ramos tortos, um verde apagado e outro palha
    const x = (noise(i, v, 153) - 0.5) * 170, y = 18 + noise(i, v, 157) * 30;
    for (let k = -2; k <= 2; k++) line([[x, y], [x + k * 2.6, y - 7 - Math.abs(k) * -0.8 - noise(i + k, v, 159) * 4]], k % 2 ? SCRUB.base : SCRUB.dry, 1.1);
  }
  if (v === 0 || v === 1) {
    // cacos de azulejo esmaltado, desbotados pelo sol, caídos entre os degraus
    for (let i = 0; i < 4; i++) {
      const x = -44 + i * 26 + (noise(i, v, 163) - 0.5) * 10, y = 34 + noise(i, v, 167) * 8;
      poly([[x, y], [x + 4, y - 1], [x + 5, y + 2.4], [x - 0.5, y + 3]]);
      c.fillStyle = i % 2 ? GLAZE.light : GLAZE.dark; c.fill(); c.strokeStyle = rgba(OUTLINE, 0.7); c.lineWidth = 0.7; c.stroke();
    }
  }
  if (v === 2) {
    for (let k = 0; k < 4; k++) {
      c.beginPath(); c.arc(-84 + k * 3, 36, 5 + k * 0.4, Math.PI * 1.1, Math.PI * 1.95);
      c.strokeStyle = rgba(BONE, 0.95); c.lineWidth = 1.3; c.stroke();
    }
    ellipse(c, -92, 38, 3.4, 2.6, BONE); ellipse(c, -93, 37, 0.9, 0.9, rgba("#1e1410", 0.85));
  }
}
