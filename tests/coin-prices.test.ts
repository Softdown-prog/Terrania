import test from "node:test";
import assert from "node:assert/strict";
import { Inventory, INN_REST_PRICE, POTION_GEL_PRICE } from "../src/engine/character/Inventory.ts";
import { FOODS, FOOD_IDS } from "../src/engine/character/Food.ts";
import { FORGE_SWORD_PRICE } from "../src/engine/character/Weapons.ts";
import { STABLE_UPGRADE_PRICE } from "../src/actors/MountCatalog.ts";
import { describeCoins, rollCoinDrop } from "../src/engine/character/coins/index.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";
import { MOUNT_MESSAGES } from "../src/game/messages/mountMessages.ts";

/**
 * Preços em moedas (ADR 0025): as compras (espada, comida, descanso, estábulo) cobram Terrania Gold e
 * dão troco sozinhas; o gel segue só como troca (poção da Lina) e material (cabresto).
 */
const TOREN = { x: 538, y: 32, hp: 100 };

test("a tabela de preços em Terrania Gold", () => {
  assert.equal(FORGE_SWORD_PRICE, 30);
  assert.equal(INN_REST_PRICE, 24);
  assert.deepEqual(Object.fromEntries(FOOD_IDS.map(id => [id, FOODS[id].price])), { apple: 6, bread: 12, meat: 18 });
  assert.deepEqual(STABLE_UPGRADE_PRICE, { 1: 72, 2: 150, 3: 240 });
  assert.ok(FOOD_IDS.every(id => Number.isSafeInteger(FOODS[id].price) && FOODS[id].price > 0));
});

test("equilíbrio: os preços ficam a poucas criaturas de distância das moedas que elas deixam", () => {
  let total = 0;
  const samples = 2_000;
  for (let i = 0; i < samples; i++) total += rollCoinDrop("slime", "equilibrio-" + i);
  const perSlime = total / samples;
  assert.ok(perSlime > 3 && perSlime < 8, "um slime deixa em média " + perSlime.toFixed(2));
  assert.ok(FOODS.apple.price <= perSlime * 1.5, "a comida mais barata sai por cerca de um slime");
  const swordSlimes = FORGE_SWORD_PRICE / perSlime;
  assert.ok(swordSlimes >= 3 && swordSlimes <= 12, "a espada custa " + swordSlimes.toFixed(1) + " slimes");
  assert.ok(STABLE_UPGRADE_PRICE[1] / perSlime < 30, "o cercado não pede centenas de abates");
});

test("só as moedas compram: gel de sobra não paga espada, comida nem descanso", () => {
  const rich = (): Inventory => new Inventory({ gel: 99, potion: 0, questRewardClaimed: false });
  assert.equal(rich().buyForgeSword(TOREN), "insufficient-sword-coins");
  assert.equal(rich().buyFood("apple"), "insufficient-food-coins");
  assert.equal(rich().restAtInn({ hp: 10, maxHp: 100 }), "insufficient-rest-coins");
  const broke = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: 5_000 });
  assert.equal(broke.buyFood("meat"), "food-traded", "moedas compram mesmo sem nenhum gel");
  assert.equal(broke.buyForgeSword(TOREN), "purchased");
  assert.equal(broke.restAtInn({ hp: 10, maxHp: 100 }), "rested");
  assert.equal(broke.coins, 5_000 - FOODS.meat.price - FORGE_SWORD_PRICE - INN_REST_PRICE);
  assert.equal(broke.gel, 0);
});

test("o gel segue valendo para o que é troca: a poção da Lina custa gel e não mexe nas moedas", () => {
  const bag = new Inventory({ gel: POTION_GEL_PRICE, potion: 0, questRewardClaimed: false, coins: 500 });
  assert.equal(bag.tradeGelForPotion(), "traded");
  assert.equal(bag.gel, 0);
  assert.equal(bag.coins, 500, "a troca de gel não gasta moedas");
  assert.equal(new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: 500 }).tradeGelForPotion(),
    "insufficient-gel", "moedas não pagam a troca de gel");
});

test("o troco volta sozinho: pagar o descanso com uma Cripta Coin devolve o resto em Terrania Gold", () => {
  const bag = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: 100 });
  assert.equal(bag.restAtInn({ hp: 1, maxHp: 100 }), "rested");
  assert.equal(bag.coins, 100 - INN_REST_PRICE);
  assert.equal(describeCoins(bag.coins), "76 Terrania Gold");
});

test("os valores aparecem com o nome das moedas na tela", () => {
  assert.equal(describeCoins(0), "0 Terrania Gold");
  assert.equal(describeCoins(6), "6 Terrania Gold");
  assert.equal(describeCoins(100), "1 Cripta Coin");
  assert.equal(describeCoins(150), "1 Cripta Coin e 50 Terrania Gold");
  assert.equal(describeCoins(10_250), "1 Eclipse Crown e 2 Cripta Coin e 50 Terrania Gold");
  assert.equal(describeCoins(Number.NaN), "0 Terrania Gold");
});

test("as mensagens de falta de dinheiro falam de moeda, não de gel", () => {
  for (const key of ["insufficient-sword-coins", "insufficient-rest-coins", "insufficient-food-coins"] as const)
    assert.ok(!/gel/i.test(INVENTORY_FEEDBACK[key]), key + ": " + INVENTORY_FEEDBACK[key]);
  assert.match(INVENTORY_FEEDBACK["insufficient-sword-coins"], /30 Terrania Gold/);
  assert.match(INVENTORY_FEEDBACK["insufficient-rest-coins"], /24 Terrania Gold/);
  assert.match(MOUNT_MESSAGES["no-coins"], /Moedas/);
  assert.match(MOUNT_MESSAGES["no-gel"], /cabresto/);
});
