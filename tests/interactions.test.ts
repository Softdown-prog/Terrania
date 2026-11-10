import test from "node:test";
import assert from "node:assert/strict";
import { mountQuestAction, npcOffer, questStepId, surfaceNearbyAction } from "../src/game/interactions.ts";
import { MOUNT_INTERACT_DISTANCE, STABLE_MASTER, WILD_HOOFPRINTS, WILD_WARHORSE } from "../src/world/mountLocations.ts";
import { FORGE_SWORD_PRICE } from "../src/engine/character/Weapons.ts";
import { POTION_GEL_PRICE } from "../src/engine/character/Inventory.ts";

const far = { x: 5000, y: 5000 };

test("interação: cada passo da missão da montaria só age no seu próprio ponto", () => {
  assert.equal(mountQuestAction(WILD_HOOFPRINTS.x, WILD_HOOFPRINTS.y, "tracks"), "inspect-tracks");
  assert.equal(mountQuestAction(WILD_WARHORSE.x, WILD_WARHORSE.y, "calm"), "tame");
  assert.equal(mountQuestAction(STABLE_MASTER.x, STABLE_MASTER.y, "return"), "return-warhorse");
  // passo errado no ponto certo, e ponto errado no passo certo: nada acontece
  assert.equal(mountQuestAction(WILD_HOOFPRINTS.x, WILD_HOOFPRINTS.y, "calm"), null);
  assert.equal(mountQuestAction(WILD_WARHORSE.x, WILD_WARHORSE.y, "tracks"), null);
  assert.equal(mountQuestAction(far.x, far.y, "tracks"), null);
  assert.equal(mountQuestAction(WILD_HOOFPRINTS.x, WILD_HOOFPRINTS.y, null), null, "sem missão ativa");
});

test("interação: o alcance é exatamente MOUNT_INTERACT_DISTANCE", () => {
  const edge = (d: number) => mountQuestAction(WILD_HOOFPRINTS.x + d, WILD_HOOFPRINTS.y, "tracks");
  assert.equal(edge(MOUNT_INTERACT_DISTANCE), "inspect-tracks");
  assert.equal(edge(MOUNT_INTERACT_DISTANCE + 0.5), null);
});

test("interação: o passo da missão vem do progresso e some sem missão", () => {
  assert.equal(questStepId(null), null);
  assert.equal(questStepId({ id: "warhorse", step: 0, count: 0, killsAtStart: 0, gift: "Maçã Silvestre Doce" }), "tracks");
  assert.equal(questStepId({ id: "warhorse", step: 99, count: 0, killsAtStart: 0, gift: "x" }), null, "passo fora do roteiro");
});

test("interação: o HUD prioriza missão, depois caverna, depois o NPC; devolver o cavalo cai no NPC", () => {
  const at = (p: { x: number; y: number }, stepId: string | null, caveEntrance: boolean, npc: { kind?: "character" | "sign" | "door" } | null) =>
    surfaceNearbyAction({ x: p.x, y: p.y, stepId, caveEntrance, npc });
  assert.equal(at(WILD_HOOFPRINTS, "tracks", true, { kind: "character" }), "tracks", "missão vence caverna e NPC");
  assert.equal(at(WILD_WARHORSE, "calm", true, null), "tame");
  assert.equal(at(far, null, true, { kind: "character" }), "enter", "caverna vence NPC");
  assert.equal(at(far, null, false, { kind: "character" }), "talk");
  assert.equal(at(far, null, false, {}), "talk", "NPC sem tipo é personagem");
  assert.equal(at(far, null, false, { kind: "sign" }), "read");
  assert.equal(at(far, null, false, { kind: "door" }), "enter");
  assert.equal(at(far, null, false, null), null);
  // devolver o cavalo é feito pela tecla de interação, mas o HUD mostra o rótulo do Mestre de Estábulos
  assert.equal(at(STABLE_MASTER, "return", false, { kind: "character" }), "talk");
});

test("interação: ofertas de comércio de Lina, Toren e do Mestre de Estábulos, e nenhuma para os demais", () => {
  assert.deepEqual(npcOffer("lina"), { item: "potion", price: POTION_GEL_PRICE });
  assert.deepEqual(npcOffer("toren"), { item: "sword", price: FORGE_SWORD_PRICE });
  assert.deepEqual(npcOffer("stablemaster"), { item: "stable", price: 0 });
  assert.equal(npcOffer("aela"), undefined);
  assert.equal(npcOffer("inexistente"), undefined);
});
