import { valueNoise } from "../../world/random.ts";

/**
 * Desvio lateral (px) de uma marca de roda e a sua intensidade (0 a 1) em qualquer ponto da estrada (ADR 0034).
 * São funções contínuas da posição no mundo (ao longo da estrada e do eixo da marca), então o fim de um tile
 * e o começo do seguinte dão o mesmo valor: nada de degrau, e a marca só some e volta aos poucos.
 */
export function rutShift(along: number, lateral: number, seed: number): number {
  return (valueNoise(along / 2.6, lateral * 3.1, seed + 701) - 0.5) * 3.4;
}

/**
 * Quanto a marca aparece neste ponto (0 a 1): quase sempre firme, mais forte em uns trechos que em outros, e com
 * falhas raras, curtas e macias, onde a roda não pegou no chão. Nunca afina em agulha a cada poucos tiles.
 */
export function rutStrength(along: number, lateral: number, seed: number): number {
  const body = 0.62 + 0.38 * valueNoise(along / 3.4, lateral * 2.3 + 40, seed + 709);
  const gap = (valueNoise(along / 7, lateral * 1.7 + 90, seed + 713) - 0.1) / 0.16;
  const open = Math.max(0, Math.min(1, gap));
  return body * open * open * (3 - 2 * open);
}
