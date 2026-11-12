import { valueNoise } from "../random.ts";

/** Acima deste valor do ruído, o chão é água do lago negro (desde que seja o Sul aberto e longe da cidade). */
export const BLACK_LAKE_THRESHOLD = 0.82;

/**
 * O ruído (0 a 1) que define os lagos negros dos Ermos do Sul (ADR 0017), em tiles contínuos. É a fonte única: o terreno
 * decide "é lago" por ele (`isBlackLake`) e o desenho usa o mesmo valor, contínuo, como profundidade da água (ADR 0039).
 */
export function blackLakeNoise(tx: number, ty: number, seed: number): number {
  return valueNoise(tx / 40 + 7.3, ty / 40 - 2.9, seed + 5003) * 0.78 +
    valueNoise(tx / 12 + 1.1, ty / 12 + 4.4, seed + 5009) * 0.22;
}
