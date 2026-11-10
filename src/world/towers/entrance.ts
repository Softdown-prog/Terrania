import type { CaveEntrance } from "../caves.ts";
import { TILE_SIZE } from "../terrain.ts";
import { southTowersInArea, type SouthTower } from "./placement.ts";

/**
 * A porta de uma torre como porta de masmorra (ADR 0020): o mesmo formato de `CaveEntrance`, para o
 * jogo entrar, trocar de andar e voltar pelo motor de andares que já existe. O tema é `desert` (a
 * pedra das torres do Sul); `tower` diz qual ficha de torre manda nos andares. A volta à superfície
 * deixa o herói na porta, que é chão livre por construção (`tests/south-towers.test.ts`).
 */
export function towerEntrance(placed: SouthTower, seed: number): CaveEntrance {
  const x = placed.x + placed.tower.door.x, y = placed.y + placed.tower.door.y;
  return { id: placed.id, tileX: Math.floor(x / TILE_SIZE), tileY: Math.floor(y / TILE_SIZE), x, y,
    theme: "desert", kind: "stairs", name: placed.tower.name, seed, tower: placed.tower.id };
}

/** A porta de torre ao alcance do herói, ou nada. Consulta limitada à vizinhança. */
export function towerEntranceNear(x: number, y: number, seed: number, radius = 47): CaveEntrance | null {
  if (![x, y, radius].every(Number.isFinite) || radius < 0) return null;
  // A porta fica até ~13 tiles do ponto de contato; a busca cobre a torre inteira ao redor do herói.
  const reach = Math.ceil(radius / TILE_SIZE) + 3;
  const tx = Math.floor(x / TILE_SIZE), ty = Math.floor(y / TILE_SIZE);
  for (const placed of southTowersInArea(tx - reach, ty - reach, tx + reach, ty + reach, seed)) {
    const door = towerEntrance(placed, seed);
    if (Math.hypot(door.x - x, door.y - y) <= radius) return door;
  }
  return null;
}
