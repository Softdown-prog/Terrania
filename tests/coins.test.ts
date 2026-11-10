import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { COIN_TIERS, MAX_COINS, MERGE_AT, coinBreakdown, normalizeCoins } from "../src/engine/character/coins/index.ts";
import { Inventory, normalizeInventory } from "../src/engine/character/Inventory.ts";

/**
 * Moedas e carteira (ADR 0023): três moedas, cada uma no seu arquivo, que se unem a cada 100.
 * O dinheiro é um inteiro em Terrania Gold; as moedas maiores aparecem sozinhas.
 */
const counts = (total: number): number[] => coinBreakdown(total).map(c => c.count);

test("cada moeda tem o seu arquivo, com o seu id, em ordem crescente de valor (cada uma vale 100 da anterior)", () => {
  const files = readdirSync(new URL("../src/engine/character/coins/", import.meta.url))
    .filter(f => f.endsWith(".ts") && !["index.ts", "types.ts", "wallet.ts", "drops.ts"].includes(f)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, COIN_TIERS.map(c => c.id).sort(), "um arquivo por moeda, nomeado pelo id");
  assert.deepEqual(COIN_TIERS.map(c => c.id), ["terrania-gold", "cripta-coin", "eclipse-crown"]);
  assert.deepEqual(COIN_TIERS.map(c => c.name), ["Terrania Gold", "Cripta Coin", "Eclipse Crown"]);
  assert.equal(COIN_TIERS[0]!.value, 1);
  for (let i = 1; i < COIN_TIERS.length; i++)
    assert.equal(COIN_TIERS[i]!.value, COIN_TIERS[i - 1]!.value * MERGE_AT, "cada moeda vale 100 da anterior");
  assert.equal(MERGE_AT, 100);
  for (const coin of COIN_TIERS) assert.ok(coin.description.length > 20, coin.id);
  for (const banned of ["cristal", "crystal", "platina", "platinum"])
    assert.ok(!COIN_TIERS.some(c => (c.name + c.id).toLowerCase().includes(banned)), "nome proibido: " + banned);
});

test("as moedas se unem sozinhas ao chegar a 100: 99 + 1 vira 1 da próxima, e 100 Cripta viram 1 Eclipse", () => {
  assert.deepEqual(counts(0), [0, 0, 0]);
  assert.deepEqual(counts(99), [99, 0, 0]);
  assert.deepEqual(counts(100), [0, 1, 0], "100 Terrania Gold viram 1 Cripta Coin");
  assert.deepEqual(counts(101), [1, 1, 0]);
  assert.deepEqual(counts(9_999), [99, 99, 0]);
  assert.deepEqual(counts(10_000), [0, 0, 1], "100 Cripta Coin viram 1 Eclipse Crown");
  assert.deepEqual(counts(10_250), [50, 2, 1]);
  assert.deepEqual(counts(MAX_COINS), [99, 99, 9_999], "o teto são 9.999 Eclipse Crown");
  for (let total = 0; total < 30_000; total += 37) {
    const [gold, cripta, crown] = counts(total) as [number, number, number];
    assert.ok(gold < 100 && cripta < 100, "só a maior passa de 99: " + total);
    assert.equal(gold + cripta * 100 + crown * 10_000, total, "as moedas somam o total: " + total);
  }
});

test("a carteira não confia em número de fora: só inteiro seguro de 0 ao teto", () => {
  for (const bad of [NaN, Infinity, -Infinity, -5, 0, 1.5, "100", null, undefined, {}, [], 2 ** 60])
    assert.equal(normalizeCoins(bad), 0, String(bad));
  assert.equal(normalizeCoins(250), 250);
  assert.equal(normalizeCoins(MAX_COINS + 1), MAX_COINS, "acima do teto vira o teto");
  assert.equal(normalizeCoins(Number.MAX_SAFE_INTEGER), MAX_COINS);
  assert.deepEqual(counts(-10), [0, 0, 0]);
  assert.deepEqual(counts(Number.NaN), [0, 0, 0]);
});

test("a bolsa ganha moedas, paga dando troco e nunca fica negativa", () => {
  const bag = new Inventory();
  assert.equal(bag.coins, 0);
  assert.equal(bag.addCoins(99), 99);
  assert.deepEqual(counts(bag.coins), [99, 0, 0]);
  bag.addCoins(1);
  assert.deepEqual(counts(bag.coins), [0, 1, 0], "a 100ª moeda virou 1 Cripta Coin");
  assert.equal(bag.spendCoins(1), true);
  assert.deepEqual(counts(bag.coins), [99, 0, 0], "pagar 1 com uma Cripta Coin devolve o troco em Terrania Gold");
  assert.equal(bag.spendCoins(100), false, "sem dinheiro suficiente nada muda");
  assert.equal(bag.coins, 99);
  for (const bad of [0, -3, 1.5, Number.NaN, Infinity]) {
    assert.equal(bag.spendCoins(bad), false, String(bad));
    assert.equal(bag.addCoins(bad), 0, String(bad));
  }
  assert.equal(bag.coins, 99);
  assert.equal(new Inventory().addCoins(MAX_COINS + 50), MAX_COINS, "só cabe até o teto");
  const full = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: MAX_COINS });
  assert.equal(full.addCoins(10), 0, "carteira cheia não ganha mais");
  assert.equal(full.coins, MAX_COINS);
});

test("as moedas vão e voltam do save; save antigo sem moedas continua valendo; save sujo é limpo", () => {
  const bag = new Inventory();
  assert.equal("coins" in bag.snapshot(), false, "sem moedas o save não ganha campo novo");
  bag.addCoins(12_345);
  const saved = bag.snapshot();
  assert.equal(saved.coins, 12_345);
  assert.equal(new Inventory(JSON.parse(JSON.stringify(saved))).coins, 12_345, "ida e volta pelo JSON");
  assert.equal(new Inventory({ gel: 3, potion: 1, questRewardClaimed: true }).coins, 0, "save antigo");
  for (const dirty of [-1, 1.5, "99", NaN, null, 2 ** 70])
    assert.equal(normalizeInventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: dirty }).coins, undefined, String(dirty));
  assert.equal(normalizeInventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: MAX_COINS * 3 }).coins, MAX_COINS);
});
