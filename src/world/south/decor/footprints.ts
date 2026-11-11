import type { DecorKind } from "./types.ts";

/**
 * Raio (px) da base de cada peça no chão, por tipo e formato (0 a 3); 0 = o herói passa por cima (ADR 0037).
 * Só o que se enxerga como obstáculo bloqueia: cacto (os quatro formatos) e arbusto lenhoso. O capim, os ossos,
 * a terra rachada e a bola de espinhos que o vento rola (formato 3 do arbusto) ficam livres.
 */
export const DECOR_FOOTPRINT: Readonly<Record<DecorKind, readonly [number, number, number, number]>> = {
  "dry-grass": [0, 0, 0, 0],
  shrub: [6, 7, 5, 0],
  bones: [0, 0, 0, 0],
  cactus: [6.5, 8, 4.5, 9],
  "cracked-earth": [0, 0, 0, 0],
};

/** O raio de uma peça (0 quando não bloqueia). */
export function decorFootprint(kind: DecorKind, shape: number): number {
  const radii = DECOR_FOOTPRINT[kind];
  return radii[Math.max(0, Math.min(radii.length - 1, Math.floor(Number.isFinite(shape) ? shape : 0)))] ?? 0;
}
