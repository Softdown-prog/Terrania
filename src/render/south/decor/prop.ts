import { TILE_SIZE } from "../../../world/terrain.ts";
import { southDecorAt } from "../../../world/south/decor/index.ts";
import type { Scenery } from "../../scenery.ts";

/**
 * O cenário de decoração do deserto para um tile (ADR 0036), ou nada. A decisão de onde há peça (e de onde ela
 * pode ficar) é do mundo, `southDecorAt`, a mesma que a colisão usa; aqui só se converte em cenário.
 */
export function southDecorProp(tx: number, ty: number, seed: number): Scenery | null {
  const placement = southDecorAt(tx, ty, seed);
  if (!placement) return null;
  return { kind: "south-decor", decorKind: placement.kind, x: tx * TILE_SIZE + placement.x, y: ty * TILE_SIZE + placement.y, variant: placement.variation };
}
