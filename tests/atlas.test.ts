import test from "node:test";
import assert from "node:assert/strict";
import { canMoveOnSeed, WORLD_EDGE_PIXELS } from "../src/world/collision.ts";
import { getTile } from "../src/world/terrain.ts";
import {
  WORLD_HALF_TILES, WORLD_SPAN_TILES, atlasFrame, sectorCenter, sectorIndex,
  surveySectors, GROUND_NAMES,
} from "../src/world/atlas.ts";

test("atlas exibe o limite de movimentação existente sem fabricar o fim do terreno", () => {
  assert.equal(WORLD_EDGE_PIXELS, 1_000_000);
  assert.equal(WORLD_HALF_TILES, 31_250);
  assert.equal(WORLD_SPAN_TILES, 62_500);
  assert.equal(atlasFrame("world", 100, -100).spanTiles, 62_500);
  assert.equal(atlasFrame("nearby", 100, -100).spanTiles, 128);
  assert.equal(canMoveOnSeed(WORLD_EDGE_PIXELS + 1, 16, 842136), false);
  assert.equal(canMoveOnSeed(16, -WORLD_EDGE_PIXELS - 1, 842136), false);
});

test("atlas orienta corretamente os nove setores e as coordenadas negativas", () => {
  assert.equal(sectorIndex(-31_249, -31_249), 0);
  assert.equal(sectorIndex(0, 0), 4);
  assert.equal(sectorIndex(31_249, 31_249), 8);
  assert.equal(sectorIndex(99_999, 0), 5);
  assert.equal(sectorIndex(0, Number.NaN), 4);
  for (let id = 0; id < 9; id++) {
    const center = sectorCenter(id);
    assert.equal(sectorIndex(center.x, center.y), id);
    assert.equal(atlasFrame("sector", 0, 0, id).centerX, center.x);
    assert.equal(atlasFrame("sector", 0, 0, id).centerY, center.y);
  }
});

test("tipos de terreno dos setores são amostrados da mesma seed do jogo", () => {
  const sectors = surveySectors(842136);
  assert.equal(sectors.length, 9);
  assert.deepEqual(sectors, surveySectors(842136));
  assert.deepEqual(sectors.map(s => s.name), [
    "Noroeste", "Norte", "Nordeste", "Oeste", "Centro", "Leste",
    "Sudoeste", "Sul", "Sudeste",
  ]);
  for (const sector of sectors) {
    assert.equal(typeof GROUND_NAMES[sector.dominant], "string");
    const sample = getTile(Math.floor(sector.centerX), Math.floor(sector.centerY), 842136);
    assert.ok(["grass", "forest", "path", "sand", "water"].includes(sample.ground));
  }
});
