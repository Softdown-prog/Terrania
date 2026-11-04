import { Monster } from "./Monster.ts";
import { slimeSpawns } from "./Slime.ts";
import { hash2 } from "../world/random.ts";
import { CHUNK_TILES, TILE_SIZE, isWalkable } from "../world/terrain.ts";
import { villageGround } from "../world/village.ts";

/** Spawns determinísticos; mantém todos os IDs e coordenadas dos slimes antigos. */
export function monsterSpawns(cx: number, cy: number, seed: number): Monster[] {
  const monsters: Monster[] = slimeSpawns(cx, cy, seed);
  // Os novos inimigos são progressão da exploração, longe dos tutoriais da vila.
  if (Math.hypot(cx, cy) < 4 || hash2(cx, cy, seed + 809) >= 0.55)
    return monsters;
  const kind = hash2(cx, cy, seed + 811) < 0.5 ? "wolf" : "spider";
  const tx = cx * CHUNK_TILES + Math.floor(hash2(cx + 23, cy, seed + 901) * CHUNK_TILES);
  const ty = cy * CHUNK_TILES + Math.floor(hash2(cx, cy - 19, seed + 907) * CHUNK_TILES);
  if (villageGround(tx, ty) || !isWalkable(tx, ty, seed)) return monsters;
  monsters.push(new Monster(kind, kind + ":" + cx + "," + cy,
    (tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE));
  return monsters;
}
