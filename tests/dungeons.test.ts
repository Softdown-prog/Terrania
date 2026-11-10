import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { caveEntranceInCell, type CaveEntrance } from "../src/world/caves.ts";
import { CREATURE_CATALOG } from "../src/monsters/catalog.ts";
import { DUNGEONS, caveFloorCount, dungeonFloor, dungeonFloors, dungeonFor } from "../src/dungeons/index.ts";

/** Masmorras (ADR 0018): dados por região, um arquivo por masmorra; o motor só os lê. */
const SEED = 842136;
const entrancesIn = (cells: ReadonlyArray<readonly [number, number]>): CaveEntrance[] =>
  cells.flatMap(([cx, cy]) => caveEntranceInCell(cx, cy, SEED) ?? []);
const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const desert = (): CaveEntrance[] => entrancesIn(range(-12, 12).map(cx => [cx, 125] as const)).filter(e => e.theme === "desert");
const marsh = (): CaveEntrance[] => entrancesIn(range(125, 133).map(cx => [cx, 125] as const)).filter(e => e.theme === "marsh");

test("masmorras: cada andar só tem moradores do tema da caverna, e só o último tem chefe", () => {
  assert.ok(DUNGEONS.length >= 2);
  for (const dungeon of DUNGEONS) {
    assert.ok(dungeon.floors.length >= 2, dungeon.id + " tem vários andares");
    assert.equal(new Set(dungeon.floors.map(f => f.name)).size, dungeon.floors.length, "nomes de andar únicos");
    dungeon.floors.forEach((floor, i) => {
      assert.ok(floor.encounters >= 3 && floor.encounters <= 6, `${dungeon.id} andar ${i + 1}: encontros`);
      for (const kind of [...floor.monsters, ...(floor.boss ? [floor.boss] : [])])
        assert.ok(CREATURE_CATALOG[kind].caveThemes.includes(dungeon.theme), `${kind} não mora em cavernas ${dungeon.theme}`);
      assert.equal(Boolean(floor.boss), i === dungeon.floors.length - 1, `${dungeon.id}: só o último andar tem chefe`);
    });
    if (dungeon.shortVariant) {
      assert.equal(dungeon.shortVariant[0], 0);
      assert.equal(dungeon.shortVariant.at(-1), dungeon.floors.length - 1, "a versão curta termina no andar do chefe");
    }
  }
  const caves = DUNGEONS.filter(d => !d.tower);
  assert.equal(new Set(caves.map(d => d.theme)).size, caves.length, "um tema de caverna, uma masmorra");
  const towers = DUNGEONS.filter(d => d.tower);
  assert.equal(new Set(towers.map(d => d.tower)).size, towers.length, "uma torre, uma masmorra");
});

test("masmorras: um arquivo por masmorra, na pasta da região", () => {
  for (const region of new Set(DUNGEONS.map(d => d.region))) {
    const files = readdirSync("src/dungeons/" + region).filter(name => name !== "index.ts").sort();
    const ids = DUNGEONS.filter(d => d.region === region).map(d => d.id + ".ts").sort();
    assert.deepEqual(files, ids, `${region}: cada masmorra tem o seu arquivo e não sobra arquivo solto`);
  }
});

test("andares: o deserto tem 2 ou 3, o brejo 2, e as outras cavernas continuam com 1", () => {
  const counts = new Set(desert().map(caveFloorCount));
  assert.deepEqual([...counts].sort(), [2, 3], "as duas versões da Cripta das Dunas aparecem");
  assert.ok(marsh().length >= 2);
  for (const entrance of marsh()) assert.equal(caveFloorCount(entrance), 2);
  const others = entrancesIn([[0, -125], [5, -125], [127, 0], [-124, 0], [4, 3], [0, 0]]);
  assert.ok(others.length >= 4);
  for (const entrance of others) {
    assert.equal(caveFloorCount(entrance), 1, entrance.theme);
    assert.equal(dungeonFor(entrance), null);
    assert.deepEqual(dungeonFloors(entrance), []);
    assert.equal(dungeonFloor(entrance, 1), null);
  }
  for (const entrance of desert()) {
    const floors = dungeonFloors(entrance);
    assert.equal(floors[0]?.name, "Galerias de Areia", "o primeiro andar é sempre o das galerias");
    assert.equal(floors.at(-1)?.boss, "carrion-sandworm", "o último andar é sempre o do Verme");
    assert.deepEqual(dungeonFloors(entrance), floors, "determinístico");
  }
});
