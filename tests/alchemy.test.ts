import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { Inventory, normalizeInventory, POTION_HEAL } from "../src/engine/character/Inventory.ts";
import { ALCHEMIST_NPC, ELIXIR_IDS, ELIXIR_RECIPES, elixirRecipe, normalizeElixirs } from "../src/engine/character/south/alchemy/index.ts";
import { materialSalePrice } from "../src/engine/character/coins/index.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Player } from "../src/actors/Player.ts";
import { NPCS } from "../src/world/npcs.ts";
import { craftElixir, drinkElixir } from "../src/game/actions/south/alchemyActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { npcOffer } from "../src/game/interactions.ts";
import { SOUTH_DIALOGUES } from "../src/npcs/south/index.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";

/**
 * Alquimia da Casa de Venenos (ADR 0030): receitas em arquivo próprio, preparo atômico em moedas,
 * elixires persistidos e normalizados, uso na bolsa e o preparo só ao lado de Ixtal.
 */
const POTION = elixirRecipe("greater-potion"), ANTIDOTE = elixirRecipe("antidote");
const bagFor = (recipe = POTION, extra: Record<string, unknown> = {}): Inventory => new Inventory({
  gel: 0, potion: 0, questRewardClaimed: false, coins: recipe.price + 5,
  materials: Object.fromEntries(recipe.ingredients.map(i => [i.material, i.quantity])), ...extra,
});

test("cada receita tem o seu arquivo e usa só ingredientes que as criaturas realmente deixam cair", () => {
  const dir = "../src/engine/character/south/alchemy/";
  const files = readdirSync(new URL(dir + "recipes/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ELIXIR_RECIPES.map(r => r.id).sort(), "um arquivo por receita, nomeado pelo id, na pasta recipes");
  assert.deepEqual(readdirSync(new URL(dir, import.meta.url)).filter(f => f.endsWith(".ts")).sort(),
    ["alchemist.ts", "catalog.ts", "counts.ts", "index.ts", "recipe.ts", "results.ts"], "cada assunto no seu arquivo");
  assert.deepEqual([...ELIXIR_IDS].sort(), ["antidote", "greater-potion"]);
  for (const recipe of ELIXIR_RECIPES) {
    assert.ok(recipe.price > 0 && Number.isSafeInteger(recipe.price) && recipe.name && recipe.description, recipe.id);
    assert.ok(recipe.ingredients.length >= 1);
    for (const { material, quantity } of recipe.ingredients) {
      assert.notEqual(materialSalePrice(material), null, `${recipe.id}: "${material}" é saque real`);
      assert.ok(Number.isSafeInteger(quantity) && quantity >= 1, recipe.id);
    }
  }
  assert.throws(() => elixirRecipe("inexistente" as never), RangeError);
  assert.equal(ALCHEMIST_NPC, "south-ixtal");
  assert.ok(NPCS.some(n => n.id === ALCHEMIST_NPC), "Ixtal existe na cidade");
});

test("a Poção Maior cura bem mais que a comum e custa mais que o saque que a compõe", () => {
  assert.equal(POTION.effect.kind, "heal");
  if (POTION.effect.kind === "heal") assert.ok(POTION.effect.amount > POTION_HEAL * 3, "mais de três poções comuns");
  const sellValue = POTION.ingredients.reduce((sum, i) => sum + (materialSalePrice(i.material) ?? 0) * i.quantity, 0);
  assert.ok(POTION.price > sellValue, "preparar não rende mais que vender os ingredientes");
});

test("preparar gasta ingredientes e moedas e entrega o frasco; sobra fica na bolsa", () => {
  const bag = bagFor(POTION, { materials: { "Polpa de Cacto Hidratante": 5, "Flor do Deserto": 1, "Rabo de Rato": 2 } });
  assert.equal(bag.craftElixir("greater-potion"), "elixir-crafted");
  assert.equal(bag.elixirs["greater-potion"], 1);
  assert.equal(bag.coins, 5, "pagou o preço");
  assert.deepEqual(bag.materials, { "Polpa de Cacto Hidratante": 3, "Rabo de Rato": 2 }, "só os ingredientes saíram");
});

test("recusas são atômicas: faltou ingrediente, faltou dinheiro ou a pilha está cheia", () => {
  const noMaterial = bagFor(POTION, { materials: { "Polpa de Cacto Hidratante": 1, "Flor do Deserto": 1 } });
  const before = JSON.stringify(noMaterial.snapshot());
  assert.equal(noMaterial.craftElixir("greater-potion"), "missing-ingredients");
  assert.equal(JSON.stringify(noMaterial.snapshot()), before, "nada mudou");

  const noCoins = bagFor(POTION, { coins: POTION.price - 1 });
  const poor = JSON.stringify(noCoins.snapshot());
  assert.equal(noCoins.craftElixir("greater-potion"), "insufficient-elixir-coins");
  assert.equal(JSON.stringify(noCoins.snapshot()), poor, "sem dinheiro os ingredientes ficam");

  const full = bagFor(POTION, { elixirs: { "greater-potion": 99 } });
  assert.equal(full.craftElixir("greater-potion"), "elixir-stack-full");
  assert.equal(full.coins, POTION.price + 5);
  assert.equal(full.elixirs["greater-potion"], 99);
});

test("a Poção Maior cura sem passar da vida máxima e não gasta o frasco com a vida cheia", () => {
  const bag = bagFor(POTION, { elixirs: { "greater-potion": 2 } });
  const hero = { hp: 10, maxHp: 100 };
  assert.equal(bag.useElixir("greater-potion", hero), "elixir-used");
  assert.equal(hero.hp, 100, "10 + 120 limitado a 100");
  assert.equal(bag.elixirs["greater-potion"], 1);
  assert.equal(bag.useElixir("greater-potion", hero), "elixir-no-effect", "vida cheia");
  assert.equal(bag.elixirs["greater-potion"], 1, "o frasco continua");
  const hurt = { hp: 1, maxHp: 400 };
  bag.useElixir("greater-potion", hurt);
  assert.equal(hurt.hp, 121);
  assert.equal(bag.useElixir("greater-potion", { hp: 5, maxHp: 100 }), "no-elixir", "acabou");
  assert.equal(new Inventory().useElixir("antidote", { hp: 5, maxHp: 100 }), "no-elixir");
  assert.equal(bagFor(POTION, { elixirs: { "greater-potion": 1 } }).useElixir("greater-potion", { hp: 0, maxHp: 100 }), "elixir-no-effect", "herói caído não bebe");
});

test("o Antídoto limpa todos os status sem curar, e só é gasto se houver algum mal", () => {
  const bag = bagFor(ANTIDOTE, { elixirs: { antidote: 2 } });
  const hero = new Player(100);
  hero.hp = 50;
  assert.equal(bag.useElixir("antidote", hero), "elixir-no-effect", "sem mal nenhum");
  assert.equal(bag.elixirs.antidote, 2);
  hero.applyStatus("poison", 8);
  hero.applyStatus("burn", 6);
  assert.ok(hero.debuffs.poison > 0 && hero.debuffs.burn > 0);
  assert.equal(bag.useElixir("antidote", hero), "elixir-used");
  assert.ok(Object.values(hero.debuffs).every(seconds => seconds === 0), "todos os status saíram");
  assert.equal(hero.hp, 50, "não cura vida");
  assert.equal(bag.elixirs.antidote, 1);
});

test("elixires sobrevivem ao save e nunca entram sem normalizar", () => {
  const bag = bagFor(POTION, { elixirs: { "greater-potion": 3, antidote: 1 } });
  const saved = JSON.parse(JSON.stringify(bag.snapshot()));
  assert.deepEqual(new Inventory(saved).elixirs, { "greater-potion": 3, antidote: 1 });
  assert.equal("elixirs" in new Inventory().snapshot(), false, "sem elixir, o save não carrega o campo");
  assert.deepEqual(normalizeElixirs({ "greater-potion": 1000, antidote: -4, fake: 9 }), { "greater-potion": 99, antidote: 0 });
  for (const bad of [null, undefined, 7, "x", [], { antidote: 1.5 }, { antidote: Number.NaN }, { antidote: "3" }, { antidote: Infinity }])
    assert.deepEqual(normalizeElixirs(bad), { "greater-potion": 0, antidote: 0 }, JSON.stringify(bad));
  assert.equal("elixirs" in normalizeInventory({ gel: 1, elixirs: { antidote: 0 } }), false);
  assert.deepEqual(new Inventory({ elixirs: { antidote: 500 } }).elixirs, { "greater-potion": 0, antidote: 99 });
});

function world(): { sim: OfflineSimulation; context: ShopContext; goTo: (id: string) => void } {
  const sim = new OfflineSimulation(842136);
  for (const { material, quantity } of POTION.ingredients) for (let i = 0; i < quantity; i++) sim.inventory.addMaterial(material);
  sim.inventory.addCoins(POTION.price);
  const context: ShopContext = { sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false };
  return { sim, context, goTo: id => { const n = NPCS.find(x => x.id === id)!; sim.player.x = n.x; sim.player.y = n.y; } };
}

test("só se prepara ao lado de Ixtal, com o diálogo aberto e fora de interior", () => {
  const w = world();
  assert.equal(craftElixir(w.context, "greater-potion").message, INVENTORY_FEEDBACK["too-far-from-lab"], "longe de Ixtal");
  w.goTo("south-madame");
  assert.equal(craftElixir(w.context, "greater-potion").changed, false, "Madame não é alquimista");
  w.goTo(ALCHEMIST_NPC);
  assert.equal(craftElixir({ ...w.context, menuOpen: false }, "greater-potion").changed, false, "menu fechado");
  assert.equal(craftElixir({ ...w.context, inInterior: true }, "greater-potion").changed, false, "em interior");
  assert.equal(w.sim.inventory.elixirs["greater-potion"], 0, "as recusas não prepararam nada");
  assert.equal(w.sim.inventory.coins, POTION.price, "nem cobraram");
  assert.deepEqual(craftElixir(w.context, "greater-potion"), { message: "Ixtal preparou Poção Maior.", changed: true });
  assert.equal(w.sim.inventory.elixirs["greater-potion"], 1);
  assert.equal(craftElixir(w.context, "greater-potion").message, INVENTORY_FEEDBACK["missing-ingredients"], "acabaram os ingredientes");
});

test("beber um elixir funciona longe de Ixtal, mas não com o herói caído", () => {
  const w = world();
  w.goTo(ALCHEMIST_NPC);
  craftElixir(w.context, "greater-potion");
  w.sim.player.hp = 20;
  assert.deepEqual(drinkElixir({ ...w.context, caveHeroDown: true }, "greater-potion"),
    { message: INVENTORY_FEEDBACK.unavailable, changed: false });
  const drunk = drinkElixir(w.context, "greater-potion");
  assert.equal(drunk.changed, true);
  assert.equal(w.sim.player.hp, Math.min(w.sim.player.maxHp, 140));
  assert.equal(drinkElixir(w.context, "greater-potion").message, INVENTORY_FEEDBACK["no-elixir"]);
});

test("Ixtal oferece a alquimia no diálogo e não promete mais 'quando o laboratório estiver pronto'", () => {
  assert.deepEqual(npcOffer("south-ixtal"), { item: "alchemy", price: 0 });
  const speech = SOUTH_DIALOGUES["south-ixtal"]!.join(" ");
  assert.equal(/ainda não oferece/.test(speech), false);
  assert.ok(/Poção Maior/.test(speech) && /Antídoto/.test(speech), "o diálogo cita o que ele prepara");
  for (const outcome of ["elixir-crafted", "missing-ingredients", "insufficient-elixir-coins", "elixir-stack-full",
    "too-far-from-lab", "elixir-used", "no-elixir", "elixir-no-effect"] as const)
    assert.ok(INVENTORY_FEEDBACK[outcome].length > 5, outcome);
});
