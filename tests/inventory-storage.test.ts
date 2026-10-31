import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { loadLocalSave, saveLocal } from "../src/storage/localSave.ts";

const KEY = "terrania-origins-v1";

test("localStorage antigo migra para bolsa e a recompensa única sobrevive ao recarregar", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
    },
  });
  try {
    store.set(KEY, JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 79, kills: 5, defeated: ["s1", "s2", "s3"],
    }));
    const oldSave = loadLocalSave();
    assert.ok(oldSave);
    assert.equal(oldSave.kills, 5);
    const originalGame = new OfflineSimulation(oldSave.seed, oldSave);
    assert.equal(originalGame.inventory.potion, 0);
    assert.equal(originalGame.inventory.claimAelaReward(originalGame.kills), true);
    saveLocal(originalGame.snapshot());
    const reloaded = loadLocalSave();
    assert.ok(reloaded);
    assert.equal(reloaded.hp, 79);
    assert.deepEqual(reloaded.defeated, ["s1", "s2", "s3"]);
    const nextGame = new OfflineSimulation(reloaded.seed, reloaded);
    assert.equal(nextGame.inventory.potion, 2);
    assert.equal(nextGame.inventory.questRewardClaimed, true);
    assert.equal(nextGame.inventory.claimAelaReward(nextGame.kills), false);
    const potionState = nextGame.snapshot().inventory;
    assert.equal(potionState?.potion, 2);
    store.set(KEY, JSON.stringify({
      ...nextGame.snapshot(),
      inventory: { gel: 99999, potion: -100, questRewardClaimed: "yes" },
      drops: [{ id: "invalid", item: "gel", x: "50", y: 70 }],
    }));
    const sanitized = loadLocalSave();
    assert.equal(sanitized?.inventory?.gel, 99);
    assert.equal(sanitized?.inventory?.potion, 0);
    assert.equal(sanitized?.inventory?.questRewardClaimed, false);
    assert.deepEqual(sanitized?.drops, []);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
