import { Slime } from "../../actors/Slime.ts";
import { RegionalMonster } from "../../actors/RegionalMonster.ts";
import type { CreatureKind } from "../../actors/CreatureCatalog.ts";
import type { CollisionMap } from "../../world/collision.ts";
import { CAVE_HEIGHT, CAVE_WIDTH } from "../../world/caveFloor.ts";
import { hash2 } from "../../world/random.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import type { CaveEntrance } from "../../world/caves.ts";

/** Quantas criaturas moram numa caverna comum do Centro (a Gruta das Raízes). */
export const CENTRAL_CAVE_MONSTERS = 6;
const MIN_FROM_PLAYER = 170, MIN_BETWEEN = 92;

/**
 * Quem mora em cada ponto da Gruta das Raízes: uma fila de doze (três slimes, um rato, dois morcegos, dois slimes de musgo, uma aranha, uma cobra-cipó, um
 * besouro e um cogumelo andante) de que cada caverna usa os seis primeiros a partir de um ponto de partida sorteado pela própria entrada. Assim cada gruta tem a sua mistura, e qualquer
 * janela de seis tem ao menos um slime e quatro tipos diferentes (conferido nos testes); nenhum tipo some do Centro, porque as janelas juntas passam por todos.
 * Quando só cabem três pontos (caverna estreita), valem os três primeiros da fila girada.
 */
export const CENTRAL_ROSTER: readonly CreatureKind[] = ["slime", "giant-rat", "cave-bat", "root-spider", "slime", "moss-slime", "cave-bat", "root-beetle", "slime", "vine-snake", "walking-mushroom", "moss-slime"];
/** A criatura do ponto `index` (0, 1, 2...) da caverna de sal `salt`. Pura: mesma entrada, mesma criatura. */
export function centralCaveKind(salt: number, index: number): CreatureKind {
  const turn = Math.floor(hash2(salt, 5, 97) * CENTRAL_ROSTER.length);
  return CENTRAL_ROSTER[(turn + index) % CENTRAL_ROSTER.length]!;
}

interface Spot { readonly x: number; readonly y: number; readonly name: string }

/**
 * O povo do Centro: as cavernas comuns do Centro (tema "verdant") nasciam vazias; hoje nascem com slimes e com as criaturas do Centro (ADR 0083, 0087 e 0088), em pontos
 * sorteados pela entrada (sempre os mesmos para a mesma entrada), em solo que o herói alcança, longe dele e uns dos outros. `defeated` guarda quem já caiu (o save),
 * e o número de tentativas é fixo: nada de laço aberto. O id do slime leva `:slime:`; o das outras criaturas, `:mob:` (o mesmo padrão das cavernas das outras regiões).
 */
export function centralCaveMonsters(entrance: CaveEntrance, floorId: string, collision: CollisionMap, hero: { readonly x: number; readonly y: number }, defeated: ReadonlySet<string>,
  reaches: (x: number, y: number) => boolean = () => true): Slime[] {
  const salt = entrance.seed ^ Math.imul(entrance.tileX, 1033) ^ Math.imul(entrance.tileY, 2053);
  const spots: Spot[] = [];
  const usable = (x: number, y: number): boolean => collision.canMove(x, y) && reaches(x, y) && Math.hypot(x - hero.x, y - hero.y) >= MIN_FROM_PLAYER &&
    spots.every(spot => Math.hypot(x - spot.x, y - spot.y) >= MIN_BETWEEN);
  for (let i = 0; i < 64 && spots.length < CENTRAL_CAVE_MONSTERS; i++) {
    const x = (4 + Math.floor(hash2(i, 7, salt + 71) * (CAVE_WIDTH - 8)) + .5) * TILE_SIZE, y = (4 + Math.floor(hash2(i, 11, salt + 83) * (CAVE_HEIGHT - 12)) + .5) * TILE_SIZE;
    if (usable(x, y)) spots.push({ x, y, name: String(i) });
  }
  // Garantia: se o sorteio só caiu em parede, varre as câmaras até achar pontos.
  for (let ty = 5; ty < CAVE_HEIGHT - 6 && spots.length < 3; ty++)
    for (let tx = 5; tx < CAVE_WIDTH - 4 && spots.length < 3; tx++) {
      const x = (tx + .5) * TILE_SIZE, y = (ty + .5) * TILE_SIZE;
      if (usable(x, y)) spots.push({ x, y, name: "s" + spots.length });
    }
  const monsters: Slime[] = [];
  for (const [index, spot] of spots.entries()) {
    const kind = centralCaveKind(salt, index), id = `${floorId}:${kind === "slime" ? "slime" : "mob"}:${spot.name}`;
    if (defeated.has(id)) continue;
    monsters.push(kind === "slime" ? new Slime(id, spot.x, spot.y) : new RegionalMonster(id, kind, spot.x, spot.y));
  }
  return monsters;
}
