import test from "node:test";
import assert from "node:assert/strict";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { nearbyStairsMove, reachedStairsMove, roomAfterMove } from "../src/engine/rooms/caveStairs.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_STAIRS_DOWN, CAVE_WIDTH, CaveFloor } from "../src/world/caveFloor.ts";
import { caveEntranceInCell, type CaveEntrance } from "../src/world/caves.ts";
import { caveFloorCount, dungeonFloor } from "../src/dungeons/index.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";

/** Andares de caverna (ADR 0018): escadas, chefe, chegada e troca de andar. */
const SEED = 842136;
const STILL = { x: 0, y: 0 };
const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const find = (cells: ReadonlyArray<readonly [number, number]>, theme: string, floors: number): CaveEntrance => {
  const hit = cells.flatMap(([cx, cy]) => caveEntranceInCell(cx, cy, SEED) ?? [])
    .find(e => e.theme === theme && caveFloorCount(e) === floors);
  assert.ok(hit, `caverna ${theme} com ${floors} andares`);
  return hit;
};
const desert3 = (): CaveEntrance => find(range(-12, 12).map(cx => [cx, 125] as const), "desert", 3);
const desert2 = (): CaveEntrance => find(range(-12, 12).map(cx => [cx, 125] as const), "desert", 2);
const marsh2 = (): CaveEntrance => find(range(125, 133).map(cx => [cx, 125] as const), "marsh", 2);
const px = (tile: { x: number; y: number }): { x: number; y: number } => ({ x: (tile.x + .5) * TILE_SIZE, y: (tile.y + .5) * TILE_SIZE });

/** Os dois pontos estão ligados por chão (varredura em tiles). */
function connected(floor: CaveFloor, from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  const seen = new Set<number>([from.y * CAVE_WIDTH + from.x]), queue = [[from.x, from.y]] as Array<[number, number]>;
  while (queue.length) {
    const [x, y] = queue.pop()!;
    if (x === to.x && y === to.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const a = x + dx, b = y + dy, key = b * CAVE_WIDTH + a;
      if (a < 0 || b < 0 || a >= CAVE_WIDTH || b >= CAVE_HEIGHT || seen.has(key) || floor.at(a, b) !== 1) continue;
      seen.add(key); queue.push([a, b]);
    }
  }
  return false;
}

test("andares: só o último não tem escada para baixo, e as duas escadas são chão ligado", () => {
  for (const entrance of [desert3(), desert2(), marsh2()]) {
    const count = caveFloorCount(entrance);
    for (let index = 1; index <= count; index++) {
      const floor = new CaveFloor(entrance, index, count);
      assert.equal(floor.hasStairsDown, index < count, `${entrance.id} andar ${index}`);
      assert.equal(floor.at(CAVE_EXIT.x, CAVE_EXIT.y), 1);
      if (floor.hasStairsDown) {
        assert.equal(floor.at(CAVE_STAIRS_DOWN.x, CAVE_STAIRS_DOWN.y), 1);
        assert.ok(connected(floor, CAVE_EXIT, CAVE_STAIRS_DOWN), `${entrance.id} andar ${index}: a escada de descida é alcançável`);
      }
    }
  }
});

test("andares: cada andar tem a sua planta e o seu id; o andar 1 mantém a planta de sempre", () => {
  const entrance = desert3();
  const floors = [1, 2, 3].map(i => new CaveFloor(entrance, i, 3));
  assert.deepEqual(floors.map(f => f.id), [1, 2, 3].map(i => entrance.id + ":floor:" + i));
  assert.notDeepEqual([...floors[0]!.cells], [...floors[1]!.cells]);
  assert.notDeepEqual([...floors[1]!.cells], [...floors[2]!.cells]);
  // Sem escada para baixo (andar único) a planta é a original: o teste de impressão digital cobre as 12 cavernas.
  const single = new CaveFloor(entrance);
  assert.equal(single.hasStairsDown, false);
});

test("andares: o chefe espera só no último andar, na câmara do fundo, e dá a vitória certa", () => {
  for (const entrance of [desert3(), marsh2()]) {
    const count = caveFloorCount(entrance), boss = dungeonFloor(entrance, count)!.boss!;
    for (let index = 1; index <= count; index++) {
      const room = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex: index });
      const bosses = [...room.monsters].filter(([id]) => id.endsWith(":boss"));
      assert.equal(bosses.length, index === count ? 1 : 0, `${entrance.id} andar ${index}`);
      if (index === count) {
        const [id, monster] = bosses[0]!;
        assert.equal(monster.kind, boss);
        assert.equal(id, room.floor.id + ":boss");
        monster.hp = 0;
        room.update(1 / 60, STILL);
        assert.ok(room.drainVictories().some(v => v.id === id && v.kind === boss), "a vitória do chefe é registrada");
      }
      const allowed = new Set([...dungeonFloor(entrance, index)!.monsters, ...(index === count ? [boss] : [])]);
      for (const [, monster] of room.monsters) assert.ok(allowed.has(monster.kind as never), `${monster.kind} fora da tabela do andar ${index}`);
      assert.ok(room.monsters.size >= 3, "o andar tem encontros");
    }
  }
});

test("andares: monstros derrotados ficam derrotados em cada andar e ninguém nasce em cima das escadas", () => {
  const entrance = desert3();
  const first = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex: 2 });
  const ids = [...first.monsters.keys()];
  const again = new CaveRoom(entrance, 100, 100, new Set(ids), { floorIndex: 2 });
  assert.equal(again.monsters.size, 0, "tudo que foi derrotado não volta");
  const stairs = px(CAVE_STAIRS_DOWN);
  for (const monster of first.monsters.values()) {
    assert.ok(Math.hypot(monster.x - stairs.x, monster.y - stairs.y) >= 130, "longe da escada de descida");
    assert.ok(Math.hypot(monster.x - first.player.x, monster.y - first.player.y) >= 170, "longe de quem chega");
  }
  assert.ok(ids.every(id => id.includes(":floor:2:")), "os ids carregam o andar");
});

test("andares: quem desce chega ao pé da escada de saída; quem sobe chega ao lado da escada de descida", () => {
  const entrance = desert3();
  const above = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex: 2, arrivedFrom: "above" });
  assert.ok(Math.hypot(above.player.x - px(CAVE_EXIT).x, above.player.y - px(CAVE_EXIT).y) > 52, "chega fora do alcance da escada de saída");
  const below = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex: 2, arrivedFrom: "below" });
  assert.ok(below.collision.canMove(below.player.x, below.player.y), "chega em chão livre");
  const stairs = px(CAVE_STAIRS_DOWN);
  const gap = Math.hypot(below.player.x - stairs.x, below.player.y - stairs.y);
  assert.ok(gap > 52, "chega fora do alcance da escada, para não descer de volta");
  assert.ok(gap < 140, "mas perto dela: quem subiu aparece onde estava a escada, não na entrada do andar");
  assert.ok(Math.hypot(above.player.x - stairs.x, above.player.y - stairs.y) > 300, "quem desce aparece longe da escada de descida");
  assert.equal(reachedStairsMove(below), null);
  assert.equal(nearbyStairsMove(below), null);
});

test("escadas: pisar ou chegar perto pede o movimento certo em cada andar", () => {
  const entrance = desert3();
  const move = (index: number, tile: { x: number; y: number }, near = false) => {
    const room = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex: index });
    Object.assign(room.player, px(tile));
    return near ? nearbyStairsMove(room) : reachedStairsMove(room);
  };
  assert.equal(move(1, CAVE_EXIT), "leave", "no andar 1 a saída leva à superfície");
  assert.equal(move(2, CAVE_EXIT), "ascend", "nos de baixo a mesma escada sobe um andar");
  assert.equal(move(3, CAVE_EXIT), "ascend");
  assert.equal(move(1, CAVE_STAIRS_DOWN), "descend");
  assert.equal(move(2, CAVE_STAIRS_DOWN), "descend");
  assert.equal(move(3, CAVE_STAIRS_DOWN), null, "o último andar não tem escada para baixo");
  assert.equal(move(2, { x: CAVE_EXIT.x, y: CAVE_EXIT.y - 1 }, true), "ascend");
  assert.equal(move(1, { x: CAVE_STAIRS_DOWN.x + 1, y: CAVE_STAIRS_DOWN.y }, true), "descend");
  assert.equal(move(3, { x: CAVE_STAIRS_DOWN.x + 1, y: CAVE_STAIRS_DOWN.y }, true), null);
});

test("troca de andar: o herói leva vida e estado, desce e sobe, e o destino respeita os limites", () => {
  const entrance = desert3();
  const defeated = new Set<string>();
  const one = new CaveRoom(entrance, 63, 120, defeated, { floorIndex: 1 });
  one.player.restoreNutrition({ reserve: 12, elapsed: 0.5, cooldown: 2 });
  one.player.applyStatus("poison", 4);
  const two = roomAfterMove(one, "descend", defeated);
  assert.equal(two.floorIndex, 2);
  assert.equal(two.player.hp, 63);
  assert.equal(two.player.maxHp, 120);
  assert.deepEqual(two.player.nutrition, one.player.nutrition, "a comida segue o herói");
  assert.equal(two.player.effects.poison, one.player.effects.poison, "o veneno também");
  assert.ok(two.player.effects.poison > 0);
  const back = roomAfterMove(two, "ascend", defeated);
  assert.equal(back.floorIndex, 1);
  assert.equal(back.floor.id, one.floor.id);
  const stairs = px(CAVE_STAIRS_DOWN);
  assert.ok(Math.hypot(back.player.x - stairs.x, back.player.y - stairs.y) > 52, "ao subir, o herói não cai de volta na escada");
  assert.equal(new CaveRoom(entrance, 100, 100, defeated, { floorIndex: 99 }).floorIndex, 3, "andar fora do limite é trazido para o último");
  assert.equal(new CaveRoom(entrance, 100, 100, defeated, { floorIndex: 0 }).floorIndex, 1);
});
