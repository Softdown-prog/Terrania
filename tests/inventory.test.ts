import test from "node:test";
import assert from "node:assert/strict";
import { Inventory, normalizeInventory, MAX_STACK, POTION_HEAL } from "../src/engine/Inventory.ts";
import { normalizeDrops, MAX_WORLD_DROPS } from "../src/engine/loot.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Slime } from "../src/actors/Slime.ts";

const seed = 842136;
const still = { x: 0, y: 0 };

test("bolsa nova, validação de dados e limite de pilhas", () => {
  const empty = new Inventory();
  assert.deepEqual(empty.snapshot(), { gel: 0, potion: 0, questRewardClaimed: false });
  assert.deepEqual(normalizeInventory({ gel: -3, potion: Infinity, questRewardClaimed: "true" }),
    empty.snapshot());
  const bag = new Inventory({ gel: MAX_STACK + 10, potion: 5.5, questRewardClaimed: true });
  assert.equal(bag.gel, MAX_STACK);
  assert.equal(bag.potion, 0);
  assert.equal(bag.questRewardClaimed, true);
  assert.equal(bag.addGel(), false);
  for (let i = 0; i < MAX_STACK; i++) assert.equal(empty.addGel(), true);
  assert.equal(empty.addGel(), false);
});
test("Aela entrega duas poções apenas depois de cinco slimes e uma única vez", () => {
  const inventory = new Inventory();
  assert.equal(inventory.claimAelaReward(4), false);
  assert.equal(inventory.claimAelaReward(5), true);
  assert.equal(inventory.claimAelaReward(100), false);
  assert.equal(inventory.potion, 2);
  const reopened = new Inventory(inventory.snapshot());
  assert.equal(reopened.claimAelaReward(5), false);
  assert.equal(reopened.potion, 2);
});
test("poção restaura vida com teto e não pode ser usada com vida cheia ou morte", () => {
  const bag = new Inventory({ gel: 0, potion: 2, questRewardClaimed: false });
  const hero = { hp: 50, maxHp: 100 };
  assert.equal(bag.usePotion(hero), true);
  assert.equal(hero.hp, 50 + POTION_HEAL);
  assert.equal(bag.potion, 1);
  hero.hp = 99;
  assert.equal(bag.usePotion(hero), true);
  assert.equal(hero.hp, 100);
  assert.equal(bag.potion, 0);
  assert.equal(bag.usePotion(hero), false);
  const fresh = new Inventory({ potion: 1 });
  assert.equal(fresh.usePotion(hero), false);
  hero.hp = 0;
  assert.equal(fresh.usePotion(hero), false);
  assert.equal(fresh.potion, 1);
});
test("slime derrotado deixa gel no mundo, coleta de perto e save persistente", () => {
  const sim = new OfflineSimulation(seed);
  sim.update(0, still, false);
  sim.slimes.clear();
  const slime = new Slime("test-loot", 50, 16);
  slime.hp = 1;
  sim.slimes.set(slime.id, slime);
  sim.player.faceX = 1; sim.player.faceY = 0;
  sim.update(1 / 60, still, true);
  for (let i = 0; i < 20; i++) sim.update(1 / 60, still, false);
  assert.equal(sim.kills, 1);
  assert.equal(sim.defeated.has(slime.id), true);
  const drop = sim.drops.get(slime.id);
  assert.ok(drop);
  assert.equal(drop.item, "gel");
  assert.equal(sim.inventory.gel, 0);
  const savedBeforePickup = sim.snapshot();
  const restarted = new OfflineSimulation(seed, savedBeforePickup);
  assert.equal(restarted.drops.size, 1);
  assert.equal(restarted.kills, 1);
  restarted.player.x = drop.x;
  restarted.player.y = drop.y;
  assert.equal(restarted.update(1 / 60, still, false), true);
  assert.equal(restarted.inventory.gel, 1);
  assert.equal(restarted.drops.size, 0);
  const afterPickup = new OfflineSimulation(seed, restarted.snapshot());
  assert.equal(afterPickup.inventory.gel, 1);
  assert.equal(afterPickup.drops.size, 0);
  assert.equal(afterPickup.defeated.has(slime.id), true);
});
test("bolsa cheia mantém gel no chão para coleta posterior", () => {
  const saved = {
    seed, x: 16, y: 16, hp: 100, kills: 1, defeated: ["slime-1"],
    inventory: { gel: MAX_STACK, potion: 0, questRewardClaimed: false },
    drops: [{ id: "slime-1", item: "gel" as const, x: 16, y: 16 }],
  };
  const sim = new OfflineSimulation(seed, saved);
  sim.update(1 / 60, still, false);
  assert.equal(sim.inventory.gel, MAX_STACK);
  assert.equal(sim.drops.size, 1);
});
test("save legado sem inventário permanece compatível e nova partida fica vazia", () => {
  const legacy = { seed, x: 16, y: 16, hp: 70, kills: 5, defeated: ["one"] };
  const sim = new OfflineSimulation(seed, legacy);
  assert.equal(sim.kills, 5);
  assert.equal(sim.inventory.gel, 0);
  assert.equal(sim.inventory.potion, 0);
  assert.equal(sim.inventory.claimAelaReward(sim.kills), true);
  const next = new OfflineSimulation(seed + 1);
  assert.equal(next.inventory.potion, 0);
});
test("loot salvo inválido/duplicado é descartado e quantidade permanece limitada", () => {
  const list: unknown[] = [
    { id: "a", item: "gel", x: 0, y: 0 },
    { id: "a", item: "gel", x: 1, y: 2 },
    { id: "bad", item: "gel", x: NaN, y: 0 },
    { id: "bad2", item: "potion", x: 0, y: 0 },
  ];
  assert.deepEqual(normalizeDrops(list), [{ id: "a", item: "gel", x: 0, y: 0 }]);
  const large = Array.from({ length: 100 }, (_, i) => ({
    id: "slime-" + i, item: "gel", x: i, y: i,
  }));
  assert.equal(normalizeDrops(large).length, MAX_WORLD_DROPS);
  const invalid = new OfflineSimulation(seed, {
    seed, x: 16, y: 16, hp: 100, kills: 0, defeated: [],
    drops: [{ id: "not-defeated", item: "gel", x: 16, y: 16 }],
  });
  assert.equal(invalid.drops.size, 0);
});
