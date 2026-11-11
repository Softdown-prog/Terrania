import type { Tile } from "../../../world/terrain.ts";
import { TILE_SIZE } from "../../../world/terrain.ts";
import { southCityGround } from "../../../world/southCity.ts";
import type { Scenery } from "../../scenery.ts";
import { decorFor } from "./placement.ts";

/**
 * O cenário de decoração do deserto para um tile (ADR 0036), ou nada. Só em chão de areia livre (sem pedra, sem
 * árvore) e fora da cidade do Poço Negro; o resto da decisão (bioma, quanto e o quê) é de `decorFor`.
 */
export function southDecorProp(tile: Tile, tx: number, ty: number, seed: number): Scenery | null {
  if (tile.ground !== "sand" || tile.rock || tile.tree || southCityGround(tx, ty) !== null) return null;
  const placement = decorFor(tile.biome, tx, ty, seed);
  if (!placement) return null;
  return { kind: "south-decor", decorKind: placement.kind, x: tx * TILE_SIZE + placement.x, y: ty * TILE_SIZE + placement.y, variant: placement.variation };
}
