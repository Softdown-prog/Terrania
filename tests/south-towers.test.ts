import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { caveEntrancesInArea } from "../src/world/caves.ts";
import { getRegionWeights, getWorldRegion } from "../src/world/regions.ts";
import { getTile, nearSouthCity, TILE_SIZE } from "../src/world/terrain.ts";
import { getSouthRuinForCell, RUIN_CELL_TILES } from "../src/world/southRuins.ts";
import { TOWERS, towerById } from "../src/world/towers/index.ts";
import { TOWER_CELL_TILES, getSouthTowerForCell, southTowerBlocks, southTowersInArea,
  type SouthTower } from "../src/world/towers/placement.ts";
import { SOUTH_TOWERS } from "../src/world/towers/south/index.ts";
import { TOWER_PAINTERS } from "../src/render/south/towers/index.ts";

/**
 * Torres do Sul, parte de fora (ADR 0019). O sistema é próprio (não mexe em `regionalLandmarks.ts`); a colisão sai dos blocos da ficha, e cada torre tem ficha e pintor em arquivo próprio.
 */
const SEED = 842136;
/** Arquivos de apoio do desenho: não são torres (o kit compartilhado mora em `render/south/kit/`, ADR 0045). */
const HELPERS = ["index.ts"];
const fileIds = (dir: string): string[] =>
  readdirSync(new URL(dir, import.meta.url)).filter(f => f.endsWith(".ts") && !HELPERS.includes(f))
    .map(f => f.replace(/\.ts$/, "")).sort();

const allTowers = (seed = SEED): SouthTower[] => {
  const out: SouthTower[] = [];
  for (let cy = 20; cy <= 66; cy++) for (let cx = -24; cx <= 24; cx++) {
    const tower = getSouthTowerForCell(cx, cy, seed);
    if (tower) out.push(tower);
  }
  return out;
};

test("cada torre tem o seu arquivo de ficha e o seu pintor, por região", () => {
  assert.deepEqual(fileIds("../src/world/towers/south/"), TOWERS.map(t => t.id).sort(),
    "um arquivo de ficha por torre, nomeado pelo id");
  assert.deepEqual(fileIds("../src/render/south/towers/"), TOWERS.map(t => t.id).sort(),
    "um arquivo de pintor por torre, nomeado pelo id");
  assert.deepEqual(Object.keys(TOWER_PAINTERS).sort(), TOWERS.map(t => t.id).sort());
  assert.equal(SOUTH_TOWERS.length, 3);
  for (const tower of TOWERS) {
    assert.equal(tower.region, "south");
    assert.ok(tower.floors === 2 || tower.floors === 3, tower.id + " tem 2 ou 3 andares");
    assert.ok(tower.weight > 0 && tower.blocks.length > 0 && tower.name.length > 0);
    assert.equal(towerById(tower.id), tower);
  }
  assert.ok(TOWERS.some(t => t.floors === 2) && TOWERS.some(t => t.floors === 3), "há torres de 2 e de 3 andares");
  assert.throws(() => towerById("inexistente" as never), RangeError);
});

test("a porta fica no chão livre à frente da torre e fora de todos os blocos", () => {
  for (const tower of TOWERS) {
    for (const block of tower.blocks) {
      const inside = Math.abs(tower.door.x - block.x) < block.w / 2 + 7 && Math.abs(tower.door.y - block.y) < block.h / 2 + 7;
      assert.equal(inside, false, `${tower.id}: o herói alcança a porta sem ficar preso no bloco`);
    }
    assert.ok(tower.door.y > 0, tower.id + ": a porta fica à frente (sul) do ponto de contato");
  }
});

test("torres: determinísticas, só no Sul, de todos os modelos e outra semente muda o mapa", () => {
  const first = allTowers(), again = allTowers();
  assert.deepEqual(first.map(t => t.id), again.map(t => t.id));
  assert.ok(first.length > 150, "torres encontradas: " + first.length);
  const byId = new Map<string, number>();
  for (const placed of first) {
    byId.set(placed.tower.id, (byId.get(placed.tower.id) ?? 0) + 1);
    assert.ok(getRegionWeights(placed.tileX, placed.tileY).south >= 0.62);
    assert.equal(getWorldRegion(placed.tileX, placed.tileY), "south");
    assert.equal(nearSouthCity(placed.tileX, placed.tileY), false, "fora da cidade e do Poço Negro");
  }
  for (const tower of TOWERS) assert.ok((byId.get(tower.id) ?? 0) > 15, `${tower.id} aparece: ${[...byId].join(" ")}`);
  assert.ok(byId.get("vigia-caida")! > byId.get("sol-negro")!, "a torre comum é mais frequente que a rara");
  assert.notDeepEqual(allTowers(SEED + 1).map(t => [t.tileX, t.tileY]), first.map(t => [t.tileX, t.tileY]));
});

test("torres: pegada em chão livre, dentro do bloco desenhado, longe de ruína e de entrada de caverna", () => {
  for (const placed of allTowers().slice(0, 150)) {
    const dx = ((placed.tileX % 16) + 16) % 16, dy = ((placed.tileY % 16) + 16) % 16;
    assert.ok(dx >= 4 && dx <= 11 && dy >= 5 && dy <= 11, "a arte alta cabe no bloco de 16 tiles");
    for (let y = placed.tileY - 3; y <= placed.tileY + 2; y++) for (let x = placed.tileX - 4; x <= placed.tileX + 4; x++) {
      const tile = getTile(x, y, SEED);
      assert.ok(tile.ground !== "water" && tile.ground !== "path" && !tile.tree && !tile.rock, `${placed.id} tile ${x},${y}`);
    }
    const rx = Math.floor(placed.tileX / RUIN_CELL_TILES), ry = Math.floor(placed.tileY / RUIN_CELL_TILES);
    for (let cy = ry - 1; cy <= ry + 1; cy++) for (let cx = rx - 1; cx <= rx + 1; cx++) {
      const ruin = getSouthRuinForCell(cx, cy, SEED);
      if (ruin) assert.ok(Math.hypot(ruin.tileX - placed.tileX, ruin.tileY - placed.tileY) >= 14, placed.id + " longe de ruína");
    }
    const caves = caveEntrancesInArea(placed.tileX - 6, placed.tileY - 5, placed.tileX + 6, placed.tileY + 5, SEED);
    assert.equal(caves.length, 0, placed.id + " não cobre a entrada de uma caverna");
  }
});

test("torres: no máximo uma por célula e a consulta por área respeita o retângulo", () => {
  const some = allTowers()[10]!;
  const found = southTowersInArea(some.tileX - 2, some.tileY - 2, some.tileX + 2, some.tileY + 2, SEED);
  assert.deepEqual(found.map(t => t.id), [some.id]);
  assert.deepEqual(southTowersInArea(some.tileX + 1, some.tileY + 1, some.tileX + 2, some.tileY + 2, SEED), []);
  assert.deepEqual(southTowersInArea(0, 0, TOWER_CELL_TILES * 20, TOWER_CELL_TILES * 20, SEED), [], "consulta enorme é recusada");
  assert.deepEqual(southTowersInArea(Number.NaN, 0, 1, 1, SEED), []);
  assert.equal(new Set(allTowers().map(t => `${Math.floor(t.tileX / TOWER_CELL_TILES)}:${Math.floor(t.tileY / TOWER_CELL_TILES)}`)).size,
    allTowers().length);
});

test("colisão: o corpo da torre bloqueia, a porta e a frente ficam livres e o resto do mundo segue igual", () => {
  for (const placed of allTowers().slice(0, 60)) {
    const { x, y, tower } = placed;
    for (const block of tower.blocks) {
      assert.equal(southTowerBlocks(x + block.x, y + block.y, 7, SEED), true, `${placed.id} corpo bloqueia`);
      assert.equal(canMoveOnSeed(x + block.x, y + block.y, SEED), false, `${placed.id} o herói não atravessa a torre`);
    }
    assert.equal(southTowerBlocks(x + tower.door.x, y + tower.door.y, 7, SEED), false, `${placed.id} porta livre`);
    assert.equal(canMoveOnSeed(x + tower.door.x, y + tower.door.y, SEED), true, `${placed.id} o herói chega à porta`);
    assert.equal(southTowerBlocks(x + 300, y + 300, 7, SEED), false, "longe da torre nada bloqueia");
  }
  assert.equal(southTowerBlocks(0, 0, 7, SEED), false, "a área inicial não tem torre");
  assert.equal(southTowerBlocks(Number.NaN, 0, 7, SEED), false);
  assert.equal(southTowerBlocks(TILE_SIZE * 1e12, 0, 7, SEED), false);
});
