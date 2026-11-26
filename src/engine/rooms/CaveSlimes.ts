import { Slime } from "../../actors/Slime.ts";
import type { CollisionMap } from "../../world/collision.ts";
import { CAVE_HEIGHT, CAVE_WIDTH } from "../../world/caveFloor.ts";
import { hash2 } from "../../world/random.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import type { CaveEntrance } from "../../world/caves.ts";

/** Quantos slimes moram numa caverna comum do Centro (a Gruta das Raízes). */
export const CENTRAL_CAVE_SLIMES = 6;
const MIN_FROM_PLAYER = 170, MIN_BETWEEN = 92;

/**
 * O povo do Centro são os slimes: as cavernas comuns do Centro (tema "verdant") não têm criatura regional, e antes nasciam vazias. Aqui nascem os slimes,
 * em pontos sorteados pela entrada (sempre os mesmos para a mesma entrada), em solo transitável, longe do herói e uns dos outros. `defeated` guarda quem já
 * caiu (o save), e o número de tentativas é fixo: nada de laço aberto. As criaturas do Centro de verdade entram em lotes próprios, cada uma no seu arquivo.
 */
export function centralCaveSlimes(entrance: CaveEntrance, floorId: string, collision: CollisionMap, hero: { readonly x: number; readonly y: number }, defeated: ReadonlySet<string>,
  reaches: (x: number, y: number) => boolean = () => true): Slime[] {
  const salt = entrance.seed ^ Math.imul(entrance.tileX, 1033) ^ Math.imul(entrance.tileY, 2053);
  const spots: Array<{ readonly id: string; readonly x: number; readonly y: number }> = [];
  const usable = (x: number, y: number): boolean => collision.canMove(x, y) && reaches(x, y) && Math.hypot(x - hero.x, y - hero.y) >= MIN_FROM_PLAYER &&
    spots.every(spot => Math.hypot(x - spot.x, y - spot.y) >= MIN_BETWEEN);
  for (let i = 0; i < 64 && spots.length < CENTRAL_CAVE_SLIMES; i++) {
    const x = (4 + Math.floor(hash2(i, 7, salt + 71) * (CAVE_WIDTH - 8)) + .5) * TILE_SIZE, y = (4 + Math.floor(hash2(i, 11, salt + 83) * (CAVE_HEIGHT - 12)) + .5) * TILE_SIZE;
    if (usable(x, y)) spots.push({ id: floorId + ":slime:" + i, x, y });
  }
  // Garantia: se o sorteio só caiu em parede, varre as câmaras até achar pontos.
  for (let ty = 5; ty < CAVE_HEIGHT - 6 && spots.length < 3; ty++)
    for (let tx = 5; tx < CAVE_WIDTH - 4 && spots.length < 3; tx++) {
      const x = (tx + .5) * TILE_SIZE, y = (ty + .5) * TILE_SIZE;
      if (usable(x, y)) spots.push({ id: floorId + ":slime:s" + spots.length, x, y });
    }
  return spots.filter(spot => !defeated.has(spot.id)).map(spot => new Slime(spot.id, spot.x, spot.y));
}
