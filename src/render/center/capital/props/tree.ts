import { ellipse, mix, rgba, shade, softShadow } from "../../../draw.ts";
import { GLINT, OUTLINE, noise } from "../../kit/index.ts";

const BARK = "#6b4a2e";

function trunk(c: CanvasRenderingContext2D, height: number, width: number): void {
  const g = c.createLinearGradient(-width, 0, width, 0);
  g.addColorStop(0, mix(BARK, GLINT, .2)); g.addColorStop(.5, BARK); g.addColorStop(1, shade(BARK, -.5));
  c.fillStyle = OUTLINE;
  c.beginPath(); c.moveTo(-width - 1.2, 1); c.quadraticCurveTo(-width + .6, -height / 2, -width * .55, -height); c.lineTo(width * .55, -height); c.quadraticCurveTo(width - .6, -height / 2, width + 1.2, 1); c.closePath(); c.fill();
  c.fillStyle = g;
  c.beginPath(); c.moveTo(-width, 0); c.quadraticCurveTo(-width + 1.4, -height / 2, -width * .5, -height); c.lineTo(width * .5, -height); c.quadraticCurveTo(width - 1.4, -height / 2, width, 0); c.closePath(); c.fill();
  c.strokeStyle = rgba(shade(BARK, -.6), .55); c.lineWidth = .8;
  for (const dx of [-.4, .15, .5]) { c.beginPath(); c.moveTo(dx * width, -1); c.quadraticCurveTo(dx * width + 1.2, -height / 2, dx * width * .6, -height + 2); c.stroke(); }
}

function leaves(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, base: string, v: number, count: number, accent?: string, rim?: string): void {
  // a copa em blobs: do fundo (escuro) para a frente (claro), cada camada menor e mais alta, com luz de noroeste
  const tones = [rim ?? shade(base, -.62), shade(base, -.3), base, mix(base, GLINT, .14), mix(base, GLINT, .3)];
  for (let layer = 0; layer < tones.length; layer++) {
    const k = 1 - layer * .15;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + noise(i, v, 7 + layer) * .8, r = (.25 + noise(i, v, 17 + layer) * .6) * (1 - layer * .12);
      const x = cx + Math.cos(a) * rx * r - layer * 1.2, y = cy + Math.sin(a) * ry * r - layer * 2.2;
      ellipse(c, x, y, (rx * .5 + noise(i, v, 29) * 5) * k + (layer === 0 ? .8 : 0), (ry * .5 + noise(i, v, 31) * 4) * k + (layer === 0 ? .8 : 0), tones[layer]!);
    }
  }
  if (accent) for (let i = 0; i < 14; i++) ellipse(c, cx + (noise(i, v, 41) - .5) * rx * 1.6, cy + (noise(i, v, 43) - .5) * ry * 1.5, 2 + noise(i, v, 47) * 1.6, 1.6 + noise(i, v, 49), rgba(accent, .9));
  c.strokeStyle = rgba(GLINT, .3); c.lineWidth = 1.1;
  c.beginPath(); c.ellipse(cx - rx * .15, cy - ry * .2, rx * .7, ry * .55, 0, Math.PI * 1.05, Math.PI * 1.55); c.stroke();
}

/**
 * Árvore da capital (ADR 0106), três espécies para os terrenos ainda sem edifício: 0 = carvalho de copa redonda, 1 = cipreste alto e estreito, 2 = cerejeira em flor. Origem no pé do
 * tronco, no chão (é lá que a colisão fica: um círculo de 8 px); luz de noroeste. A copa é feita de blobs em camadas, de escuro (fundo) a claro (frente), para ter volume.
 */
export function paintCapitalTree(c: CanvasRenderingContext2D, variant: number): void {
  const v = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 3;
  c.save();
  softShadow(c, 4, 2, v === 1 ? 14 : 26, v === 1 ? 5 : 8, .42);
  if (v === 0) { trunk(c, 30, 5.2); leaves(c, 0, -46, 30, 24, "#4f8a3a", v, 11); }
  else if (v === 1) {
    trunk(c, 14, 3.4);
    for (const [y, rx, ry] of [[-22, 13, 14], [-40, 11, 14], [-58, 8.4, 13], [-74, 5.4, 11]] as const) leaves(c, 0, y, rx, ry, "#2f6a40", v + y, 6);
  } else { trunk(c, 28, 4.6); leaves(c, 0, -44, 27, 22, "#6f9a48", v, 9); leaves(c, 0, -46, 25, 19, "#e8a0b4", v + 3, 9, "#ffd9e2", "#c98aa0"); }
  c.restore();
}
