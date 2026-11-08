import test from "node:test";
import assert from "node:assert/strict";
import { waterShoreMask } from "../src/render/terrain.ts";
import { CHUNK_TILES, getTile } from "../src/world/terrain.ts";

test("shoreline mask follows global neighbors across positive and negative chunks", () => {
  const seed = 842136;
  let shores = 0;
  let chunkEdges = 0;
  for (let ty = -40; ty <= 40; ty++) {
    for (let tx = -40; tx <= 40; tx++) {
      const expected = getTile(tx, ty, seed).ground !== "water"
        ? 0
        : (getTile(tx, ty - 1, seed).ground !== "water" ? 1 : 0)
          | (getTile(tx + 1, ty, seed).ground !== "water" ? 2 : 0)
          | (getTile(tx, ty + 1, seed).ground !== "water" ? 4 : 0)
          | (getTile(tx - 1, ty, seed).ground !== "water" ? 8 : 0);
      const actual = waterShoreMask(tx, ty, seed);
      assert.equal(actual, expected, `shore (${tx}, ${ty})`);
      assert.equal(waterShoreMask(tx, ty, seed), actual, "same seed is deterministic");
      if (actual) {
        shores++;
        if (tx % CHUNK_TILES === 0 || ty % CHUNK_TILES === 0 ||
            tx % CHUNK_TILES === CHUNK_TILES - 1 ||
            ty % CHUNK_TILES === CHUNK_TILES - 1) chunkEdges++;
      }
    }
  }
  assert.ok(shores > 0, "sample should include a shoreline");
  assert.ok(chunkEdges > 0, "sample should include a chunk boundary shoreline");
});

test("non-water tiles never receive a water shoreline", () => {
  for (const [tx, ty] of [[0, 0], [2, 2], [-3, -3]] as const) {
    assert.notEqual(getTile(tx, ty, 842136).ground, "water");
    assert.equal(waterShoreMask(tx, ty, 842136), 0);
  }
});
