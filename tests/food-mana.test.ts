import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { FOODS, FOOD_IDS, foodMana } from "../src/engine/character/Food.ts";
import { MAGE } from "../src/engine/character/classes/index.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { eatFood } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { INVENTORY_FEEDBACK, ateManaMessage } from "../src/game/messages/inventoryFeedback.ts";

/**
 * Pedido do dono: o Mago também recupera mana comendo, não só pela recarga automática (ADR 0085). Cada alimento tem a sua porcentagem da mana máxima, que volta na
 * hora a quem usa mana; a vida continua voltando aos poucos, como sempre. O Cavaleiro não tem mana, então a comida dele não muda.
 */
const SEED = 842136;
const read = (path: string): string => readFileSync(path, "utf8");
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);
const FOOD = { apple: 3, bread: 3, meat: 3 };
const mageAt = (level: number): OfflineSimulation => {
  const { mana: _m, inventory: _i, ...rest } = new OfflineSimulation(SEED, undefined, "mage").snapshot();
  return new OfflineSimulation(SEED, { ...rest, experience: experienceForLevel(level), inventory: { gel: 0, potion: 0, questRewardClaimed: false, food: FOOD } } as never);
};
const knight = (): OfflineSimulation => new OfflineSimulation(SEED, { seed: SEED, x: 16, y: 16, hp: 50, kills: 0, defeated: [], inventory: { gel: 0, potion: 0, questRewardClaimed: false, food: FOOD } } as never);

test("cada alimento devolve uma porcentagem da mana máxima (maçã 8%, pão 15%, carne 25%), arredondada, e nada a quem não tem mana", () => {
  assert.deepEqual(FOOD_IDS.map(id => FOODS[id].manaPercent), [8, 15, 25]);
  assert.ok(FOODS.apple.manaPercent < FOODS.bread.manaPercent && FOODS.bread.manaPercent < FOODS.meat.manaPercent, "quanto mais forte o alimento, mais mana");
  assert.equal(foodMana("meat", 150), 38, "37,5 arredonda para 38"); assert.equal(foodMana("apple", 100), 8); assert.equal(foodMana("bread", 50), 8);
  for (const bad of [0, -10, Number.NaN, Infinity]) assert.equal(foodMana("meat", bad), 0, "mana máxima inválida: " + bad);
});

test("o Mago que come recupera a mana na hora e a vida aos poucos, e só se a refeição foi feita", () => {
  const sim = mageAt(10), max = sim.maxMana;
  sim.spendMana(sim.mana);
  assert.equal(sim.mana, 0);
  const first = sim.eatFood("apple");
  assert.equal(first.outcome, "ate"); assert.equal(first.mana, foodMana("apple", max)); assert.equal(sim.mana, foodMana("apple", max)); assert.equal(sim.inventory.food.apple, FOOD.apple - 1);
  assert.equal(sim.player.nutrition.reserve, FOODS.apple.healBudget, "a vida continua voltando aos poucos");
  // recarga do ritmo de comer: a segunda refeição seguida é recusada e não dá mana
  const second = sim.eatFood("bread");
  assert.equal(second.outcome, "eat-cooldown"); assert.equal(second.mana, 0); assert.equal(sim.mana, foodMana("apple", max)); assert.equal(sim.inventory.food.bread, FOOD.bread, "o pão não foi gasto");
  sim.advanceClock(0.1); // o relógio anda em passos curtos; vários passos passam o cooldown
  for (let i = 0; i < 60; i++) sim.update(0.1, { x: 0, y: 0 }, false, null);
  sim.spendMana(sim.mana);
  const third = sim.eatFood("meat");
  assert.equal(third.outcome, "ate"); assert.equal(third.mana, foodMana("meat", max)); assert.ok(third.mana > first.mana, "a carne dá mais mana que a maçã");
  assert.equal(sim.eatFood("meat").mana, 0, "outra vez sem esperar: recusado");
});

test("a comida nunca passa do máximo de mana, e o que cabe é o que a refeição conta", () => {
  const sim = mageAt(10), max = sim.maxMana;
  sim.spendMana(foodMana("meat", max) - 1); // falta um pouco menos do que a carne devolve
  const missing = max - sim.mana;
  assert.ok(missing > 0 && missing < foodMana("meat", max));
  const eaten = sim.eatFood("meat");
  assert.equal(sim.mana, max, "encheu e parou no máximo"); assert.ok(Math.abs(eaten.mana - missing) < 1e-9, "a refeição conta só o que coube");
  const full = mageAt(10).eatFood("apple"); assert.equal(full.outcome, "ate"); assert.equal(full.mana, 0, "com a mana cheia a comida não acrescenta mana (e a refeição é feita do mesmo jeito)");
});

test("o Cavaleiro come como sempre: sem mana, nada muda", () => {
  const sim = knight();
  assert.equal(sim.maxMana, 0); const eaten = sim.eatFood("meat");
  assert.deepEqual({ ...eaten }, { outcome: "ate", mana: 0 }); assert.equal(sim.mana, 0); assert.equal(sim.player.nutrition.reserve, FOODS.meat.healBudget);
  assert.equal(sim.inventory.food.meat, FOOD.meat - 1);
});

test("a ação de comer diz a mana que voltou ao Mago e continua dizendo a frase de sempre ao Cavaleiro; recusar não dá mana", () => {
  const mage = mageAt(10); mage.spendMana(mage.mana);
  const result = eatFood(context(mage), "bread");
  assert.equal(result.changed, true); assert.equal(result.message, `Pão: ${ateManaMessage(foodMana("bread", mage.maxMana))}`); assert.match(result.message, /de mana na hora/);
  const refused = eatFood(context(mage), "meat"); assert.deepEqual({ ...refused }, { message: INVENTORY_FEEDBACK["eat-cooldown"], changed: false });
  assert.equal(mage.mana, foodMana("bread", mage.maxMana), "recusado não dá mana");
  const k = eatFood(context(knight()), "apple"); assert.deepEqual({ ...k }, { message: `Maçã: ${INVENTORY_FEEDBACK.ate}`, changed: true });
  assert.equal(ateManaMessage(37.6), "Refeição feita. Sua vida volta aos poucos e você recupera 38 de mana na hora.");
});

test("a mana ganha comendo entra no save, e o Mago de nível alto ganha mais que o de nível baixo", () => {
  const sim = mageAt(10); sim.spendMana(sim.mana); sim.eatFood("meat");
  assert.equal(Math.round(sim.snapshot().mana! * 100) / 100, Math.round(foodMana("meat", sim.maxMana) * 100) / 100);
  const low = mageAt(1), high = mageAt(50); low.spendMana(low.mana); high.spendMana(high.mana);
  assert.ok(high.eatFood("meat").mana > low.eatFood("meat").mana); assert.equal(MAGE.maxMana(1) > 0, true);
});

test("a ligação: a ação usa a refeição da simulação e a mochila diz a mana ao Mago", () => {
  const actions = read("src/game/actions/shopActions.ts"), hud = read("src/app/hud.service.ts"), sim = read("src/engine/OfflineSimulation.ts");
  assert.match(actions, /const \{ outcome, mana \} = sim\.eatFood\(id\);/); assert.match(actions, /mana > 0 \? ateManaMessage\(mana\) : INVENTORY_FEEDBACK\.ate/);
  assert.match(sim, /mana: outcome === "ate" \? this\.gainMana\(foodMana\(id, this\.maxMana\)\) : 0/);
  assert.match(hud, /HERO_CLASSES\[this\.heroClass\(\)\]\.usesMana \? ' e ' \+ item\.manaPercent \+ '% da mana na hora\.' : '\.'/);
});
