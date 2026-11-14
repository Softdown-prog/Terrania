import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAP_EDGE_TILES, MAP_VERSION, ANTES, COAST_FULL_TILES, COAST_START_TILES, MARSH_START_TILES, REGION_BLEND_END_TILES, REGION_BLEND_START_TILES,
  REGION_NOISE_SCALE_TILES, REGION_NOISE_SHIFT_TILES, SOUTH_CITY_DISTANCE_TILES } from "../src/world/mapSize.ts";
import { WORLD_HALF_TILES, WORLD_SPAN_TILES } from "../src/world/atlas.ts";
import { canMoveOnSeed, WORLD_EDGE_PIXELS } from "../src/world/collision.ts";
import { getRegionWeights, getWorldRegion, type RegionWeights } from "../src/world/regions.ts";
import { valueNoise } from "../src/world/random.ts";
import { CAVE_CELL_TILES, caveEntrancesInArea, caveThemeAt } from "../src/world/caves.ts";
import { getTerrainProfile } from "../src/world/terrainProfiles.ts";
import { SOUTH_CITY, southCityGround } from "../src/world/southCity.ts";
import { CAPITAL } from "../src/world/center/capital/index.ts";
import { CHUNK_TILES, TILE_SIZE, getTile } from "../src/world/terrain.ts";
import { RUIN_AREA, TOWER_AREA, insideSiteFootprint } from "../src/world/siteFootprints.ts";
import { RUIN_CELL_TILES, getSouthRuinForCell } from "../src/world/southRuins.ts";
import { TOWER_CELL_TILES, getSouthTowerForCell } from "../src/world/towers/placement.ts";

/**
 * O mapa pela metade em cada lado (ADR 0059): parede invisível, regiões, costa, pântano e o Poço Negro encolhem juntos, e a
 * Vila e a capital ficam. Aqui estão os números, a prova de que as regiões são exatamente as de antes na metade da distância,
 * e o desvio das cavernas das áreas de ruínas e torres.
 */
const SEED = 842136;

/** As regiões do mapa antigo, com os números de antes (3.800, 9.700, ruído de 4.700 por 950), escritas aqui só para comparar. */
function oldWeights(tileX: number, tileY: number): RegionWeights {
  const x = tileX + (valueNoise(tileX / 4700, tileY / 4700, 119) - 0.5) * 950, y = tileY + (valueNoise(tileX / 4700, tileY / 4700, 251) - 0.5) * 950;
  const t = Math.max(0, Math.min(1, (Math.max(Math.abs(x), Math.abs(y)) - 3800) / (9700 - 3800))), wilderness = t * t * (3 - 2 * t), total = Math.abs(x) + Math.abs(y) || 1;
  return { center: 1 - wilderness, north: wilderness * Math.max(0, -y) / total, south: wilderness * Math.max(0, y) / total, east: wilderness * Math.max(0, x) / total, west: wilderness * Math.max(0, -x) / total };
}

test("os números do mapa: cada um é a metade do de antes, e a parede da colisão e a do atlas são a mesma", () => {
  assert.equal(MAP_EDGE_TILES, 15_625); assert.equal(ANTES.edgeTiles, 31_250); assert.equal(MAP_EDGE_TILES * 2, ANTES.edgeTiles);
  assert.equal(REGION_BLEND_START_TILES * 2, 3_800); assert.equal(REGION_BLEND_END_TILES * 2, 9_700);
  assert.equal(REGION_NOISE_SCALE_TILES * 2, 4_700); assert.equal(REGION_NOISE_SHIFT_TILES * 2, 950);
  assert.equal(COAST_START_TILES * 2, 7_100); assert.equal(COAST_FULL_TILES * 2, 23_000); assert.equal(MARSH_START_TILES * 2, 9_000);
  assert.equal(WORLD_EDGE_PIXELS, MAP_EDGE_TILES * TILE_SIZE); assert.equal(WORLD_EDGE_PIXELS, 500_000);
  assert.equal(WORLD_HALF_TILES, MAP_EDGE_TILES); assert.equal(WORLD_SPAN_TILES, MAP_EDGE_TILES * 2);
  assert.equal(MAP_VERSION, 2);
  // a ordem faz sentido: a mistura vem antes da região pura, que vem antes da parede; a costa e o pântano cabem dentro do mapa
  assert.ok(REGION_BLEND_START_TILES < REGION_BLEND_END_TILES && REGION_BLEND_END_TILES < MAP_EDGE_TILES);
  assert.ok(COAST_START_TILES < COAST_FULL_TILES && COAST_FULL_TILES < MAP_EDGE_TILES); assert.ok(MARSH_START_TILES < MAP_EDGE_TILES);
});

test("a parede invisível: nada se anda além dela, em nenhum dos quatro lados, e o Poço Negro e a capital ficam longe dela", () => {
  for (const [x, y] of [[WORLD_EDGE_PIXELS + 1, 16], [-WORLD_EDGE_PIXELS - 1, 16], [16, WORLD_EDGE_PIXELS + 1], [16, -WORLD_EDGE_PIXELS - 1]] as const)
    assert.equal(canMoveOnSeed(x, y, SEED), false, `${x},${y}`);
  const southEnd = (SOUTH_CITY.centerY + SOUTH_CITY.maxY) * TILE_SIZE;
  assert.ok(southEnd < WORLD_EDGE_PIXELS - 100 * TILE_SIZE, "a muralha sul do Poço Negro fica a mais de 100 tiles da parede");
  assert.ok(Math.abs(CAPITAL.centerY) + 100 < MAP_EDGE_TILES);
});

test("as regiões são exatamente as de antes na metade da distância: o ponto (x, y) de agora tem os pesos do ponto (2x, 2y) de antes", () => {
  let compared = 0, mixed = 0;
  for (let i = 0; i < 4000; i++) {
    const x = Math.round((valueNoise(i * 0.37, 3.1, 11) - 0.5) * 2 * MAP_EDGE_TILES), y = Math.round((valueNoise(5.7, i * 0.41, 13) - 0.5) * 2 * MAP_EDGE_TILES);
    const now = getRegionWeights(x, y), before = oldWeights(2 * x, 2 * y);
    for (const key of ["center", "north", "south", "east", "west"] as const) assert.ok(Math.abs(now[key] - before[key]) < 1e-9, `${key} em ${x},${y}: ${now[key]} contra ${before[key]}`);
    compared++; if (now.center > 0.05 && now.center < 0.95) mixed++;
  }
  assert.equal(compared, 4000); assert.ok(mixed > 100, `pontos na faixa de mistura: ${mixed}`);
  // e nos quatro eixos, a região pura começa a 4.850 tiles e a de dentro vale até uns 1.900
  for (const [x, y, region] of [[0, 0, "center"], [0, -1000, "center"], [1200, 800, "center"], [0, -5600, "north"], [0, 5600, "south"], [5600, 0, "east"], [-5600, 0, "west"], [0, 15_000, "south"], [-15_000, 0, "west"]] as const) {
    assert.equal(getWorldRegion(x, y), region, `${x},${y}`);
  }
  for (const [x, y] of [[0, -5600], [0, 5600], [5600, 0], [-5600, 0], [0, 15_000]] as const) assert.ok(Math.max(...Object.values(getRegionWeights(x, y))) > 0.97, `região pura em ${x},${y}`);
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) assert.deepEqual(getRegionWeights(bad, 0), { center: 1, north: 0, south: 0, east: 0, west: 0 });
});

test("a Vila, a capital e a cidade do Sul ficam nas regiões certas, e o caminho entre elas existe", () => {
  for (const [x, y] of [[0, 0], [CAPITAL.centerX, CAPITAL.centerY], [CAPITAL.centerX + CAPITAL.maxX, CAPITAL.centerY + CAPITAL.minY - 40], [CAPITAL.centerX, CAPITAL.centerY + CAPITAL.maxY + 40]] as const)
    assert.equal(getRegionWeights(x, y).center, 1, `${x},${y} é só Terras da Travessia`);
  const south = getRegionWeights(SOUTH_CITY.centerX, SOUTH_CITY.centerY);
  assert.ok(south.south > 0.95 && getWorldRegion(SOUTH_CITY.centerX, SOUTH_CITY.centerY) === "south", "o Poço Negro está no Sul puro: " + south.south);
  assert.equal(SOUTH_CITY.centerY, SOUTH_CITY_DISTANCE_TILES); assert.ok(SOUTH_CITY_DISTANCE_TILES > REGION_BLEND_END_TILES);
  // a estrada reta (x perto de 0) vai da Vila ao portão norte do Poço Negro: caminho em todo o trecho e no portão
  for (let ty = 100; ty < SOUTH_CITY.centerY - 100; ty += 50) assert.equal(getTile(0, ty, SEED).ground, "path", `estrada em 0,${ty}`);
  assert.equal(southCityGround(0, SOUTH_CITY.centerY + SOUTH_CITY.minY), "path", "o portão norte é caminho");
});

test("a cidade do Sul fica na mesma grade de chunks de antes: 484 chunks mais perto, no mesmo lugar dentro do chunk", () => {
  assert.equal(SOUTH_CITY.centerY % CHUNK_TILES, ANTES.southCityDistanceTiles % CHUNK_TILES);
  assert.equal((ANTES.southCityDistanceTiles - SOUTH_CITY.centerY) % CHUNK_TILES, 0);
  assert.equal((ANTES.southCityDistanceTiles - SOUTH_CITY.centerY) / CHUNK_TILES, 484);
  assert.equal(SOUTH_CITY.centerY, 7_756); assert.equal(ANTES.southCityDistanceTiles, 15_500);
  assert.ok(Math.abs(SOUTH_CITY.centerY - ANTES.southCityDistanceTiles / 2) <= 6, "é a metade, ajustada em até 6 tiles");
});

test("a costa do Leste e o pântano do sudeste acompanham o mapa: começam na metade da distância de antes", () => {
  // a costa média sobe da Travessia ao mar aberto, medida em 20 pontos ao longo da linha (pelo ruído, um só ponto engana)
  const avgCoast = (x: number): number => { let sum = 0; for (let i = 0; i < 20; i++) sum += getTerrainProfile(x, -300 + i * 30, SEED).coast; return sum / 20; };
  assert.ok(avgCoast(COAST_START_TILES - 1200) < 0.06, "perto da Travessia quase não há costa: " + avgCoast(COAST_START_TILES - 1200));
  assert.ok(avgCoast(6_000) > avgCoast(COAST_START_TILES - 1200), "a costa cresce"); assert.ok(avgCoast(9_000) > avgCoast(6_000));
  assert.ok(avgCoast(COAST_FULL_TILES + 200) > 0.8, "depois do fim ela é cheia: " + avgCoast(COAST_FULL_TILES + 200));
  assert.ok(avgCoast(MAP_EDGE_TILES - 500) > 0.8, "e segue cheia até a parede");
  assert.equal(caveThemeAt(MARSH_START_TILES + 1, MARSH_START_TILES + 1), "marsh");
  assert.notEqual(caveThemeAt(MARSH_START_TILES - 1, MARSH_START_TILES - 1), "marsh");
  assert.equal(caveThemeAt(MARSH_START_TILES + 1, MARSH_START_TILES * 3), "desert", "mais perto do Sul que do Leste: sem pântano (a razão x/y vale 0,33)");
  assert.equal(caveThemeAt(MARSH_START_TILES * 3, MARSH_START_TILES + 1), "coastal", "mais perto do Leste: sem pântano (a razão x/y vale 3)");
});

test("as cavernas desviam das áreas de ruínas e de torres: a área é exata nas quatro bordas e nenhuma entrada cai dentro", () => {
  assert.deepEqual(RUIN_AREA, { side: 5, up: 3, down: 3 }); assert.deepEqual(TOWER_AREA, { side: 6, up: 5, down: 5 });
  const ruins: Array<{ tileX: number; tileY: number }> = [], towers: Array<{ tileX: number; tileY: number }> = [];
  for (let cy = 20; cy < 90; cy++) for (let cx = -12; cx < 12; cx++) { const r = getSouthRuinForCell(cx, cy, SEED); if (r) ruins.push(r); }
  for (let cy = 5; cy < 40; cy++) for (let cx = -8; cx < 8; cx++) { const t = getSouthTowerForCell(cx, cy, SEED); if (t) towers.push(t); }
  assert.ok(ruins.length >= 15 && towers.length >= 8, `amostra: ${ruins.length} ruínas e ${towers.length} torres`);
  for (const [sites, area] of [[ruins, RUIN_AREA], [towers, TOWER_AREA]] as const) for (const s of sites.slice(0, 40)) {
    const { tileX: x, tileY: y } = s;
    for (const [dx, dy, inside] of [[0, 0, true], [area.side, 0, true], [-area.side, 0, true], [0, -area.up, true], [0, area.down, true], [area.side + 1, 0, false], [-area.side - 1, 0, false], [0, -area.up - 1, false], [0, area.down + 1, false]] as const) {
      // um vizinho de outra ruína ou torre pode estar mais perto: só confere o "fora" quando nenhuma outra área cobre o ponto
      const covered = insideSiteFootprint(x + dx, y + dy, SEED);
      if (inside) assert.equal(covered, true, `${dx},${dy} deveria estar na área`); else if (!covered) assert.equal(covered, false);
    }
    const caves = caveEntrancesInArea(x - area.side, y - area.up, x + area.side, y + area.down, SEED);
    assert.deepEqual(caves, [], "nenhuma entrada de caverna dentro da área");
  }
  assert.equal(insideSiteFootprint(0, 0, SEED), false, "na vila"); assert.equal(insideSiteFootprint(Number.NaN, 0, SEED), false); assert.equal(insideSiteFootprint(1.5, 0, SEED), false);
  // e as cavernas continuam existindo ao redor: o desvio tira só as que cairiam em cima
  let entrances = 0;
  for (let cy = 20; cy < 60; cy++) for (let cx = -12; cx < 12; cx++) if (caveEntrancesInArea(cx * CAVE_CELL_TILES, cy * CAVE_CELL_TILES, cx * CAVE_CELL_TILES + CAVE_CELL_TILES - 1, cy * CAVE_CELL_TILES + CAVE_CELL_TILES - 1, SEED).length) entrances++;
  assert.ok(entrances > 60, "cavernas na amostra: " + entrances);
  assert.equal(RUIN_CELL_TILES, 160); assert.equal(TOWER_CELL_TILES, 224);
  assert.match(readFileSync("src/world/caves.ts", "utf8"), /if \(insideSiteFootprint\(tx, ty, seed\)\) return false;/);
});

test("nenhum número do tamanho do mapa mora fora de mapSize.ts: o resto do código importa de lá", () => {
  const uses: Array<[string, RegExp]> = [
    ["src/world/collision.ts", /WORLD_EDGE_PIXELS = MAP_EDGE_TILES \* TILE_SIZE/], ["src/world/regions.ts", /REGION_BLEND_START_TILES, REGION_BLEND_END_TILES/],
    ["src/world/terrainProfiles.ts", /smooth\(COAST_START_TILES, COAST_FULL_TILES, x\)/], ["src/world/caves.ts", /tx > MARSH_START_TILES && ty > MARSH_START_TILES/],
    ["src/world/southCity.ts", /centerY: SOUTH_CITY_DISTANCE_TILES/], ["src/engine/character/loot.ts", /Math\.abs\(drop\.x\) > WORLD_EDGE_PIXELS/],
  ];
  for (const [file, pattern] of uses) assert.match(readFileSync(file, "utf8"), pattern, file);
  for (const file of ["src/world/regions.ts", "src/world/terrainProfiles.ts", "src/world/caves.ts", "src/world/collision.ts", "src/engine/character/loot.ts"])
    for (const old of ["3800", "9700", "4700", "7100", "23000", "9000", "1_000_000"]) assert.equal(new RegExp(`\\b${old}\\b`).test(readFileSync(file, "utf8")), false, `${file} ainda tem ${old}`);
});
