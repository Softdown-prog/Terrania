import assert from "node:assert/strict";
import test from "node:test";
import { getWorldRegion } from "../src/world/regions.ts";
import { LANDMARK_CELL_TILES, getRegionalLandmarkForCell } from "../src/world/regionalLandmarks.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { isWalkable } from "../src/world/terrain.ts";

test("marcos regionais determinísticos existem no norte, sul, leste e oeste", () => {
  const seed = 842136;
  for (const [region, baseX, baseY] of [
    ["north", 0, -70], ["south", 0, 70],
    ["east", 70, 0], ["west", -70, 0],
  ] as const) {
    let found = false;
    for (let offset = -12; offset <= 12 && !found; offset++) {
      const cellX = baseX + (baseX !== 0 ? 0 : offset);
      const cellY = baseY + (baseY === 0 ? offset : 0);
      const spot = getRegionalLandmarkForCell(cellX, cellY, seed);
      if (!spot) continue;
      found = true;
      assert.equal(spot.region, region);
      assert.equal(getWorldRegion(spot.tileX, spot.tileY), region);
      assert.deepEqual(spot, getRegionalLandmarkForCell(cellX, cellY, seed));
      assert.equal(isWalkable(spot.tileX, spot.tileY, seed), true);
      assert.equal(canMoveOnSeed(spot.x, spot.y, seed), false);
      assert.ok(spot.name.length > 0);
      assert.equal(Math.floor(spot.tileX / LANDMARK_CELL_TILES), cellX);
      assert.equal(Math.floor(spot.tileY / LANDMARK_CELL_TILES), cellY);
    }
    assert.ok(found, "nenhum marco acessível na região " + region);
  }
});

test("célula inicial nunca recebe monumentos temáticos; seed altera distribuição", () => {
  assert.equal(getRegionalLandmarkForCell(0, 0, 842136), null);
  const samples = Array.from({length: 20}, (_, i) => getRegionalLandmarkForCell(i + 45, 0, 842136)?.id ?? null);
  const alternate = Array.from({length: 20}, (_, i) => getRegionalLandmarkForCell(i + 45, 0, 1245)?.id ?? null);
  // Candidate IDs alone depend on cell, so compare actual placement coordinates.
  const xA = Array.from({length: 20}, (_, i) => getRegionalLandmarkForCell(i + 45, 0, 842136)?.tileX ?? null);
  const xB = Array.from({length: 20}, (_, i) => getRegionalLandmarkForCell(i + 45, 0, 1245)?.tileX ?? null);
  assert.equal(samples.length, alternate.length);
  assert.notDeepEqual(xA, xB);
});
