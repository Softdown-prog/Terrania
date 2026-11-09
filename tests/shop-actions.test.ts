import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { POTION_GEL_PRICE } from "../src/engine/Inventory.ts";
import { FORGE_SWORD_PRICE } from "../src/engine/Weapons.ts";
import { experienceForLevel } from "../src/engine/Experience.ts";
import { NPCS } from "../src/world/npcs.ts";
import { buyFood, buySword, eatFood, equipGear, equipWeapon, tradeGelForPotion, usePotion,
  type ShopContext } from "../src/game/actions/shopActions.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";

const at = (id: string) => NPCS.find(n => n.id === id)!;
function world(over: Partial<ShopContext> = {}, gel = 0) {
  const sim = new OfflineSimulation(842136);
  for (let i = 0; i < gel; i++) sim.inventory.addGel();
  const context = (extra: Partial<ShopContext> = {}): ShopContext =>
    ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false, ...over, ...extra });
  const goTo = (id: string) => { sim.player.x = at(id).x; sim.player.y = at(id).y; };
  return { sim, context, goTo };
}

test("loja: trocar gel por poção exige menu aberto, fora de interior, vivo e perto da Lina", () => {
  const w = world({}, POTION_GEL_PRICE);
  const refused = { message: INVENTORY_FEEDBACK["too-far"], changed: false };
  // Longe da Lina a troca é recusada, mas isso não prova nada sobre menu e interior.
  assert.deepEqual(tradeGelForPotion(w.context()), refused, "longe da Lina");
  // Perto da Lina e com gel de sobra, SÓ menu fechado ou interior podem causar a recusa.
  w.goTo("lina");
  assert.deepEqual(tradeGelForPotion(w.context({ menuOpen: false })), refused, "menu fechado");
  assert.deepEqual(tradeGelForPotion(w.context({ inInterior: true })), refused, "dentro de um interior");
  assert.equal(w.sim.inventory.gel, POTION_GEL_PRICE, "as recusas não cobraram nada");
  w.sim.player.hp = 0;
  assert.deepEqual(tradeGelForPotion(w.context()), { message: INVENTORY_FEEDBACK.unavailable, changed: false });
  w.sim.player.hp = w.sim.player.maxHp;
  assert.deepEqual(tradeGelForPotion(w.context()), { message: INVENTORY_FEEDBACK.traded, changed: true });
  assert.equal(w.sim.inventory.potion, 1);
  assert.equal(w.sim.inventory.gel, 0, "o preço foi pago");
  assert.deepEqual(tradeGelForPotion(w.context()), { message: INVENTORY_FEEDBACK["insufficient-gel"], changed: false });
});

test("loja: comida é comprada da Lina e comida acabada não muda nada", () => {
  const w = world({}, 5);
  assert.equal(buyFood(w.context(), "apple").message, INVENTORY_FEEDBACK["too-far"], "longe da Lina");
  w.goTo("lina");
  assert.deepEqual(buyFood(w.context(), "apple"), { message: "Lina entregou Maçã.", changed: true });
  assert.equal(buyFood(w.context({ menuOpen: false }), "apple").changed, false);
  assert.deepEqual(eatFood(w.context(), "bread"), { message: INVENTORY_FEEDBACK["no-food"], changed: false });
  assert.deepEqual(eatFood(w.context(), "apple"), { message: "Maçã: " + INVENTORY_FEEDBACK.ate, changed: true });
});

test("loja: a espada de Toren só é vendida com gel suficiente, uma única vez, e só então pode ser equipada", () => {
  const w = world({}, FORGE_SWORD_PRICE - 1);
  w.goTo("toren");
  assert.deepEqual(buySword(w.context({ menuOpen: false })), { message: INVENTORY_FEEDBACK["too-far-from-forge"], changed: false });
  assert.deepEqual(equipWeapon(w.context(), "forge"), { message: INVENTORY_FEEDBACK["not-owned"], changed: false });
  assert.deepEqual(buySword(w.context()), { message: INVENTORY_FEEDBACK["insufficient-sword-gel"], changed: false });
  w.sim.inventory.addGel();
  assert.deepEqual(buySword(w.context()), { message: INVENTORY_FEEDBACK.purchased, changed: true });
  assert.deepEqual(buySword(w.context()), { message: INVENTORY_FEEDBACK["already-owned"], changed: false });
  assert.deepEqual(equipWeapon(w.context(), "forge"), { message: INVENTORY_FEEDBACK["level-too-low"], changed: false });
  w.sim.experience = experienceForLevel(10);
  assert.deepEqual(equipWeapon(w.context(), "forge"), { message: INVENTORY_FEEDBACK.equipped, changed: true });
  assert.deepEqual(equipWeapon(w.context(), "forge"), { message: INVENTORY_FEEDBACK["already-equipped"], changed: false });
});

test("loja: equipamento só muda a bolsa quando equipa ou retira de fato", () => {
  const w = world();
  assert.deepEqual(equipGear(w.context(), "head", "trail-helm"), { message: INVENTORY_FEEDBACK["gear-equipped"], changed: true });
  assert.deepEqual(equipGear(w.context(), "head", "trail-helm"), { message: INVENTORY_FEEDBACK["gear-unchanged"], changed: false });
  assert.deepEqual(equipGear(w.context(), "feet", "trail-helm"), { message: INVENTORY_FEEDBACK["wrong-slot"], changed: false });
  assert.deepEqual(equipGear(w.context(), "head", null), { message: INVENTORY_FEEDBACK["gear-removed"], changed: true });
});

test("loja: a poção rápida respeita herói caído, vida cheia e falta de poção, e só cura quando precisa", () => {
  const w = world({}, POTION_GEL_PRICE);
  assert.equal(usePotion(w.context()).message, INVENTORY_FEEDBACK["full-health"]);
  w.sim.player.hp = 10;
  assert.deepEqual(usePotion(w.context()), { message: INVENTORY_FEEDBACK["no-potion"], changed: false });
  w.goTo("lina");
  tradeGelForPotion(w.context());
  assert.deepEqual(usePotion(w.context({ caveHeroDown: true })), { message: INVENTORY_FEEDBACK.unavailable, changed: false });
  assert.equal(w.sim.inventory.potion, 1, "herói caído na caverna não gasta a poção");
  assert.deepEqual(usePotion(w.context()), { message: INVENTORY_FEEDBACK.healed, changed: true });
  assert.ok(w.sim.player.hp > 10);
  assert.equal(w.sim.inventory.potion, 0);
});

test("loja: usa o herói de quem age (caverna) para cura e comida, e o da simulação para o comércio", () => {
  const w = world({}, 20);
  w.goTo("lina");
  tradeGelForPotion(w.context());
  const caveHero = Object.create(w.sim.player) as typeof w.sim.player;
  caveHero.hp = 5;
  assert.equal(usePotion(w.context({ hero: caveHero })).message, INVENTORY_FEEDBACK.healed);
  assert.ok(caveHero.hp > 5, "curou o herói da caverna");
});
