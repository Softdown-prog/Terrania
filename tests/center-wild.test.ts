import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { CENTER_WILD_CHANCE, CENTER_WILD_MIN_TILES, centerSurfaceSpawns } from "../src/actors/centerSpawns.ts";
import { CENTER_WILD_KINDS, CREATURE_CATALOG } from "../src/monsters/catalog.ts";
import { getBiomeAt } from "../src/world/biomes.ts";
import { canWalkOnSeed } from "../src/world/collision.ts";
import { getWorldRegion } from "../src/world/regions.ts";
import { CHUNK_TILES, TILE_SIZE } from "../src/world/terrain.ts";
import { protectedSurfaceTile } from "../src/world/village.ts";
import { capitalSafe } from "../src/world/center/capital/index.ts";

/**
 * Lote 3 do bestiário do Centro (ADR 0089): o javali, o lobo cinzento e o cogumelo andante são os primeiros bichos regionais na superfície do Centro, mas só
 * longe da vila: quem acabou de nascer encontra slimes, e só topa com eles ao se afastar.
 */
const SEED = 842136;
const all: Array<{ cx: number; cy: number; mobs: RegionalMonster[] }> = [];
for (let cx = -90; cx <= 90; cx++) for (let cy = -90; cy <= 90; cy++) { const mobs = centerSurfaceSpawns(cx, cy, SEED); if (mobs.length) all.push({ cx, cy, mobs }); }
const flat = all.flatMap(item => item.mobs);

test("há encontros do Centro além da distância mínima e nenhum perto da vila", () => {
  assert.equal(CENTER_WILD_MIN_TILES, 240); assert.equal(CENTER_WILD_CHANCE, .2);
  assert.ok(all.length > 1500, "há encontros de sobra para conferir: " + all.length);
  const kinds = new Set(flat.map(m => m.kind));
  assert.deepEqual([...kinds].sort(), ["gray-wolf", "walking-mushroom", "wild-boar"], "os três tipos aparecem");
  for (const { cx, cy } of all) assert.ok(Math.hypot(cx * CHUNK_TILES + 8, cy * CHUNK_TILES + 8) >= CENTER_WILD_MIN_TILES, `bloco ${cx},${cy} perto demais da vila`);
  // a vizinhança da vila (240 tiles = 15 blocos) fica livre: quem chega encontra slimes primeiro
  for (let cx = -14; cx <= 14; cx++) for (let cy = -14; cy <= 14; cy++) if (Math.hypot(cx * 16 + 8, cy * 16 + 8) < CENTER_WILD_MIN_TILES) assert.deepEqual(centerSurfaceSpawns(cx, cy, SEED), [], `bloco ${cx},${cy}`);
});

test("cada encontro está no Centro, em chão que se pisa, fora das zonas protegidas e no bioma da espécie; a fração de blocos é a prometida", () => {
  for (const { cx, cy, mobs } of all) for (const mob of mobs) {
    const tx = Math.floor(mob.x / TILE_SIZE), ty = Math.floor(mob.y / TILE_SIZE);
    assert.equal(Math.floor(tx / CHUNK_TILES), cx); assert.equal(Math.floor(ty / CHUNK_TILES), cy, "dentro do próprio bloco");
    assert.equal(getWorldRegion(tx, ty), "center"); assert.equal(CREATURE_CATALOG[mob.kind].region, "center");
    assert.equal(protectedSurfaceTile(tx, ty), false); assert.equal(capitalSafe(tx, ty), false, "nunca dentro da capital");
    assert.equal(canWalkOnSeed(mob.x, mob.y, SEED), true, "em chão transitável");
    assert.ok(CREATURE_CATALOG[mob.kind].biomes.includes(getBiomeAt(tx, ty, SEED)), `${mob.kind} fora do bioma`);
    assert.ok((CENTER_WILD_KINDS as readonly string[]).includes(mob.kind));
  }
  // a taxa: de todos os blocos do Centro além da distância, perto de 20 % sorteiam um encontro e uma boa parte deles dá em lugar válido
  let candidates = 0;
  for (let cx = -90; cx <= 90; cx++) for (let cy = -90; cy <= 90; cy++) if (Math.hypot(cx * 16 + 8, cy * 16 + 8) >= CENTER_WILD_MIN_TILES && getWorldRegion(cx * 16 + 8, cy * 16 + 8) === "center") candidates++;
  assert.ok(all.length / candidates > .05 && all.length / candidates < CENTER_WILD_CHANCE, `fração ${(all.length / candidates).toFixed(3)} dos ${candidates} blocos`);
});

test("o lobo anda em matilha de dois ou três a poucos tiles uns dos outros; o javali e o cogumelo andam sós", () => {
  const sizes = { "wild-boar": new Set<number>(), "gray-wolf": new Set<number>(), "walking-mushroom": new Set<number>() };
  for (const { mobs } of all) {
    assert.equal(new Set(mobs.map(m => m.kind)).size, 1, "um tipo só por bloco");
    sizes[mobs[0]!.kind as keyof typeof sizes].add(mobs.length);
    if (mobs[0]!.kind !== "gray-wolf") continue;
    for (const [i, a] of mobs.entries()) for (const b of mobs.slice(i + 1)) {
      assert.ok(Math.abs(a.x - b.x) <= 6 * TILE_SIZE && Math.abs(a.y - b.y) <= 6 * TILE_SIZE, "matilha junta");
      assert.ok(Math.floor(a.x / TILE_SIZE) !== Math.floor(b.x / TILE_SIZE) || Math.floor(a.y / TILE_SIZE) !== Math.floor(b.y / TILE_SIZE), "cada lobo no seu tile");
    }
  }
  assert.deepEqual([...sizes["wild-boar"]], [1]); assert.deepEqual([...sizes["walking-mushroom"]], [1]);
  // a matilha é de dois ou três; um lobo sozinho só acontece na beira da mata, onde os vizinhos não são de mata (raro)
  const packs = all.filter(item => item.mobs[0]!.kind === "gray-wolf");
  const lone = packs.filter(item => item.mobs.length === 1).length;
  assert.ok(sizes["gray-wolf"].has(2) && sizes["gray-wolf"].has(3), "matilhas de dois e de três: " + [...sizes["gray-wolf"]]);
  assert.ok(lone / packs.length < .02, `lobos sozinhos: ${lone} de ${packs.length}`);
  // três lobos em cerca de 40 % das matilhas (o sorteio pede três em 40 %); nenhum lobo a mais de 3 tiles do primeiro, em cada eixo
  const three = packs.filter(item => item.mobs.length === 3).length / packs.length;
  assert.ok(three > .3 && three < .45, `fração de matilhas de três: ${three.toFixed(2)}`);
  for (const { mobs } of packs) for (const wolf of mobs) assert.ok(Math.abs(wolf.x - mobs[0]!.x) <= 3 * TILE_SIZE && Math.abs(wolf.y - mobs[0]!.y) <= 3 * TILE_SIZE, "no máximo 3 tiles do primeiro lobo");
  assert.ok([...sizes["gray-wolf"]].every(size => size >= 1 && size <= 3));
});

test("os ids são estáveis e únicos, e o mesmo bloco dá sempre os mesmos encontros; semente diferente, mundo diferente; entradas inválidas não geram nada", () => {
  const ids = flat.map(m => m.id);
  assert.equal(new Set(ids).size, ids.length, "ids únicos");
  for (const { cx, cy, mobs } of all) { const nums = mobs.map(mob => Number(mob.id.split(":").pop())); assert.deepEqual(nums, [...nums].sort((a, b) => a - b), "ids em ordem"); assert.equal(nums[0], 0, "o primeiro é o 0"); for (const mob of mobs) assert.ok(mob.id.startsWith(`center-wild:${SEED}:${cx}:${cy}:`), mob.id); }
  const view = (cx: number, cy: number, seed: number) => centerSurfaceSpawns(cx, cy, seed).map(m => [m.id, m.kind, m.x, m.y].join("|")).join(";");
  for (const { cx, cy } of all.slice(0, 200)) assert.equal(view(cx, cy, SEED), view(cx, cy, SEED));
  const other = all.slice(0, 400).filter(({ cx, cy }) => view(cx, cy, SEED) !== view(cx, cy, 7)).length;
  assert.ok(other > 300, "com outra semente o mundo muda: " + other);
  for (const bad of [[Number.NaN, 0, SEED], [0, Number.POSITIVE_INFINITY, SEED], [1.5, 2, SEED], [20, 20, Number.NaN]] as const) assert.deepEqual(centerSurfaceSpawns(...bad), []);
});

test("o jogo usa: longe da vila a simulação povoa o entorno com eles; perto da vila não", () => {
  const far = all.find(({ cx, cy }) => Math.hypot(cx * 16, cy * 16) > 400)!;
  const sim = new OfflineSimulation(SEED);
  sim.player.x = (far.cx * CHUNK_TILES + 8) * TILE_SIZE; sim.player.y = (far.cy * CHUNK_TILES + 8) * TILE_SIZE;
  sim.update(0.016, { x: 0, y: 0 }, false);
  assert.ok(far.mobs.every(m => sim.slimes.has(m.id)), "a simulação criou o encontro do bloco do herói");
  const wild = [...sim.slimes.values()].filter(m => (CENTER_WILD_KINDS as readonly string[]).includes(m.kind));
  assert.ok(wild.length >= far.mobs.length);
  const home = new OfflineSimulation(SEED);
  home.update(0.016, { x: 0, y: 0 }, false);
  assert.equal([...home.slimes.values()].filter(m => (CENTER_WILD_KINDS as readonly string[]).includes(m.kind)).length, 0, "na vila só há slimes");
  assert.match(readFileSync("src/engine/OfflineSimulation.ts", "utf8"), /\.\.\.southSiteSpawns\(cx,cy,this\.seed\),\.\.\.centerSurfaceSpawns\(cx,cy,this\.seed\)\]\) \{/);
});

test("só o Centro tem esses bichos: nas outras regiões, mesmo longe, o gerador não cria nada (e perto da fronteira só nasce no lado do Centro)", () => {
  let center = 0, elsewhere = 0, found = 0;
  for (let cx = -330; cx <= 330; cx += 3) for (let cy = -330; cy <= 330; cy += 3) {
    const mobs = centerSurfaceSpawns(cx, cy, SEED), region = getWorldRegion(cx * 16 + 8, cy * 16 + 8);
    if (region === "center") center++; else elsewhere++;
    for (const mob of mobs) { found++; assert.equal(getWorldRegion(Math.floor(mob.x / TILE_SIZE), Math.floor(mob.y / TILE_SIZE)), "center", "bicho do Centro fora do Centro"); }
    if (Math.abs(cx) > 300 || Math.abs(cy) > 300) assert.deepEqual(mobs, [], `bloco ${cx},${cy}, bem longe do Centro`);
  }
  assert.ok(center > 3000 && elsewhere > 3000 && found > 300, `varreu o Centro (${center}) e as outras regiões (${elsewhere}); achou ${found}`);
});
