import { hash2 } from "../../../world/random.ts";
import { ellipse, mix, rgba, shade, softShadow, TAU } from "../../draw.ts";
import { DECOR_GLINT, DECOR_OUTLINE, DECOR_SAND, decorShape } from "./palette.ts";

const TWIG = ["#6b4a2a", "#8a6a3e", "#a98a56"] as const;
const SAGE = ["#8a8f62", "#a3a77a", "#bcc194"] as const;

/**
 * Arbusto seco do deserto (ADR 0036): galhos tortos que saem do pé em leque, folhas pequenas de salva cinza-esverdeada
 * e galhos mortos. O formato (0 a 3): arbusto aberto, arbusto cheio, galhada seca sem folha e bola de espinhos
 * soltos que o vento rola.
 */
export function drawDesertShrub(c: CanvasRenderingContext2D, variant: number): void {
  const v = decorShape(variant);
  const h = (i: number): number => hash2(i, v, 223);
  softShadow(c, 3, 1.4, 16, 4, 0.34);
  ellipse(c, 0, 0.5, 9, 2.6, rgba(DECOR_SAND.drift, 0.7));
  c.lineCap = "round";
  if (v === 3) {
    // Bola de galhos soltos: círculos de traços cruzados, claros em cima e escuros embaixo.
    const cy = -8, r = 8.5;
    const ball = c.createRadialGradient(-2.5, cy - 3, 1, 0, cy, r);
    ball.addColorStop(0, rgba(TWIG[2], 0.5));
    ball.addColorStop(1, rgba(TWIG[0], 0.15));
    c.fillStyle = ball;
    c.beginPath(); c.arc(0, cy, r, 0, TAU); c.fill();
    for (let i = 0; i < 16; i++) {
      const a = h(i) * TAU, b = a + 1.4 + h(20 + i) * 1.8, rr = r * (0.7 + h(40 + i) * 0.4);
      c.strokeStyle = i % 3 === 0 ? rgba(DECOR_OUTLINE, 0.6) : TWIG[i % 3]!;
      c.lineWidth = i % 3 === 0 ? 0.9 : 0.75;
      c.beginPath();
      c.moveTo(Math.cos(a) * rr, cy + Math.sin(a) * rr);
      c.quadraticCurveTo(Math.cos((a + b) / 2) * rr * 0.25, cy + Math.sin((a + b) / 2) * rr * 0.25, Math.cos(b) * rr, cy + Math.sin(b) * rr);
      c.stroke();
    }
    // Folhinhas secas presas nos galhos e pontas de espinho avermelhadas.
    for (let i = 0; i < 6; i++) {
      const a = h(60 + i) * TAU, rr = r * (0.55 + h(66 + i) * 0.4), lx = Math.cos(a) * rr, ly = cy + Math.sin(a) * rr;
      ellipse(c, lx, ly, 1.6, 0.9, i % 2 ? SAGE[i % 3]! : "#b89a5a", a);
      ellipse(c, Math.cos(a + 0.7) * r * 0.97, cy + Math.sin(a + 0.7) * r * 0.97, 0.6, 0.6, "#7a3a24");
    }
    ellipse(c, 2, 1, 6, 1.2, rgba("#d8c18a", 0.7));
    c.strokeStyle = rgba(DECOR_OUTLINE, 0.55);
    c.lineWidth = 0.9;
    c.beginPath(); c.arc(0, cy, r, 0, TAU); c.stroke();
    ellipse(c, -3.2, cy - 4, 2, 0.9, rgba(DECOR_GLINT, 0.55));
    return;
  }
  const stems = [7, 10, 8][v]!, reach = [15, 17, 16][v]!, leafy = v !== 2;
  // Galhos: cada um sai do pé, abre em leque e tem forquilhas curtas.
  for (let i = 0; i < stems; i++) {
    const t = i / (stems - 1) - 0.5, tx = t * 2 * (reach * 0.85) + (h(i) - 0.5) * 3, ty = -reach * (0.55 + h(10 + i) * 0.45) * (1 - Math.abs(t) * 0.35);
    c.strokeStyle = rgba(DECOR_OUTLINE, 0.55);
    c.lineWidth = 1.9;
    c.beginPath(); c.moveTo(t * 2, 0); c.quadraticCurveTo(t * reach * 0.8, ty * 0.5, tx, ty); c.stroke();
    c.strokeStyle = TWIG[i % 3]!;
    c.lineWidth = 1.15;
    c.beginPath(); c.moveTo(t * 2, 0); c.quadraticCurveTo(t * reach * 0.8, ty * 0.5, tx, ty); c.stroke();
    // Forquilha.
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(tx * 0.55, ty * 0.58); c.quadraticCurveTo(tx * 0.8 + t * 3, ty * 0.7, tx * 0.95 + (h(20 + i) - 0.5) * 5, ty * 0.82 - 3); c.stroke();
    if (leafy) {
      for (let k = 0; k < 4; k++) {
        const lx = tx * (0.55 + k * 0.14) + (h(30 + i + k) - 0.5) * 3, ly = ty * (0.5 + k * 0.15) + (h(34 + i + k) - 0.5) * 2;
        ellipse(c, lx, ly, 2.1, 1.2, SAGE[(i + k) % 3]!, (h(40 + i + k) - 0.5) * 1.6);
        ellipse(c, lx - 0.5, ly - 0.4, 0.9, 0.4, rgba(mix(SAGE[2], DECOR_GLINT, 0.5), 0.8));
      }
    } else if (i % 2 === 0) {
      c.strokeStyle = shade(TWIG[0], -0.2);
      c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + (h(50 + i) - 0.5) * 5, ty - 2.5); c.stroke();
    }
  }
  // Reflexo no galho mais alto e poeira no pé.
  c.strokeStyle = rgba(DECOR_GLINT, 0.5);
  c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(-1, -reach * 0.4); c.quadraticCurveTo(-2, -reach * 0.7, -3, -reach * 0.95); c.stroke();
  for (let i = 0; i < 4; i++) ellipse(c, -10 + h(60 + i) * 20, 1 + h(64 + i) * 2, 0.8, 0.5, i % 2 ? rgba(DECOR_SAND.light, 0.8) : rgba(DECOR_SAND.shade, 0.55));
}
