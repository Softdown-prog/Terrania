import test from "node:test";
import assert from "node:assert/strict";
import { NPCS, NPC_TALK_RANGE, nearestNpc, npcDialogue } from "../src/world/npcs.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";

const aela = NPCS[0];

test("guardiã fica acessível no começo e longe não permite diálogo", () => {
  assert.equal(nearestNpc(16, 16)?.id, "aela");
  assert.equal(nearestNpc(aela.x + NPC_TALK_RANGE + 0.01, aela.y), null);
  assert.equal(nearestNpc(Number.NaN, 0), null);
  assert.equal(nearestNpc(Infinity, 0), null);
  assert.equal(canMoveOnSeed(aela.x, aela.y, 842136), true);
});
test("conversa orienta a missão e reconhece o progresso", () => {
  assert.match(npcDialogue(aela, 0).join(" "), /cinco/i);
  assert.match(npcDialogue(aela, 2).join(" "), /2 de 5/);
  assert.match(npcDialogue(aela, 5).join(" "), /conseguiu/i);
  assert.match(npcDialogue(aela, 999).join(" "), /conseguiu/i);
  assert.match(npcDialogue(aela, Number.NaN).join(" "), /cinco/i);
});
