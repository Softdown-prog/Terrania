import test from "node:test";
import assert from "node:assert/strict";
import { Inventory, normalizeInventory, MAX_STACK, POTION_GEL_PRICE, POTION_HEAL } from "../src/engine/Inventory.ts";
import { normalizeDrops, MAX_WORLD_DROPS } from "../src/engine/loot.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Slime } from "../src/actors/Slime.ts";
import { FORGE_SWORD_PRICE, WEAPONS, type WeaponId } from "../src/engine/Weapons.ts";
import { ClassicCombat } from "../src/engine/ClassicCombat.ts";
import { ClassicTileWalker } from "../src/engine/ClassicTileWalker.ts";

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
test("troca por poção debita o gel apenas quando há saldo e espaço", () => {
  const bag = new Inventory({ gel: POTION_GEL_PRICE * 2, potion: MAX_STACK - 1, questRewardClaimed: true });
  assert.equal(bag.tradeGelForPotion(), "traded");
  const checkpoint = bag.snapshot();
  assert.deepEqual(checkpoint, { gel: POTION_GEL_PRICE, potion: MAX_STACK, questRewardClaimed: true });
  const reopened = new Inventory(checkpoint);
  assert.equal(reopened.tradeGelForPotion(), "potions-full");
  assert.deepEqual(reopened.snapshot(), checkpoint);

  const hero = { hp: 65, maxHp: 110 };
  assert.equal(reopened.usePotion(hero), true);
  assert.equal(reopened.tradeGelForPotion(), "traded");
  assert.equal(reopened.tradeGelForPotion(), "insufficient-gel");
  assert.deepEqual(reopened.snapshot(), { gel: 0, potion: MAX_STACK, questRewardClaimed: true });
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
test("Toren vende uma única espada, exige saldo e conserva posse e equipamento no save", () => {
  const toren = { x: 538, y: 32, hp: 100 };
  const bag = new Inventory({ gel: FORGE_SWORD_PRICE - 1, loadout: { equipped: "forge" } });
  assert.equal(bag.weapon, WEAPONS.starter);
  assert.equal(bag.equipWeapon("forge"), "not-owned");
  assert.equal(bag.buyForgeSword(toren), "insufficient-sword-gel");
  assert.equal(bag.gel, FORGE_SWORD_PRICE - 1);
  bag.addGel();
  assert.equal(bag.buyForgeSword({ ...toren, hp: 0 }), "unavailable");
  assert.equal(bag.buyForgeSword({ ...toren, x: 16 }), "too-far-from-forge");
  assert.equal(bag.buyForgeSword(toren), "purchased");
  assert.equal(bag.gel, 0);
  assert.equal(bag.weapon, WEAPONS.starter);
  assert.equal(bag.buyForgeSword(toren), "already-owned");
  assert.equal(bag.equipWeapon("forge"), "equipped");
  assert.equal(bag.equipWeapon("forge"), "already-equipped");
  const restored = new Inventory(JSON.parse(JSON.stringify(bag.snapshot())));
  assert.equal(restored.weapon, WEAPONS.forge);
  assert.equal(restored.equipWeapon("starter"), "equipped");
  assert.equal(new Inventory(restored.snapshot()).equipWeapon("forge"), "equipped");
  assert.equal(new Inventory({ loadout: { forged: true, equipped: "bogus" } }).weapon, WEAPONS.starter);
});
test("trocar espada durante um golpe conserva o dano e o relógio já comprometidos no solo", () => {
  const sim = new OfflineSimulation(seed, { seed, x: -560, y: -1008, hp: 100,
    kills: 0, defeated: [], inventory: { gel: 0, potion: 0, questRewardClaimed: false,
      loadout: { forged: true, equipped: "starter" } } });
  const combat = new ClassicCombat();
  sim.update(0.05, still, false);
  const slime = sim.slimes.get("-2,-2,0");
  assert.ok(slime);
  assert.equal(combat.select(slime.id, sim.slimes), true);
  const tick = () => sim.update(0.05, still,
    combat.tick(0.05, sim.player, sim.slimes, sim.collision, sim.inventory.weapon.interval), combat.strikeTargetId);
  tick();
  assert.equal(combat.cooldown, WEAPONS.starter.interval);
  assert.equal(sim.inventory.equipWeapon("forge"), "equipped");
  tick(); tick();
  assert.equal(slime.hp, 1);
  assert.ok(combat.cooldown < WEAPONS.starter.interval);
  slime.hp = 2;
  for (let i = 0; i < 35 && combat.cooldown < WEAPONS.forge.interval; i++) tick();
  assert.equal(combat.cooldown, WEAPONS.forge.interval);
  assert.equal(sim.inventory.equipWeapon("starter"), "equipped");
  tick(); tick();
  assert.equal(slime.hp, 2);
  tick(); tick();
  assert.equal(sim.kills, 1);
  assert.ok(combat.cooldown > WEAPONS.starter.interval);
  sim.player.hp = 0;
  assert.equal(sim.respawn(), true);
  assert.deepEqual(sim.inventory.loadout, { forged: true, equipped: "starter" });
});
test("a espada leve finaliza antes um alvo ferido e a forjada vence contra vida cheia", () => {
  function timeToKill(weapon: WeaponId, hp: number): number {
    const sim = new OfflineSimulation(seed, { seed, x: -560, y: -1008, hp: 100, kills: 0,
      defeated: [], inventory: { gel: 0, potion: 0, questRewardClaimed: false,
        loadout: { forged: true, equipped: weapon } } });
    const combat = new ClassicCombat();
    const walker = new ClassicTileWalker();
    const dt = 1 / 60;
    sim.update(dt, still, false, undefined, walker);
    const slime = sim.slimes.get("-2,-2,0");
    assert.ok(slime);
    slime.hp = hp;
    assert.equal(combat.select(slime.id, sim.slimes), true);
    for (let frame = 0; frame < 180; frame++) {
      sim.update(dt, still, combat.tick(dt, sim.player, sim.slimes, sim.collision, sim.inventory.weapon.interval),
        combat.strikeTargetId, walker);
      if (sim.kills === 1) return frame * dt;
    }
    assert.fail("o alvo sobreposto deve ser derrotado");
  }
  const wounded = { starter: timeToKill("starter", 1), forge: timeToKill("forge", 1) };
  const healthy = { starter: timeToKill("starter", 2), forge: timeToKill("forge", 2) };
  assert.ok(wounded.starter < 0.1 && wounded.forge >= 0.18);
  assert.ok(healthy.starter >= 1.6 && healthy.forge < 0.2);
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
  assert.equal(sim.inventory.tradeGelForPotion(), "traded");
  assert.equal(sim.update(1 / 60, still, false), true);
  assert.equal(sim.inventory.gel, MAX_STACK - POTION_GEL_PRICE + 1);
  assert.equal(sim.inventory.potion, 1);
  const restored = new OfflineSimulation(seed, sim.snapshot());
  assert.equal(restored.update(1 / 60, still, false), false);
  assert.deepEqual(restored.inventory.snapshot(), sim.inventory.snapshot());
  assert.equal(restored.drops.size, 0);
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
