import { Monster } from "./Monster.ts";
import { hash2 } from "../world/random.ts";
import { CHUNK_TILES, TILE_SIZE } from "../world/terrain.ts";
import { villageGround } from "../world/village.ts";

/** Compatibilidade com as APIs e testes que criam Slimes diretamente. */
export class Slime extends Monster {
  constructor(id: string, x: number, y: number) {
    super("slime", id, x, y);
  }
}
export function slimeSpawns(cx: number, cy: number, seed: number): Slime[] {
  const count = hash2(cx, cy, seed + 201) < 0.53 ? 1 : 2;
  const result: Slime[] = [];
  for (let index = 0; index < count; index++) {
    const tx =
      cx * CHUNK_TILES +
      Math.floor(hash2(cx * 4 + index, cy, seed + 77) * CHUNK_TILES);
    const ty =
      cy * CHUNK_TILES +
      Math.floor(hash2(cx, cy * 4 + index, seed + 97) * CHUNK_TILES);
    if (Math.hypot(tx, ty) < 9 || villageGround(tx, ty) || !worldTileWalkable(tx, ty, seed)) continue;
    result.push(
      new Slime(
        cx + "," + cy + "," + index,
        (tx + 0.5) * TILE_SIZE,
        (ty + 0.5) * TILE_SIZE,
      ),
    );
  }
  return result;
}
import { isWalkable as worldTileWalkable } from "../world/terrain.ts";
