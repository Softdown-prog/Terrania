import test from "node:test";
import assert from "node:assert/strict";
import { migrateMapPoint, needsMapMigration } from "../src/world/mapMigration.ts";
import { ANTES, MAP_VERSION } from "../src/world/mapSize.ts";
import { SOUTH_CITY, southPoint } from "../src/world/southCity.ts";
import { WORLD_EDGE_PIXELS, canMoveOnSeed } from "../src/world/collision.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";
import { VILLAGE_RESPAWN } from "../src/world/village.ts";
import { capitalPoint } from "../src/world/center/capital/index.ts";
import { OfflineSimulation, type OfflineSave } from "../src/engine/OfflineSimulation.ts";
import { loadLocalSave, saveLocal } from "../src/storage/localSave.ts";
import { normalizeDrops } from "../src/engine/character/loot.ts";

/**
 * Saves feitos no mapa maior (ADR 0059): quem estava no Poço Negro antigo, ou nas estradas dele, vai para o mesmo ponto da
 * cidade nova; a Vila e a capital não se mexem; o que ficou além da parede nova volta ao ponto inicial; e o save novo traz a
 * versão e não é migrado de novo.
 */
const KEY = "terrania-origins-v1", SEED = 842136, T = TILE_SIZE;
const OLD_CENTER_Y = (ANTES.southCityDistanceTiles + 0.5) * T, NEW_CENTER_Y = (SOUTH_CITY.centerY + 0.5) * T, SHIFT = OLD_CENTER_Y - NEW_CENTER_Y;

function withStorage(run: (store: Map<string, string>) => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage"), store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } } });
  try { run(store); } finally { if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage"); }
}
const base = { seed: SEED, hp: 100, kills: 0, defeated: [] as string[] };

test("a cidade nova fica 7.744 tiles mais perto, e o ponto de um save antigo acompanha: o centro, os portões e o poço caem nos mesmos pontos", () => {
  assert.equal(SHIFT, 7_744 * T);
  for (const [lx, ly] of [[0, 0], [0, SOUTH_CITY.minY], [0, SOUTH_CITY.maxY], [SOUTH_CITY.minX, 0], [SOUTH_CITY.maxX, 0], [8, -10]] as const) {
    const old = { x: (lx + 0.5) * T, y: (ANTES.southCityDistanceTiles + ly + 0.5) * T }, now = southPoint(lx, ly);
    assert.deepEqual(migrateMapPoint(old.x, old.y), { x: now.x, y: now.y }, `${lx},${ly}`);
  }
});

test("só quem está na cidade antiga e nas estradas dela (100 tiles de cada lado) se mexe; a Vila, a capital e o resto ficam", () => {
  const reach = 100 * T;
  for (const [dx, dy, moved] of [[0, 0, true], [reach, 0, true], [-reach, 0, true], [0, reach, true], [0, -reach, true], [reach + 1, 0, false], [-reach - 1, 0, false], [0, reach + 1, false], [0, -reach - 1, false], [reach, reach, true]] as const) {
    const x = dx, y = OLD_CENTER_Y + dy, got = migrateMapPoint(x, y);
    assert.deepEqual(got, moved ? { x, y: y - SHIFT } : { x, y }, `${dx},${dy}`);
  }
  for (const [x, y] of [[VILLAGE_RESPAWN.x, VILLAGE_RESPAWN.y], [0, 0], [capitalPoint(0, 0).x, capitalPoint(0, 0).y], [-9000, 3000], [123_456, -321_000], [0, 300_000]] as const)
    assert.deepEqual(migrateMapPoint(x, y), { x, y }, `${x},${y}`);
  for (const [x, y] of [[Number.NaN, 5], [5, Number.POSITIVE_INFINITY]] as const) { const r = migrateMapPoint(x, y); assert.ok(Object.is(r.x, x) && Object.is(r.y, y)); }
  // o centro da cidade NOVA não mexe (o ponto novo não é "antigo"): migrar duas vezes um save é sempre evitado pela versão
  assert.equal(needsMapMigration(undefined), true); assert.equal(needsMapMigration(1), true); assert.equal(needsMapMigration(MAP_VERSION), false); assert.equal(needsMapMigration("2"), true);
});

test("o save do mapa antigo é migrado ao carregar: a posição, os itens no chão e a versão; o resto do save fica como estava", () => {
  withStorage(store => {
    const drop = (id: string, dx: number, dy: number) => ({ id, item: "gel", x: dx, y: OLD_CENTER_Y + dy });
    store.set(KEY, JSON.stringify({ ...base, x: 200, y: OLD_CENTER_Y + 480, kills: 7, experience: 900, defeated: ["a", "b"],
      drops: [drop("perto", 64, 32), { id: "longe", item: "gel", x: 64, y: 300_000 }, { id: "ruim", item: "gel", x: "x", y: 5 }, null, 7] }));
    const save = loadLocalSave()!;
    assert.deepEqual([save.x, save.y], [200, NEW_CENTER_Y + 480], "o herói acompanha a cidade");
    assert.equal(save.mapVersion, MAP_VERSION);
    assert.equal(save.kills, 7); assert.equal(save.experience, 900); assert.deepEqual(save.defeated, ["a", "b"]);
    assert.deepEqual(save.drops, [{ id: "perto", item: "gel", x: 64, y: NEW_CENTER_Y + 32 }, { id: "longe", item: "gel", x: 64, y: 300_000 }], "o item na cidade acompanha; o de fora fica; o inválido sai");
  });
});

test("o save novo traz a versão e não é migrado de novo: salvar e carregar devolve o mesmo ponto, quantas vezes for", () => {
  withStorage(store => {
    const sim = new OfflineSimulation(SEED);
    sim.player.x = southPoint(0, 5).x; sim.player.y = southPoint(0, 5).y;
    const snap = sim.snapshot();
    assert.equal(snap.mapVersion, MAP_VERSION);
    saveLocal(snap);
    assert.equal(JSON.parse(store.get(KEY)!).mapVersion, MAP_VERSION);
    let at = { x: snap.x, y: snap.y };
    for (let i = 0; i < 3; i++) { const loaded = loadLocalSave()!; assert.deepEqual({ x: loaded.x, y: loaded.y }, at, `volta ${i}`); saveLocal(loaded); }
    // um herói salvo na cidade NOVA, num save sem a versão, seria arrastado: é por isso que a versão existe
    store.set(KEY, JSON.stringify({ ...base, x: snap.x, y: snap.y, mapVersion: MAP_VERSION }));
    assert.deepEqual({ x: loadLocalSave()!.x, y: loadLocalSave()!.y }, at);
    store.set(KEY, JSON.stringify({ ...base, x: 5, y: 5, mapVersion: 1 })); assert.equal(loadLocalSave()!.mapVersion, MAP_VERSION, "versão de outro mapa também migra");
    // num save novo, um item no chão perto do ponto onde ficava a cidade antiga (no deserto aberto agora) não é arrastado
    const stay = { id: "fica", item: "gel", x: 64, y: OLD_CENTER_Y + 32 };
    store.set(KEY, JSON.stringify({ ...base, x: 5, y: 5, mapVersion: MAP_VERSION, drops: [stay] }));
    assert.deepEqual(loadLocalSave()!.drops, [stay], "o save novo não migra os itens");
  });
});

test("o herói de um save antigo que ficou além da parede nova, ou em chão que mudou, volta à Vila; quem está na cidade antiga chega à nova", () => {
  const far: OfflineSave = { ...base, x: 0, y: (ANTES.southCityDistanceTiles + 3000) * T };
  assert.ok(far.y > WORLD_EDGE_PIXELS && canMoveOnSeed(far.x, far.y, SEED) === false, "fora da parede nova");
  const gone = new OfflineSimulation(SEED, far);
  assert.deepEqual([gone.player.x, gone.player.y], [new OfflineSimulation(SEED).player.x, new OfflineSimulation(SEED).player.y], "volta ao ponto inicial");
  withStorage(store => {
    store.set(KEY, JSON.stringify({ ...base, x: southPoint(0, 0).x, y: OLD_CENTER_Y + 6 * T }));
    const sim = new OfflineSimulation(SEED, loadLocalSave()!);
    assert.deepEqual([sim.player.x, sim.player.y], [southPoint(0, 0).x, NEW_CENTER_Y + 6 * T], "no mesmo ponto da cidade nova");
    assert.notDeepEqual([sim.player.x, sim.player.y], [VILLAGE_RESPAWN.x, VILLAGE_RESPAWN.y]);
  });
});

test("os itens no chão além da parede nova são descartados ao normalizar, e os de dentro ficam", () => {
  const inside = { id: "a", item: "gel", x: WORLD_EDGE_PIXELS, y: -WORLD_EDGE_PIXELS }, outside = { id: "b", item: "gel", x: WORLD_EDGE_PIXELS + 1, y: 0 }, outsideY = { id: "c", item: "gel", x: 0, y: -WORLD_EDGE_PIXELS - 1 };
  assert.deepEqual(normalizeDrops([inside, outside, outsideY]).map(d => d.id), ["a"]);
});
