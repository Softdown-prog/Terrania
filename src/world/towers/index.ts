import type { TowerDefinition, TowerId } from "./types.ts";
import { SOUTH_TOWERS } from "./south/index.ts";

export type { TowerBlock, TowerDefinition, TowerId } from "./types.ts";

/** Todas as torres, por região. Norte, Leste e Oeste entram aqui, cada uma na sua pasta. */
export const TOWERS: readonly TowerDefinition[] = [...SOUTH_TOWERS];

export function towerById(id: TowerId): TowerDefinition {
  const tower = TOWERS.find(candidate => candidate.id === id);
  if (!tower) throw new RangeError("Torre desconhecida: " + id);
  return tower;
}
