import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { southSiteSpawns } from "../src/actors/southSiteSpawns.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { blackLakeShoreSpots, isBlackLakeShore } from "../src/world/blackLakeShore.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { getWorldRegion } from "../src/world/regions.ts";
import { getSouthRuinForCell } from "../src/world/southRuins.ts";
import { CHUNK_TILES, TILE_SIZE, getTile } from "../src/world/terrain.ts";
import { protectedSurfaceTile } from "../src/world/village.ts";
import { HYDRA_MIN_LAKE_TILES, LAKE_DWELLERS, RUIN_DWELLERS, RUIN_RESIDENTS } from "../src/monsters/sites/south/index.ts";

/**
 * Moradores das margens dos lagos negros e das ruínas do Sul (ADR 0027): onde ficam, quem são,
 * e que o povoamento é determinístico e só existe no Sul.
 */
const SEED = 842136;
const tileOf = (m: RegionalMonster): { tx: number; ty: number } => ({ tx: Math.floor(m.x / TILE_SIZE), ty: Math.floor(m.y / TILE_SIZE) });
/** Blocos de 16 tiles numa janela de lagos (o Sul fundo, abaixo do Poço Negro). */
const lakeChunks = (): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let cy = 560; cy <= 590; cy++) for (let cx = -22; cx <= 22; cx++) out.push([cx, cy]);
  return out;
};
const lakeDwellers = (seed = SEED): RegionalMonster[] =>
  lakeChunks().flatMap(([cx, cy]) => southSiteSpawns(cx, cy, seed)).filter(m => m.id.includes(":lake:"));
const ruinCells = (): Array<{ id: string; tileX: number; tileY: number }> => {
  const out = [];
  for (let cy = 30; cy <= 90; cy++) for (let cx = -30; cx <= 30; cx++) {
    const ruin = getSouthRuinForCell(cx, cy, SEED);
    if (ruin) out.push(ruin);
  }
  return out;
};

test("a tabela de moradores: sapo comum, ent às vezes, hidra rara; diabrete e elfo nas ruínas", () => {
  assert.deepEqual(LAKE_DWELLERS.map(r => r.kind), ["poison-scout-toad", "rotten-marsh-ent", "mire-hydra"]);
  assert.ok(LAKE_DWELLERS[0]!.weight > LAKE_DWELLERS[1]!.weight && LAKE_DWELLERS[1]!.weight > LAKE_DWELLERS[2]!.weight);
  assert.deepEqual(RUIN_DWELLERS.map(r => r.kind).slice(0, 2), ["mirage-imp", "oasis-elf"]);
  assert.equal(RUIN_RESIDENTS, 2);
  assert.ok(HYDRA_MIN_LAKE_TILES >= 10);
});

test("lagos: moradores determinísticos, em chão livre à beira da água, e a hidra só em lago grande", () => {
  const first = lakeDwellers(), again = lakeDwellers();
  assert.deepEqual(first.map(m => [m.id, m.kind, m.x, m.y]), again.map(m => [m.id, m.kind, m.x, m.y]));
  assert.ok(first.length > 40, "moradores de lago encontrados: " + first.length);
  assert.equal(new Set(first.map(m => m.id)).size, first.length, "ids únicos");
  const kinds = new Map<string, number>();
  for (const dweller of first) {
    kinds.set(dweller.kind, (kinds.get(dweller.kind) ?? 0) + 1);
    const { tx, ty } = tileOf(dweller);
    assert.ok(LAKE_DWELLERS.some(r => r.kind === dweller.kind), dweller.kind);
    assert.equal(getWorldRegion(tx, ty), "south");
    assert.equal(isBlackLakeShore(tx, ty, SEED), true, `${dweller.id} fica à beira de um lago negro`);
    assert.equal(canMoveOnSeed(dweller.x, dweller.y, SEED), true, "em chão onde o herói também anda");
    assert.equal(protectedSurfaceTile(tx, ty), false);
    assert.ok(dweller.id.startsWith(`south-site:${SEED}:lake:`));
  }
  assert.ok((kinds.get("poison-scout-toad") ?? 0) > (kinds.get("rotten-marsh-ent") ?? 0), "o sapo é o mais comum");
  assert.ok((kinds.get("rotten-marsh-ent") ?? 0) > 0, "há ents");
  const hydras = first.filter(m => m.kind === "mire-hydra");
  assert.ok(hydras.length > 0, "há hidras nos lagos grandes");
  for (const hydra of hydras) {
    const { tx, ty } = tileOf(hydra);
    let lake = 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (getTile(tx + dx, ty + dy, SEED).biome === "black-lake") lake++;
    assert.ok(lake >= HYDRA_MIN_LAKE_TILES, `${hydra.id}: lago de ${lake} tiles`);
  }
  assert.notDeepEqual(lakeDwellers(SEED + 1).map(m => m.id), first.map(m => m.id), "outra semente, outro mapa");
});

test("lagos: no máximo dois por bloco, e as margens vazias não geram nada", () => {
  for (const [cx, cy] of lakeChunks().slice(0, 400)) {
    const here = southSiteSpawns(cx, cy, SEED).filter(m => m.id.includes(":lake:"));
    assert.ok(here.length <= 2, `${cx},${cy}: ${here.length}`);
    for (const spot of blackLakeShoreSpots(cx, cy, SEED)) assert.ok(spot.lake >= 1);
  }
});

test("ruínas: cada ruína tem dois moradores (diabrete, elfo ou goblin) perto das peças, em chão livre", () => {
  const ruins = ruinCells().slice(0, 120);
  assert.ok(ruins.length > 60);
  for (const ruin of ruins) {
    const cx = Math.floor(ruin.tileX / CHUNK_TILES), cy = Math.floor(ruin.tileY / CHUNK_TILES);
    const here = southSiteSpawns(cx, cy, SEED).filter(m => m.id.includes(`:ruin:${ruin.id}:`));
    assert.ok(here.length >= 1 && here.length <= 2, `${ruin.id}: ${here.length} moradores`);
    for (const resident of here) {
      const { tx, ty } = tileOf(resident);
      assert.ok(RUIN_DWELLERS.some(r => r.kind === resident.kind), resident.kind);
      assert.ok(Math.abs(tx - ruin.tileX) <= 7 && Math.abs(ty - ruin.tileY) <= 5, `${resident.id} perto da ruína`);
      assert.equal(canMoveOnSeed(resident.x, resident.y, SEED), true, "não nasce dentro de uma parede");
    }
  }
  const all = ruins.flatMap(r => southSiteSpawns(Math.floor(r.tileX / CHUNK_TILES), Math.floor(r.tileY / CHUNK_TILES), SEED));
  const kinds = new Set(all.filter(m => m.id.includes(":ruin:")).map(m => m.kind));
  assert.ok(kinds.has("mirage-imp") && kinds.has("oasis-elf"), "diabrete e elfo aparecem: " + [...kinds].join());
});

test("fora do Sul não mora ninguém, e valores inválidos não geram nada", () => {
  for (const [cx, cy] of [[0, 0], [3, -500], [600, 4], [-600, 4], [0, 200], [10, -2000]] as const)
    assert.deepEqual(southSiteSpawns(cx, cy, SEED), [], `${cx},${cy}`);
  assert.deepEqual(southSiteSpawns(Number.NaN, 1, SEED), []);
  assert.deepEqual(southSiteSpawns(1.5, 2, SEED), []);
  assert.deepEqual(blackLakeShoreSpots(0, 0, SEED), []);
});

test("no jogo: o herói perto de um lago ou de uma ruína encontra os moradores, e o derrotado não volta", () => {
  const lake = lakeDwellers()[0]!, ruin = ruinCells()[0]!;
  const sim = new OfflineSimulation(SEED, { seed: SEED, x: lake.x, y: lake.y + 64, hp: 100, kills: 0, defeated: [],
    inventory: { gel: 0, potion: 0, questRewardClaimed: false } });
  sim.update(1 / 60, { x: 0, y: 0 }, false, null);
  assert.ok(sim.slimes.has(lake.id), "o morador do lago foi povoado perto do herói");
  const fallen = new OfflineSimulation(SEED, { seed: SEED, x: lake.x, y: lake.y + 64, hp: 100, kills: 0, defeated: [lake.id],
    inventory: { gel: 0, potion: 0, questRewardClaimed: false } });
  fallen.update(1 / 60, { x: 0, y: 0 }, false, null);
  assert.equal(fallen.slimes.has(lake.id), false, "quem já foi derrotado não reaparece");
  const cx = Math.floor(ruin.tileX / CHUNK_TILES), cy = Math.floor(ruin.tileY / CHUNK_TILES);
  const resident = southSiteSpawns(cx, cy, SEED).find(m => m.id.includes(`:ruin:${ruin.id}:`))!;
  const near = new OfflineSimulation(SEED, { seed: SEED, x: resident.x, y: resident.y + 48, hp: 100, kills: 0, defeated: [],
    inventory: { gel: 0, potion: 0, questRewardClaimed: false } });
  near.update(1 / 60, { x: 0, y: 0 }, false, null);
  assert.ok(near.slimes.has(resident.id), "o morador da ruína foi povoado");
});
