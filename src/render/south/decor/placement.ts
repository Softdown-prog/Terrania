import { hash2 } from "../../../world/random.ts";
import type { Biome } from "../../../world/biomes.ts";
import type { DecorKind, DecorPlacement } from "./types.ts";

/** Chance de um tile de cada bioma de deserto ter uma peça: pouca, para o deserto respirar. */
const DENSITY: Partial<Record<Biome, number>> = { dunes: 0.075, ruins: 0.09 };

/** Pesos de cada peça, em ordem; a soma é 1. As dunas têm cacto e capim, a terra batida tem terra rachada e ossos. */
const WEIGHTS: Partial<Record<Biome, ReadonlyArray<readonly [DecorKind, number]>>> = {
  dunes: [["dry-grass", 0.4], ["shrub", 0.22], ["cactus", 0.22], ["bones", 0.1], ["cracked-earth", 0.06]],
  ruins: [["cracked-earth", 0.38], ["dry-grass", 0.2], ["bones", 0.18], ["shrub", 0.16], ["cactus", 0.08]],
};

/**
 * A peça de decoração do tile (tx, ty) do bioma dado, ou nada (ADR 0036). Determinística pela posição e pela
 * semente, igual em qualquer chunk. Quem chama só pergunta por tiles de chão livre (areia, sem pedra, sem árvore,
 * fora da cidade); aqui só se decide quanto e o quê.
 */
export function decorFor(biome: Biome, tx: number, ty: number, seed: number): DecorPlacement | null {
  const density = DENSITY[biome], weights = WEIGHTS[biome];
  if (density === undefined || !weights) return null;
  if (hash2(tx, ty, seed + 6101) >= density) return null;
  const pick = hash2(tx, ty, seed + 6103);
  let acc = 0, kind: DecorKind = weights[weights.length - 1]![0];
  for (const [candidate, weight] of weights) {
    acc += weight;
    if (pick < acc) { kind = candidate; break; }
  }
  return { kind, x: 6 + hash2(tx, ty, seed + 6107) * 20, y: 12 + hash2(tx, ty, seed + 6109) * 14, variation: hash2(tx, ty, seed + 6113) };
}
