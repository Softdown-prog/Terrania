import test from "node:test";
import assert from "node:assert/strict";
import { getTile } from "../src/world/terrain.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { NPCS, nearestNpc, npcDialogue } from "../src/world/npcs.ts";
import { BUILDINGS, SIGNS } from "../src/world/village.ts";
import { PROTOCOL_VERSION } from "../src/shared/protocol.ts";

test("praça sem água, rochas e árvores em diferentes seeds", () => {
  for (const seed of [0, 42, 842136, 4294967295])
    for (let tx = 6; tx <= 21; tx++) for (let ty = -7; ty <= 9; ty++) {
      const tile = getTile(tx, ty, seed);
      assert.equal(tile.tree, false);
      assert.equal(tile.rock, false);
      assert.notEqual(tile.ground, "water");
    }
});
test("colisão da fachada mantém porta acessível", () => {
  for (const b of BUILDINGS) {
    assert.equal(canMoveOnSeed(b.x, b.y - 20, 842136), false);
    assert.equal(canMoveOnSeed(b.x, b.y + 29, 842136), true);
    assert.equal(nearestNpc(b.x, b.y + 29)?.id, b.id);
  }
  assert.equal(PROTOCOL_VERSION, 3);
});
test("moradores e placas respondem perto sem recompensas novas", () => {
  assert.equal(SIGNS.length, 2);
  for (const id of ["aela", "mira", "toren", "lina"]) {
    const npc = NPCS.find(n => n.id === id);
    assert.ok(npc);
    assert.equal(canMoveOnSeed(npc.x, npc.y, 842136), true);
    assert.ok(npcDialogue(npc, 0).length > 1);
    assert.ok(npcDialogue(npc, 5).length > 1);
  }
  assert.equal(nearestNpc(SIGNS[0].x, SIGNS[0].y)?.id, SIGNS[0].id);
});
