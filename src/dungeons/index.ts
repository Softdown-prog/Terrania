import type { CaveEntrance } from "../world/caves.ts";
import { hash2 } from "../world/random.ts";
import type { DungeonDefinition, DungeonFloorDefinition } from "./types.ts";
import { SOUTH_DUNGEONS } from "./south/index.ts";

export type { DungeonDefinition, DungeonFloorDefinition } from "./types.ts";

/** Todas as masmorras, por região. Norte, Leste e Oeste entram aqui, cada uma na sua pasta. */
export const DUNGEONS: readonly DungeonDefinition[] = [...SOUTH_DUNGEONS];

/** A masmorra a que esta caverna pertence, ou nada: cavernas sem masmorra têm um andar só. */
export function dungeonFor(entrance: CaveEntrance): DungeonDefinition | null {
  return DUNGEONS.find(dungeon => dungeon.theme === entrance.theme) ?? null;
}

/** Os andares desta caverna, na ordem. A versão curta é sorteada pela posição da entrada. */
export function dungeonFloors(entrance: CaveEntrance): readonly DungeonFloorDefinition[] {
  const dungeon = dungeonFor(entrance);
  if (!dungeon) return [];
  const short = dungeon.shortVariant && hash2(entrance.tileX, entrance.tileY, entrance.seed + 7001) < 0.45;
  return short ? dungeon.shortVariant!.map(index => dungeon.floors[index]!) : dungeon.floors;
}

/** Quantos andares a caverna tem (no mínimo 1). */
export function caveFloorCount(entrance: CaveEntrance): number {
  return Math.max(1, dungeonFloors(entrance).length);
}

/** O andar `floorIndex` (1 = o da entrada), ou nada se a caverna não tem masmorra. */
export function dungeonFloor(entrance: CaveEntrance, floorIndex: number): DungeonFloorDefinition | null {
  return dungeonFloors(entrance)[floorIndex - 1] ?? null;
}
