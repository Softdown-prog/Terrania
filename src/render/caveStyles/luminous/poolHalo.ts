import { rgba, TAU } from "../../draw.ts";

/** Luz que sobe da poça, em "screen", por cima do chão ao redor: círculo de 2 a 26 px com a força pedida (0 a 1). */
export function poolHalo(accent: string, strength: number, c: CanvasRenderingContext2D): void {
  c.save();
  c.globalCompositeOperation = "screen";
  const light = c.createRadialGradient(0, 0, 2, 0, 0, 26);
  light.addColorStop(0, rgba(accent, 0.4 * strength));
  light.addColorStop(0.55, rgba(accent, 0.13 * strength));
  light.addColorStop(1, rgba(accent, 0));
  c.fillStyle = light;
  c.beginPath();
  c.ellipse(0, 0, 26, 17, 0, 0, TAU);
  c.fill();
  c.restore();
}
