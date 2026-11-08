import test from "node:test";
import assert from "node:assert/strict";
import { getWorldRegion, getRegionWeights } from "../src/world/regions.ts";
import { getBiomeAt, BIOME_NAMES } from "../src/world/biomes.ts";
import { getTerrainProfile } from "../src/world/terrainProfiles.ts";
import { getRegionDifficulty } from "../src/world/regionDifficulty.ts";
import { getTile, isWalkable } from "../src/world/terrain.ts";
import { surveySectors } from "../src/world/atlas.ts";

test("macro-regiões cardeais e centro", () => {
  for (const [x, y, expected] of [
    [0, 0, "center"], [0, -26000, "north"], [0, 26000, "south"],
    [26000, 0, "east"], [-26000, 0, "west"],
  ] as const) {
    assert.equal(getWorldRegion(x, y), expected);
    assert.equal(getTerrainProfile(x, y, 42).region, expected);
  }
});
test("influências somam 1 e mudam gradualmente em fronteiras", () => {
  for (let y = -18000; y < 18000; y += 91) {
    const a = getRegionWeights(9000, y);
    const b = getRegionWeights(9001, y);
    assert.ok(Math.abs(Object.values(a).reduce((s, v) => s + v, 0) - 1) < 1e-9);
    for (const key of Object.keys(a) as Array<keyof typeof a>)
      assert.ok(Math.abs(a[key] - b[key]) < 0.02, key);
  }
});
test("biomas, mapa e dificuldade usam a mesma seed e posição", () => {
  const seeds = [42, 842136, 987654321];
  for (const seed of seeds) {
    for (const [x, y] of [[0, 0], [0, -22000], [0, 22000], [25000, 0], [-25000, 0]]) {
      const tile = getTile(x, y, seed);
      assert.deepEqual(tile, getTile(x, y, seed));
      assert.equal(tile.biome, tile.ground === "path" ? "trail" :
        tile.ground === "water" && getTerrainProfile(x, y, seed).temperature < 0.28 ?
          "frozen-lake" : tile.ground !== "water" && getBiomeAt(x, y, seed) === "open-sea" ?
          "island" : getBiomeAt(x, y, seed));
      assert.ok(BIOME_NAMES[tile.biome]);
      assert.ok(getRegionDifficulty(x, y).tier >= 1);
    }
    assert.equal(surveySectors(seed).length, 9);
  }
});
test("as rotas cardeais permanecem transitáveis em regiões extremas", () => {
  for (const seed of [42, 842136]) {
    for (let n = -28000; n <= 28000; n += 800)
      assert.equal(isWalkable(0, n, seed), true, "eixo norte-sul: " + n);
    for (let n = -28000; n <= 28000; n += 800)
      assert.equal(isWalkable(n, 0, seed), true, "eixo leste-oeste: " + n);
  }
});
test("ameaça regional acompanha os riscos da geografia", () => {
  assert.equal(getRegionDifficulty(0, 0).tier, 1);
  assert.equal(getRegionDifficulty(24000, 0).tier, 2);
  assert.equal(getRegionDifficulty(0, -24000).tier, 3);
  assert.equal(getRegionDifficulty(0, 24000).tier, 4);
  assert.equal(getRegionDifficulty(-24000, 0).tier, 5);
});
