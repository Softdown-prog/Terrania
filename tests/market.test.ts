import test from "node:test";
import assert from "node:assert/strict";
import { Inventory } from "../src/engine/character/Inventory.ts";
import { MAX_COINS, MARKET_NPC, marketFor, materialSalePrice } from "../src/engine/character/coins/index.ts";
import { SOUTH_RARE_LOOT } from "../src/monsters/rareLoot.ts";
import { CREATURE_CATALOG } from "../src/actors/CreatureCatalog.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { NPCS } from "../src/world/npcs.ts";
import { sellMaterial, type ShopContext } from "../src/game/actions/shopActions.ts";
import { npcOffer } from "../src/game/interactions.ts";

/**
 * Bazar das Raridades (raros) e Ossuário (saque comum) do Poço Negro (ADR 0026): quem compra o quê,
 * por quanto, e a venda atômica em moedas.
 */
const RARES = Object.values(SOUTH_RARE_LOOT);
const FANG = SOUTH_RARE_LOOT["dune-rat"], PEARL = SOUTH_RARE_LOOT["carrion-sandworm"];

test("o Bazar compra os dez raros, e quanto mais raro, mais paga", () => {
  assert.equal(RARES.length, 10);
  for (const rare of RARES) {
    assert.equal(marketFor(rare.name), "bazaar", rare.name);
    const price = materialSalePrice(rare.name)!;
    assert.ok(Number.isSafeInteger(price) && price >= 100 && price <= 400, `${rare.name}: ${price}`);
  }
  assert.equal(materialSalePrice(FANG.name), 115, "Dente Dourado (3,5%)");
  assert.equal(materialSalePrice(PEARL.name), 335, "Pérola do Verme (1,2%)");
  const byRarity = [...RARES].sort((a, b) => a.chance - b.chance).map(r => materialSalePrice(r.name)!);
  assert.deepEqual([...byRarity].sort((a, b) => b - a), byRarity, "o mais raro vale mais");
});

test("o Ossuário compra o saque comum, barato, e nenhuma banca compra o que ninguém deixa cair", () => {
  const commons = new Set<string>();
  for (const creature of Object.values(CREATURE_CATALOG)) for (const entry of creature.loot)
    if (!RARES.some(r => r.name === entry.item)) commons.add(entry.item);
  assert.ok(commons.size > 20, "há bastante saque comum: " + commons.size);
  for (const name of commons) {
    assert.equal(marketFor(name), "ossuary", name);
    const price = materialSalePrice(name)!;
    assert.ok(price >= 1 && price < 100, `${name}: ${price}`);
  }
  assert.equal(marketFor("Item inventado"), null);
  assert.equal(materialSalePrice("Item inventado"), null);
  assert.deepEqual(MARKET_NPC, { bazaar: "south-zinha", ossuary: "south-marn" });
  const raresCheapest = Math.min(...RARES.map(r => materialSalePrice(r.name)!));
  assert.ok(Math.max(...[...commons].map(c => materialSalePrice(c)!)) < raresCheapest, "um raro sempre paga mais que o comum");
});

test("a venda paga em moedas, tira só o que vendeu e recusa o que a banca não compra", () => {
  const bag = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, materials: { [FANG.name]: 3, "Rabo de Rato": 5 } });
  assert.deepEqual(bag.sellMaterial("ossuary", FANG.name, 1), { result: "not-sellable-here", coins: 0, sold: 0 }, "o raro não vai ao Ossuário");
  assert.deepEqual(bag.sellMaterial("bazaar", "Rabo de Rato", 1), { result: "not-sellable-here", coins: 0, sold: 0 }, "o comum não vai ao Bazar");
  assert.deepEqual(bag.sellMaterial("bazaar", "Item inventado", 1), { result: "not-sellable-here", coins: 0, sold: 0 });
  assert.equal(bag.coins, 0);
  assert.deepEqual(bag.sellMaterial("bazaar", FANG.name, 1), { result: "sold", coins: 115, sold: 1 });
  assert.equal(bag.coins, 115);
  assert.equal(bag.materials[FANG.name], 2);
  assert.deepEqual(bag.sellMaterial("bazaar", FANG.name, 99), { result: "sold", coins: 230, sold: 2 }, "pedir mais que tem vende o que tem");
  assert.equal(FANG.name in bag.materials, false, "acabou: some da bolsa");
  assert.deepEqual(bag.sellMaterial("bazaar", FANG.name, 1), { result: "no-material", coins: 0, sold: 0 });
  for (const bad of [0, -1, 1.5, Number.NaN]) assert.equal(bag.sellMaterial("ossuary", "Rabo de Rato", bad).result, "no-material", String(bad));
  assert.equal(bag.materials["Rabo de Rato"], 5, "quantidade inválida não vende nada");
  assert.equal(bag.coins, 345);
});

test("carteira cheia não vende: o item fica e nenhum dinheiro some", () => {
  const bag = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: MAX_COINS - 50, materials: { [FANG.name]: 1 } });
  assert.deepEqual(bag.sellMaterial("bazaar", FANG.name, 1), { result: "wallet-full", coins: 0, sold: 0 });
  assert.equal(bag.coins, MAX_COINS - 50);
  assert.equal(bag.materials[FANG.name], 1);
});

function world(): { sim: OfflineSimulation; context: ShopContext; goTo: (id: string) => void } {
  const sim = new OfflineSimulation(842136);
  sim.inventory.addMaterial(FANG.name);
  sim.inventory.addMaterial("Rabo de Rato");
  const context: ShopContext = { sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false };
  return { sim, context, goTo: id => { const n = NPCS.find(x => x.id === id)!; sim.player.x = n.x; sim.player.y = n.y; } };
}

test("só se vende ao lado do comprador certo, com o diálogo aberto e fora de interior", () => {
  const w = world();
  assert.equal(sellMaterial(w.context, "bazaar", FANG.name, 1).changed, false, "longe de Zinha");
  w.goTo("south-marn");
  assert.equal(sellMaterial(w.context, "bazaar", FANG.name, 1).changed, false, "Marn não é o Bazar");
  w.goTo("south-zinha");
  assert.equal(sellMaterial({ ...w.context, menuOpen: false }, "bazaar", FANG.name, 1).changed, false, "menu fechado");
  assert.equal(sellMaterial({ ...w.context, inInterior: true }, "bazaar", FANG.name, 1).changed, false, "em interior");
  assert.equal(sellMaterial(w.context, "ossuary", "Rabo de Rato", 1).changed, false, "Zinha não compra o comum");
  assert.equal(w.sim.inventory.coins, 0, "as recusas não pagaram nada");
  const sold = sellMaterial(w.context, "bazaar", FANG.name, 1);
  assert.deepEqual(sold, { message: "Vendeu 1 × Dente Dourado de Roedor por 1 Cripta Coin e 15 Terrania Gold.", changed: true });
  assert.equal(w.sim.inventory.coins, 115);
  w.goTo("south-marn");
  assert.equal(sellMaterial(w.context, "ossuary", "Rabo de Rato", 1).changed, true);
  assert.ok(w.sim.inventory.coins > 115);
});

test("Zinha e Marn oferecem a banca no diálogo", () => {
  assert.deepEqual(npcOffer("south-zinha"), { item: "bazaar", price: 0 });
  assert.deepEqual(npcOffer("south-marn"), { item: "ossuary", price: 0 });
});
