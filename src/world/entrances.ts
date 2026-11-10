import { caveEntranceNear, type CaveEntrance } from "./caves.ts";
import { towerEntranceNear } from "./towers/entrance.ts";

/** Qualquer porta de masmorra ao alcance do herói: entrada de caverna ou porta de torre. */
export function dungeonEntranceNear(x: number, y: number, seed: number, radius = 47): CaveEntrance | null {
  return caveEntranceNear(x, y, seed, radius) ?? towerEntranceNear(x, y, seed, radius);
}
