import test from "node:test";
import assert from "node:assert/strict";
import { caveEntranceInCell, type CaveEntrance } from "../src/world/caves.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_STAIRS_DOWN, CAVE_WIDTH, CaveFloor } from "../src/world/caveFloor.ts";
import { dungeonEntranceNear } from "../src/world/entrances.ts";
import { towerEntrance, towerEntranceNear } from "../src/world/towers/entrance.ts";
import { TOWERS } from "../src/world/towers/index.ts";
import { getSouthTowerForCell, type SouthTower } from "../src/world/towers/placement.ts";
import { CREATURE_CATALOG } from "../src/monsters/catalog.ts";
import { DUNGEONS, caveFloorCount, dungeonFloor, dungeonFloors, dungeonFor } from "../src/dungeons/index.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { reachedStairsMove, roomAfterMove } from "../src/engine/rooms/caveStairs.ts";

/**
 * Interior das torres do Sul (ADR 0020): a porta da torre é uma entrada de masmorra, os andares
 * vêm da ficha da torre e a planta é de salões retos. O motor de andares é o mesmo das cavernas.
 */
const SEED = 842136;
const towersOf = (id: string, n = 3): SouthTower[] => {
  const out: SouthTower[] = [];
  for (let cy = 24; cy < 70 && out.length < n; cy++) for (let cx = -10; cx <= 10 && out.length < n; cx++) {
    const t = getSouthTowerForCell(cx, cy, SEED);
    if (t && t.tower.id === id) out.push(t);
  }
  return out;
};

/** Há caminho de chão entre dois tiles (4 vizinhos), como o herói de raio 7 percorre. */
function connected(floor: CaveFloor, from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  const seen = new Set<number>([from.y * CAVE_WIDTH + from.x]);
  const queue = [from];
  while (queue.length) {
    const here = queue.shift()!;
    if (here.x === to.x && here.y === to.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = here.x + dx, y = here.y + dy, key = y * CAVE_WIDTH + x;
      if (x < 0 || y < 0 || x >= CAVE_WIDTH || y >= CAVE_HEIGHT || seen.has(key) || floor.at(x, y) !== 1) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return false;
}

test("cada torre tem uma masmorra com tantos andares quanto a ficha, e só o último tem chefe", () => {
  for (const tower of TOWERS) {
    const dungeons = DUNGEONS.filter(d => d.tower === tower.id);
    assert.equal(dungeons.length, 1, tower.id + " tem uma masmorra");
    const dungeon = dungeons[0]!;
    assert.equal(dungeon.region, tower.region);
    assert.equal(dungeon.name, tower.name, "o nome da masmorra é o da torre");
    assert.equal(dungeon.floors.length, tower.floors, `${tower.id}: andares da masmorra = andares da ficha`);
    dungeon.floors.forEach((floor, i) => {
      assert.ok(floor.encounters >= 3 && floor.encounters <= 6);
      for (const kind of [...floor.monsters, ...(floor.boss ? [floor.boss] : [])])
        assert.ok(CREATURE_CATALOG[kind].caveThemes.includes(dungeon.theme), `${kind} não mora em ${dungeon.theme}`);
      assert.equal(Boolean(floor.boss), i === dungeon.floors.length - 1, "só o último andar tem chefe");
    });
    assert.equal(dungeon.shortVariant, undefined, "torre não tem versão curta");
  }
  assert.equal(new Set(DUNGEONS.filter(d => d.tower).flatMap(d => d.floors.map(f => f.name))).size,
    DUNGEONS.filter(d => d.tower).reduce((n, d) => n + d.floors.length, 0), "nomes de andar únicos entre as torres");
});

test("a porta da torre é uma entrada de masmorra no chão livre, e a caverna comum não vira torre", () => {
  for (const tower of TOWERS) for (const placed of towersOf(tower.id)) {
    const door = towerEntrance(placed, SEED);
    assert.equal(door.tower, tower.id);
    assert.equal(door.name, tower.name);
    assert.equal(door.theme, "desert");
    assert.equal(door.id, placed.id);
    assert.equal(caveFloorCount(door), tower.floors);
    assert.equal(dungeonFor(door)?.tower, tower.id);
    assert.equal(dungeonFloor(door, 1)?.name, dungeonFloors(door)[0]!.name);
    // de pé na porta, a porta é encontrada; longe dela, não
    assert.deepEqual(towerEntranceNear(door.x, door.y, SEED), door);
    assert.deepEqual(dungeonEntranceNear(door.x, door.y + 20, SEED), door);
    assert.equal(towerEntranceNear(door.x, door.y + 400, SEED), null, "longe da porta não se entra");
    assert.equal(dungeonEntranceNear(door.x + 900, door.y - 900, SEED) === null ||
      dungeonEntranceNear(door.x + 900, door.y - 900, SEED)?.tower === undefined, true);
  }
  assert.equal(towerEntranceNear(Number.NaN, 0, SEED), null);
  assert.equal(towerEntranceNear(0, 0, SEED, -1), null);
  const cave = caveEntranceInCell(0, 125, SEED) ?? caveEntranceInCell(1, 125, SEED);
  assert.ok(cave);
  assert.equal(cave.tower, undefined);
  assert.equal(dungeonEntranceNear(cave.x, cave.y, SEED)?.id, cave.id, "a entrada de caverna segue valendo");
});

test("planta de torre: salões retos, escadas ligadas por chão em todo andar, determinística", () => {
  for (const tower of TOWERS) for (const placed of towersOf(tower.id, 2)) {
    const door = towerEntrance(placed, SEED);
    for (let index = 1; index <= tower.floors; index++) {
      const floor = new CaveFloor(door, index, tower.floors);
      assert.equal(floor.at(CAVE_EXIT.x, CAVE_EXIT.y), 1, "a saída está em chão");
      assert.equal(floor.at(CAVE_STAIRS_DOWN.x, CAVE_STAIRS_DOWN.y), 1, "o chefe e a escada têm chão");
      assert.ok(connected(floor, CAVE_EXIT, CAVE_STAIRS_DOWN), `${tower.id} andar ${index}: saída liga à câmara do fundo`);
      assert.equal(floor.hasStairsDown, index < tower.floors);
      assert.deepEqual([...new CaveFloor(door, index, tower.floors).cells], [...floor.cells], "determinística");
      const open = floor.cells.reduce((n, c) => n + (c === 1 ? 1 : 0), 0);
      assert.ok(open > 450 && open < 700, `salões amplos mas não vazios: ${open}`);
      assert.equal(floor.cells.includes(2), false, "torre não tem água funda");
    }
  }
  // não é a planta de caverna: o mesmo ponto, com e sem `tower`, dá mapas diferentes
  const placed = towersOf("miragem", 1)[0]!;
  const door = towerEntrance(placed, SEED);
  const { tower: _tower, ...asCave } = door;
  assert.notDeepEqual([...new CaveFloor(door, 1, 3).cells], [...new CaveFloor(asCave as CaveEntrance, 1, 3).cells]);
});

test("entrar, descer, subir e sair pelo motor das cavernas: andar certo, nome certo, chefe só no último", () => {
  for (const tower of TOWERS) {
    const placed = towersOf(tower.id, 1)[0]!;
    const door = towerEntrance(placed, SEED);
    let room = new CaveRoom(door, 100, 100);
    assert.equal(room.floorCount, tower.floors);
    assert.equal(room.floorIndex, 1);
    assert.equal(room.floorName, dungeonFloors(door)[0]!.name);
    assert.ok(room.monsters.size >= 2, tower.id + ": o primeiro andar tem criaturas");
    assert.equal([...room.monsters.keys()].some(id => id.endsWith(":boss")), false);
    assert.equal(reachedStairsMove(room), null, "o herói chega longe das escadas");
    for (let index = 2; index <= tower.floors; index++) {
      room = roomAfterMove(room, "descend", new Set());
      assert.equal(room.floorIndex, index);
      assert.equal(room.floorName, dungeonFloors(door)[index - 1]!.name);
      assert.equal([...room.monsters.keys()].some(id => id.endsWith(":boss")), index === tower.floors);
    }
    const boss = [...room.monsters.values()].find(m => m.id.endsWith(":boss"));
    assert.equal(boss?.kind, dungeonFloors(door).at(-1)!.boss);
    room = roomAfterMove(room, "ascend", new Set());
    assert.equal(room.floorIndex, tower.floors - 1);
  }
});
