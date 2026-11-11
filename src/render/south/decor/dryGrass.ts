import { hash2 } from "../../../world/random.ts";
import { ellipse, mix, rgba, shade, softShadow } from "../../draw.ts";
import { DECOR_GLINT, DECOR_OUTLINE, DECOR_SAND, decorShape } from "./palette.ts";

const STRAW = ["#a8914a", "#c9b36a", "#e0cf8e", "#7d6a35"] as const;

/**
 * Touceira de capim seco do deserto (ADR 0036): um montinho de areia, folhas de palha curvas em quatro tons,
 * espigas nas pontas, raízes escuras e reflexo. O formato (0 a 3) muda a altura, a abertura e quantas folhas
 * tem: touceira baixa, aberta, alta e com espigas, ou rala e caída para um lado.
 */
export function drawDryGrass(c: CanvasRenderingContext2D, variant: number): void {
  const v = decorShape(variant);
  const h = (i: number): number => hash2(i, v, 211);
  const blades = [9, 7, 12, 6][v]!, height = [11, 9, 17, 8][v]!, spread = [8, 12, 7, 10][v]!, lean = [0, 0, 0.5, 5][v]!;
  // 1. Sombra no chão e montinho de areia com a raiz.
  softShadow(c, 2, 1.2, 12, 3.4, 0.3);
  ellipse(c, 0, 0.4, 7.5, 2.4, rgba(DECOR_SAND.drift, 0.75));
  ellipse(c, 1.5, 1.1, 5, 1.4, rgba(DECOR_SAND.shade, 0.45));
  ellipse(c, 0, -0.2, 3.4, 1.7, shade("#6a5a2c", -0.15));
  // 2. Folhas: de trás para frente, cada uma uma curva com a ponta caída; as mais claras na frente.
  c.lineCap = "round";
  for (let i = 0; i < blades; i++) {
    const t = blades === 1 ? 0 : i / (blades - 1) - 0.5;
    const tipX = t * spread * 2 + lean + (h(i) - 0.5) * 3, tipY = -height * (0.55 + h(10 + i) * 0.45);
    const tone = STRAW[i % STRAW.length]!;
    c.strokeStyle = rgba(DECOR_OUTLINE, 0.5);
    c.lineWidth = 2.1;
    c.beginPath(); c.moveTo(t * 3, 0); c.quadraticCurveTo(t * spread * 1.1, tipY * 0.6, tipX, tipY); c.stroke();
    c.strokeStyle = tone;
    c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(t * 3, 0); c.quadraticCurveTo(t * spread * 1.1, tipY * 0.6, tipX, tipY); c.stroke();
    // Fio claro de sol na borda esquerda da folha.
    c.strokeStyle = rgba(mix(tone, DECOR_GLINT, 0.55), 0.7);
    c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(t * 3 - 0.4, -0.5); c.quadraticCurveTo(t * spread * 1.1 - 0.4, tipY * 0.6, tipX - 0.3, tipY + 0.4); c.stroke();
    // Espiga de semente nas folhas altas.
    if (v === 2 && i % 3 === 0) {
      ellipse(c, tipX, tipY - 1, 1.1, 2.4, mix("#b08a3c", DECOR_OUTLINE, 0.15), (h(30 + i) - 0.5) * 0.8);
      ellipse(c, tipX - 0.3, tipY - 1.8, 0.45, 1, rgba(DECOR_GLINT, 0.6));
    }
  }
  // 3. Grãos de areia soltos em volta.
  for (let i = 0; i < 4; i++) ellipse(c, -11 + h(40 + i) * 22, 1 + h(44 + i) * 2, 0.8, 0.5, i % 2 ? rgba(DECOR_SAND.light, 0.8) : rgba(DECOR_SAND.shade, 0.55));
}
