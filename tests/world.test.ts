import test from "node:test";
import { waterShoreMask } from "../src/render/terrain.ts";
import assert from "node:assert/strict";
import { hash2, seedFromText } from "../src/world/random.ts";
import {
  chunkOf,
  getTile,
  isWalkable,
  CHUNK_PIXELS,
  CHUNK_TILES,
} from "../src/world/terrain.ts";
test("mesma seed e coordenadas geram mesmo terreno", () => {
  assert.deepEqual(getTile(-33, 45, 42), getTile(-33, 45, 42));
  assert.equal(hash2(2, 3, 7), hash2(2, 3, 7));
  assert.notEqual(seedFromText("a"), seedFromText("b"));
});
test("coordenadas negativas pertencem ao chunk correto", () => {
  assert.equal(chunkOf(-1), -1);
  assert.equal(chunkOf(-CHUNK_PIXELS), -1);
  assert.equal(chunkOf(-CHUNK_PIXELS - 1), -2);
  assert.equal(chunkOf(CHUNK_PIXELS), 1);
});
test("área inicial é transitável", () => {
  for (let y = -3; y <= 3; y++)
    for (let x = -3; x <= 3; x++) assert.equal(isWalkable(x, y, 842136), true);
});

test("landmark pillars block movement but the arch opening stays traversable", async () => {
  const { canMoveOnSeed } = await import("../src/world/collision.ts");
  assert.equal(canMoveOnSeed(-202, -96, 842136), false);
  assert.equal(canMoveOnSeed(-150, -96, 842136), false);
  assert.equal(canMoveOnSeed(-176, -96, 842136), true);
  assert.equal(canMoveOnSeed(176, -112, 842136), false);
});

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
