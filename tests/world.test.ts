import test from "node:test";
import assert from "node:assert/strict";
import { hash2, seedFromText } from "../src/world/random.ts";
import {
  chunkOf,
  getTile,
  isWalkable,
  CHUNK_PIXELS,
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
