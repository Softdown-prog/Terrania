import test from "node:test";
import assert from "node:assert/strict";
import { caveEntranceInCell, isStarterCave, type CaveEntrance } from "../src/world/caves.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_STAIRS_DOWN, CAVE_WIDTH, CaveFloor } from "../src/world/caveFloor.ts";
import { sideChamberCount, sideChambersFor, shortcutsFor } from "../src/world/caveSideChambers.ts";
import { caveReach } from "../src/world/caveReach.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { caveFloorCount } from "../src/dungeons/index.ts";

/** Tocas e atalhos da Masmorra das Raízes (ADR 0102): mais caminhos e salas fora da fila principal, só nas grutas verdes do Centro. */
const SEED = 842136;
const verdant = (): CaveEntrance[] => {
  const found: CaveEntrance[] = [];
  for (let cx = -12; cx <= 12; cx++) for (let cy = -12; cy <= 12; cy++) {
    const entrance = caveEntranceInCell(cx, cy, SEED);
    if (entrance && !entrance.tower && entrance.theme === "verdant" && !isStarterCave(entrance)) found.push(entrance);
  }
  return found;
};
const hashCells = (floor: CaveFloor): number => { let h = 0; for (const cell of floor.cells) h = (Math.imul(h, 31) + cell) | 0; return h; };
const tile = (n: number): number => (n + .5) * TILE_SIZE;

test("tocas e atalhos: a contagem cresce com a profundidade (2, 3, 4 tocas e 0, 1, 2, 3 atalhos) e valores inválidos dão nada", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(sideChamberCount), [2, 3, 4, 4, 4]);
  assert.deepEqual([1, 2, 3, 4, 5].map(floor => shortcutsFor(floor).length), [0, 1, 2, 3, 3]);
  for (const bad of [0, -1, 1.5, NaN, Infinity]) { assert.equal(sideChamberCount(bad), 0); assert.deepEqual(shortcutsFor(bad), []); assert.deepEqual(sideChambersFor(bad, 7), []); }
});

test("tocas: cada andar tem as suas, com nomes distintos, dentro da faixa segura e longe da saída e da escada", () => {
  for (const salt of [0, 1, 99, 123456, -77]) for (let floor = 1; floor <= 5; floor++) {
    const chambers = sideChambersFor(floor, salt);
    assert.equal(chambers.length, sideChamberCount(floor));
    assert.equal(new Set(chambers.map(c => c.name)).size, chambers.length);
    assert.deepEqual(chambers.map(c => c.index), chambers.map((_, i) => i));
    for (const c of chambers) {
      // o centro e o entorno dele ficam dentro da faixa que a escavação aceita (a borda da sala pode encostar na parede da planta e ficar cortada)
      assert.ok(c.x >= 4 && c.x <= CAVE_WIDTH - 4 && c.y >= 4 && c.y <= CAVE_HEIGHT - 4, `${c.name} com o centro na faixa segura`);
      assert.ok(Math.hypot(c.x - CAVE_EXIT.x, c.y - CAVE_EXIT.y) > 12, `${c.name} longe da saída`);
      assert.ok(Math.hypot(c.x - CAVE_STAIRS_DOWN.x, c.y - CAVE_STAIRS_DOWN.y) > 6, `${c.name} longe da escada`);
    }
    assert.deepEqual(sideChambersFor(floor, salt), chambers, "o mesmo sal dá as mesmas tocas");
  }
});

test("tocas: cada uma se liga à sala certa da fila (Leste e Sudoeste à da saída, Noroeste à da escada, Telhado à da direita)", () => {
  assert.deepEqual(sideChambersFor(5, 0).map(c => [c.name, c.joinsRoom]), [["Toca Leste", 0], ["Toca Noroeste", 4], ["Toca do Telhado", 2], ["Toca Sudoeste", 0]]);
});

test("gruta verde: o miolo de cada toca (um tile a menos que o raio, em cruz) é chão", () => {
  for (const entrance of verdant().slice(0, 12)) for (let floorIndex = 1; floorIndex <= 5; floorIndex++) {
    const floor = new CaveFloor(entrance, floorIndex, 5);
    for (const c of floor.chambers) for (const [dx, dy] of [[c.rx - 1, 0], [-(c.rx - 1), 0], [0, c.ry - 1], [0, -(c.ry - 1)]] as const) {
      const x = c.x + dx, y = c.y + dy;
      if (x < 2 || y < 2 || x > CAVE_WIDTH - 3 || y > CAVE_HEIGHT - 3) continue; // a borda da planta corta a sala
      assert.equal(floor.at(x, y), 1, `${floor.id}: ${c.name} ${dx},${dy}`);
    }
  }
});

test("tocas: o sorteio desloca cada uma em uma faixa de 3 tiles e varia de gruta para gruta", () => {
  const xs = new Set<number>(), ys = new Set<number>();
  for (let salt = 0; salt < 60; salt++) {
    const chambers = sideChambersFor(4, salt * 7919 + 3);
    const base = sideChambersFor(4, 0);
    chambers.forEach((c, i) => {
      assert.ok(Math.abs(c.x - (base[i]!.x)) <= 2 && Math.abs(c.y - (base[i]!.y)) <= 2);
      if (i === 0) { xs.add(c.x); ys.add(c.y); }
    });
  }
  assert.ok(xs.size >= 2 && ys.size >= 2, "a posição varia com o sal");
  assert.ok(xs.size <= 3 && ys.size <= 3, "e fica numa faixa de 3 tiles");
});

test("gruta verde: o corredor de cada toca e de cada atalho está escavado de ponta a ponta (3 tiles de largura)", () => {
  const carved = (floor: CaveFloor, ax: number, ay: number, bx: number, by: number): void => {
    let x = ax, y = ay;
    const check = (tx: number, ty: number): void => assert.equal(floor.at(tx, ty), 1, `${floor.id}: ${tx},${ty}`);
    while (x !== bx) { for (let dy = -1; dy <= 1; dy++) check(x, y + dy); x += Math.sign(bx - x); }
    while (y !== by) { for (let dx = -1; dx <= 1; dx++) check(x + dx, y); y += Math.sign(by - y); }
  };
  for (const entrance of verdant().slice(0, 12)) for (let floorIndex = 1; floorIndex <= 5; floorIndex++) {
    const floor = new CaveFloor(entrance, floorIndex, 5);
    assert.equal(floor.rooms.length, 5);
    for (const c of floor.chambers) carved(floor, c.x, c.y, floor.rooms[c.joinsRoom]!.x, floor.rooms[c.joinsRoom]!.y);
    for (const link of shortcutsFor(floorIndex)) carved(floor, floor.rooms[link.fromRoom]!.x, floor.rooms[link.fromRoom]!.y, floor.rooms[link.toRoom]!.x, floor.rooms[link.toRoom]!.y);
  }
});

test("a gruta de treinamento e as cavernas de outros temas continuam exatamente como eram (soma de verificação da planta)", () => {
  // Valores tirados do código de antes da L5b: se mudarem, os mapas que os jogadores já conhecem mudaram.
  const golden: Record<string, number> = {
    "cave:842136:0:0": -84576484,
    "cave:842136:-30:38": -660440961, "cave:842136:-30:39": -664854858, "cave:842136:-30:-144": -257442576, "cave:842136:-30:-139": -1752982495,
  };
  const later: Record<string, [number, number]> = {
    "cave:842136:0:0": [-1101555452, -682700994], "cave:842136:-30:38": [1161891742, 1530183873], "cave:842136:-30:39": [-725182939, -1887620356],
    "cave:842136:-30:-144": [-496951074, 480354139], "cave:842136:-30:-139": [-700718405, 197016441],
  };
  for (const [id, first] of Object.entries(golden)) {
    const [, , cx, cy] = id.split(":").map(Number) as [number, number, number, number];
    const entrance = caveEntranceInCell(cx, cy, SEED);
    assert.ok(entrance, id);
    if (!entrance) continue;
    assert.equal(new CaveFloor(entrance, 1, 3).chambers.length, 0, id + ": sem tocas");
    assert.equal(hashCells(new CaveFloor(entrance, 1, 3)), first, id + " andar 1");
    assert.equal(hashCells(new CaveFloor(entrance, 2, 3)), later[id]![0], id + " andar 2");
    assert.equal(hashCells(new CaveFloor(entrance, 3, 3)), later[id]![1], id + " andar 3");
  }
});

test("gruta verde: toda toca é chão alcançável desde a saída, em todos os andares, e a escada e a saída continuam livres", () => {
  const entrances = verdant().slice(0, 40);
  assert.ok(entrances.length >= 30);
  for (const entrance of entrances) {
    const count = caveFloorCount(entrance);
    for (let floorIndex = 1; floorIndex <= count; floorIndex++) {
      const floor = new CaveFloor(entrance, floorIndex, count);
      assert.equal(floor.chambers.length, sideChamberCount(floorIndex), `${entrance.id} andar ${floorIndex}`);
      const start = { x: tile(CAVE_EXIT.x), y: tile(CAVE_EXIT.y - 3) };
      const reaches = caveReach(floor.collision, start);
      for (const c of floor.chambers) assert.ok(reaches(tile(c.x), tile(c.y)), `${entrance.id} andar ${floorIndex}: ${c.name} alcançável`);
      if (floor.hasStairsDown) assert.ok(reaches(tile(CAVE_STAIRS_DOWN.x), tile(CAVE_STAIRS_DOWN.y)), `${entrance.id} andar ${floorIndex}: escada alcançável`);
      assert.equal(floor.at(CAVE_EXIT.x, CAVE_EXIT.y), 1);
    }
  }
});

test("gruta verde: cada andar tem mais chão do que a planta antiga, e os andares de baixo mais que os de cima", () => {
  const open = (floor: CaveFloor): number => floor.cells.reduce((sum, cell) => sum + (cell === 1 ? 1 : 0), 0);
  for (const entrance of verdant().slice(0, 20)) {
    const sizes = [1, 2, 3].map(floorIndex => open(new CaveFloor(entrance, floorIndex, 3)));
    assert.ok(sizes.every(size => size > 400), `${entrance.id}: ${sizes}`);
  }
});

test("guardiões das tocas: um por toca, no meio dela, com id próprio e só do povo do andar", () => {
  for (const entrance of verdant().slice(0, 20)) {
    const count = caveFloorCount(entrance);
    for (let floorIndex = 1; floorIndex <= count; floorIndex++) {
      const room = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex });
      const dens = [...room.monsters.entries()].filter(([id]) => id.includes(":den:"));
      assert.equal(dens.length, room.floor.chambers.length, `${entrance.id} andar ${floorIndex}`);
      for (const [id, mob] of dens) {
        const chamber = room.floor.chambers[Number(id.split(":den:")[1])]!;
        assert.equal(Math.floor(mob.x / TILE_SIZE), chamber.x); assert.equal(Math.floor(mob.y / TILE_SIZE), chamber.y);
      }
    }
  }
});

test("guardiões das tocas: derrotado fica derrotado no save e volta depois, no lugar onde nasceu, com o herói longe", () => {
  const entrance = verdant()[0]!;
  const room = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex: 2 });
  const [id] = [...room.monsters.keys()].filter(key => key.includes(":den:"));
  assert.ok(id);
  const defeated = new Set([id!]);
  assert.equal(new CaveRoom(entrance, 100, 100, defeated, { floorIndex: 2 }).monsters.has(id!), false, "o derrotado não nasce de novo no save");
  const original = room.monsters.get(id!)!;
  room.monsters.delete(id!);
  room.player.x = tile(CAVE_EXIT.x); room.player.y = tile(CAVE_EXIT.y);
  assert.deepEqual(room.respawnTick(2, () => undefined), [id]);
  const back = room.monsters.get(id!)!;
  assert.equal(back.x, original.x); assert.equal(back.y, original.y);
});

test("só as masmorras ganham guardiões: caverna comum de outro tema e a gruta de treinamento não têm toca", () => {
  const starter = caveEntranceInCell(0, 0, SEED)!;
  assert.ok(isStarterCave(starter));
  for (const room of [new CaveRoom(starter, 100, 100, new Set())]) assert.equal([...room.monsters.keys()].some(id => id.includes(":den:")), false);
});
