import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Inventory, normalizeInventory } from "../src/engine/character/Inventory.ts";
import { ARCHER_STARTING_GEAR, GEAR, MAGE_STARTING_GEAR, gearForClass, gearHeroClass, gearIdsFor, gearLevel, gearSetName, startingGearFor } from "../src/engine/character/Equipment.ts";
import { LEATHER_GEAR } from "../src/engine/character/archer/gear/leather/index.ts";
import { ARCHER } from "../src/engine/character/classes/index.ts";
import { equipGear } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { WRONG_GEAR_CLASS_MESSAGE } from "../src/game/messages/classRules.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";

/** As roupas do Arqueiro, lote A6a (ADR 0123): o conjunto Couro Cru (sete peças) que o Arqueiro veste ao nascer, a regra de vocação nos dois sentidos e o save. */
const SEED = 842136;
const read = (path: string): string => readFileSync(path, "utf8");
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);
const IDS = ["leather-hood", "leather-jerkin", "leather-trousers", "leather-boots", "leather-gloves", "horn-ring", "tooth-necklace"] as const;

test("o conjunto Couro Cru: sete peças, uma por espaço, só do Arqueiro, do nível 1, com a defesa e os nomes da lista", () => {
  assert.deepEqual(Object.keys(LEATHER_GEAR), [...IDS]);
  assert.deepEqual(IDS.map(id => GEAR[id].slot), ["head", "chest", "legs", "feet", "shield", "ring", "neck"]);
  assert.deepEqual(IDS.map(id => GEAR[id].name), ["Capuz de Couro Cru", "Gibão de Couro Cru", "Calça de Couro Cru", "Botas de Couro Cru", "Luvas de Couro Cru", "Anel de Chifre", "Colar de Dente"]);
  assert.deepEqual(IDS.map(id => GEAR[id].defense), [1, 1, 0, 0, 1, 0, 0], "capuz, gibão e luvas dão 1 de defesa cada");
  for (const id of IDS) { assert.equal(gearHeroClass(id), "archer", id); assert.equal(gearSetName(id), "Couro Cru", id); assert.equal(gearLevel(id), 1, id); assert.equal("bonus" in GEAR[id], false, id + ": o conjunto inicial não dá bônus"); }
  assert.deepEqual(gearIdsFor("archer"), [...IDS]); for (const id of IDS) assert.ok(ARCHER.equipmentSlots.includes(GEAR[id].slot), id + " tem espaço");
  assert.deepEqual(gearIdsFor("mage").filter(id => (IDS as readonly string[]).includes(id)), []); assert.deepEqual(gearIdsFor("knight").filter(id => (IDS as readonly string[]).includes(id)), []);
  assert.equal(ARCHER.slotLabels.shield, "Luvas", "as luvas ocupam o espaço do escudo");
});

test("o que cada vocação veste ao nascer: o Arqueiro o Couro Cru, o Mago o Aprendiz, o Cavaleiro nada", () => {
  assert.deepEqual(ARCHER_STARTING_GEAR, { head: "leather-hood", chest: "leather-jerkin", legs: "leather-trousers", feet: "leather-boots", shield: "leather-gloves", ring: "horn-ring", neck: "tooth-necklace" });
  assert.strictEqual(startingGearFor("archer"), ARCHER_STARTING_GEAR); assert.strictEqual(startingGearFor("mage"), MAGE_STARTING_GEAR); assert.equal(startingGearFor("knight"), undefined);
  assert.deepEqual(new Inventory(undefined, 1, "archer").gear, ARCHER_STARTING_GEAR); assert.deepEqual(new Inventory(undefined, 1, "knight").gear, {}); assert.deepEqual(new Inventory(undefined, 1, "mage").gear, MAGE_STARTING_GEAR);
  assert.equal(new Inventory(undefined, 1, "archer").defense, 3); assert.equal(new Inventory(undefined, 1, "knight").defense, 0);
});

test("a vocação vale nos dois sentidos: o Arqueiro não veste peças do Cavaleiro nem do Mago, e eles não vestem o couro", () => {
  assert.deepEqual(new Inventory({ gear: { head: "trail-helm", chest: "leather-jerkin", legs: "apprentice-trousers" } }, 1, "archer").gear, { chest: "leather-jerkin" }, "só fica a peça dele");
  assert.deepEqual(new Inventory({ gear: { head: "leather-hood", chest: "apprentice-robe" } }, 1, "mage").gear, { chest: "apprentice-robe" });
  assert.deepEqual(new Inventory({ gear: { head: "leather-hood", head2: "x" } as never }, 1, "knight").gear, {});
  assert.deepEqual(gearForClass({ head: "trail-helm", legs: "leather-trousers" }, "archer"), { legs: "leather-trousers" });
  const archer = new Inventory(undefined, 1, "archer");
  assert.equal(archer.equipGear("head", "trail-helm", 99), "gear-wrong-class"); assert.equal(archer.equipGear("head", "apprentice-hat", 99), "gear-wrong-class");
  assert.equal(new Inventory(undefined, 1, "knight").equipGear("head", "leather-hood", 99), "gear-wrong-class"); assert.equal(new Inventory(undefined, 1, "mage").equipGear("head", "leather-hood", 99), "gear-wrong-class");
  assert.deepEqual(archer.gear, ARCHER_STARTING_GEAR, "as tentativas inválidas não mudaram nada");
});

test("tirar e vestir: espaço certo, o save lembra o registro vazio (quem tirou tudo não volta a nascer vestido) e a defesa acompanha", () => {
  const bag = new Inventory(undefined, 1, "archer");
  assert.equal(bag.equipGear("feet", "leather-hood", 99), "wrong-slot", "o capuz não vai nas botas"); assert.equal(bag.equipGear("head", "leather-hood", 99), "gear-unchanged");
  for (const id of IDS) assert.equal(bag.equipGear(GEAR[id].slot, null, 99), "gear-removed", id);
  assert.deepEqual(bag.gear, {}); assert.equal(bag.defense, 0);
  const snapshot = JSON.parse(JSON.stringify(bag.snapshot())) as { gear?: unknown }; assert.deepEqual(snapshot.gear, {}, "o save guarda o registro vazio");
  assert.deepEqual(new Inventory(snapshot, 1, "archer").gear, {}, "e ao recarregar continua sem nada");
  assert.deepEqual(normalizeInventory({ gear: {} }).gear, {});
  for (const junk of [[], null, "x", 3]) assert.deepEqual(new Inventory({ gear: junk }, 1, "archer").gear, ARCHER_STARTING_GEAR, "registro inválido não vale: o Arqueiro nasce vestido " + JSON.stringify(junk));
  assert.equal(bag.equipGear("chest", "leather-jerkin", 1), "gear-equipped"); assert.equal(bag.defense, 1);
  const back = new Inventory(JSON.parse(JSON.stringify(bag.snapshot())), 1, "archer"); assert.deepEqual(back.gear, { chest: "leather-jerkin" }, "o save volta como foi");
  const fresh = new Inventory(undefined, 1, "archer"); assert.deepEqual(new Inventory(JSON.parse(JSON.stringify(fresh.snapshot())), 1, "archer").gear, ARCHER_STARTING_GEAR);
});

test("no mundo: o Arqueiro tem 3 de defesa, tira e veste pelo jogo, e o Cavaleiro e o Mago continuam como eram", () => {
  const sim = new OfflineSimulation(SEED, { ...new OfflineSimulation(SEED).snapshot(), heroClass: "archer" });
  assert.deepEqual(sim.inventory.gear, ARCHER_STARTING_GEAR); assert.equal(sim.inventory.defense, 3);
  assert.deepEqual(equipGear(context(sim), "head", null), { message: INVENTORY_FEEDBACK["gear-removed"], changed: true }); assert.equal(sim.inventory.defense, 2);
  assert.deepEqual(equipGear(context(sim), "head", "leather-hood"), { message: INVENTORY_FEEDBACK["gear-equipped"], changed: true }); assert.equal(sim.inventory.defense, 3);
  assert.deepEqual(equipGear(context(sim), "head", "trail-helm"), { message: WRONG_GEAR_CLASS_MESSAGE, changed: false }, "o elmo do Cavaleiro não");
  assert.deepEqual(equipGear(context(sim), "head", "apprentice-hat"), { message: WRONG_GEAR_CLASS_MESSAGE, changed: false }, "o chapéu do Mago não");
  const knight = new OfflineSimulation(SEED); assert.deepEqual(equipGear(context(knight), "head", "leather-hood"), { message: WRONG_GEAR_CLASS_MESSAGE, changed: false });
  const mage = new OfflineSimulation(SEED, undefined, "mage"); assert.deepEqual(equipGear(context(mage), "head", "leather-hood"), { message: WRONG_GEAR_CLASS_MESSAGE, changed: false });
  const dead = new OfflineSimulation(SEED, { ...new OfflineSimulation(SEED).snapshot(), heroClass: "archer" }); dead.player.hp = 0;
  assert.equal(equipGear(context(dead), "head", null).changed, false, "herói caído não troca de roupa");
  assert.equal(new OfflineSimulation(SEED, JSON.parse(JSON.stringify(sim.snapshot()))).inventory.defense, 3, "o save do mundo volta com a defesa");
});

test("a mensagem de vocação errada fala das três vocações; o ícone de cada peça vem do componente e a tela mostra o conjunto", () => {
  assert.match(WRONG_GEAR_CLASS_MESSAGE, /Mago/); assert.match(WRONG_GEAR_CLASS_MESSAGE, /Arqueiro/); assert.match(WRONG_GEAR_CLASS_MESSAGE, /Cavaleiro/); assert.equal(INVENTORY_FEEDBACK["gear-wrong-class"], WRONG_GEAR_CLASS_MESSAGE);
  const icons = read("src/app/item-icon.component.ts"), service = read("src/app/hud.service.ts"), page = read("src/app/game-page.html");
  assert.match(icons, /\| 'archer-hood' \| 'archer-jerkin' \| 'archer-trousers' \| 'archer-boots' \| 'archer-gloves'/);
  assert.match(icons, /\.\.\.SLOT_ICONS, head: 'archer-hood', chest: 'archer-jerkin', legs: 'archer-trousers', feet: 'archer-boots', shield: 'archer-gloves',/);
  assert.match(icons, /const CLASS_SLOT_ICONS: Partial<Record<HeroClassId, Record<GearSlot, ItemIconId>>> = \{ mage: MAGE_SLOT_ICONS, archer: ARCHER_SLOT_ICONS \};/);
  for (const id of ["hood", "jerkin", "trousers", "boots", "gloves"]) assert.match(icons, new RegExp(`@case \\('archer-${id}'\\) \\{`));
  assert.match(service, /const mage = this\.heroClass\(\) !== 'knight';/); assert.match(page, /hud\.heroClass\(\) !== 'knight' \? hud\.gearSetOf\(id\) : "inicial"/);
});
