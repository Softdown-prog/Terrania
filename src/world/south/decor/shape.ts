import { DECOR_VARIANTS } from "./types.ts";

/**
 * Formato (0 a 3) de uma peça a partir da variação (0 a 1) da colocação. É a ÚNICA conta: o desenho usa o mesmo
 * formato que a colisão, então o que se vê é o que bloqueia.
 */
export function decorShapeOf(variation: number): number {
  const v = Number.isFinite(variation) ? variation : 0;
  return Math.max(0, Math.min(DECOR_VARIANTS - 1, Math.floor(v * DECOR_VARIANTS)));
}
