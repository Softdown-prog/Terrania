import { hash2 } from "../../world/random.ts";

/**
 * Variação (0 a 1) de uma pedra no tile (tx, ty) (ADR 0035). O `decoration` do tile não serve: uma pedra só
 * existe quando ele é bem pequeno (menor que 0,022 no Sul), e o sorteio de formato caía sempre no primeiro.
 * Esta variação sai da posição e da semente, com o mesmo resultado em qualquer chunk e qualquer execução.
 */
export function rockVariant(tx: number, ty: number, seed: number): number {
  return hash2(tx, ty, seed + 5303);
}
