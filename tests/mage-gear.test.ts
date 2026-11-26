import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Inventory, normalizeInventory } from "../src/engine/character/Inventory.ts";
import { GEAR, MAGE_STARTING_GEAR, gearForClass, gearHeroClass, gearIdsFor, type GearId } from "../src/engine/character/Equipment.ts";
import { APPRENTICE_GEAR } from "../src/engine/character/mage/gear/apprentice.ts";
import { MAGE } from "../src/engine/character/classes/index.ts";
import { equipGear } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { WRONG_GEAR_CLASS_MESSAGE } from "../src/game/messages/classRules.ts";
import { renderHero } from "../src/render/actors.ts";
import { MAGE_PAL, mageWear } from "../src/render/hero/mage/index.ts";
import { APPRENTICE_LEGWEAR } from "../src/render/hero/mage/gear/legwear.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/**
 * As roupas do Mago, lote A1 (ADR 0078): o conjunto do Aprendiz (sete peças) que o Mago veste ao nascer, a regra de vocação (peças do Mago só no Mago,
 * o kit do Cavaleiro só no Cavaleiro), o save (quem tirou tudo não volta a nascer vestido) e o desenho de cada peça no corpo do Mago.
 */
const SEED = 842136;
const read = (path: string): string => readFileSync(path, "utf8");
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);
const IDS = ["apprentice-hat", "apprentice-robe", "apprentice-trousers", "apprentice-boots", "apprentice-notebook", "brass-ring", "dull-crystal-pendant"] as const;

test("o conjunto do Aprendiz: sete peças, uma por espaço, só do Mago, com a defesa e os nomes da lista", () => {
  assert.deepEqual(Object.keys(APPRENTICE_GEAR), [...IDS]);
  assert.deepEqual(IDS.map(id => GEAR[id].slot), ["head", "chest", "legs", "feet", "shield", "ring", "neck"]);
  assert.deepEqual(IDS.map(id => GEAR[id].name), ["Chapéu de Aprendiz", "Túnica de Aprendiz", "Calça de Aprendiz", "Botas de Aprendiz", "Caderno de Feitiços", "Anel de Latão", "Pingente de Cristal Baço"]);
  assert.deepEqual(IDS.map(id => GEAR[id].defense), [0, 1, 0, 0, 0, 0, 0], "só a túnica dá defesa (1)");
  for (const id of IDS) assert.equal(gearHeroClass(id), "mage", id);
  assert.deepEqual(gearIdsFor("mage").filter(id => GEAR[id].set === "Aprendiz"), [...IDS]); assert.equal(gearIdsFor("knight").length, 9, "o kit do Cavaleiro continua com as nove peças");
  assert.equal(gearIdsFor("knight").some(id => gearHeroClass(id) !== "knight"), false); for (const id of gearIdsFor("knight")) assert.equal(gearHeroClass(id), "knight", id);
  assert.deepEqual(MAGE_STARTING_GEAR, { head: "apprentice-hat", chest: "apprentice-robe", legs: "apprentice-trousers", feet: "apprentice-boots", shield: "apprentice-notebook", ring: "brass-ring", neck: "dull-crystal-pendant" });
  const doc = read("docs/MAGO_ROUPAS.md"); for (const id of IDS) assert.ok(doc.includes(GEAR[id].name), "o documento lista " + GEAR[id].name);
});

test("a ficha do Mago: oito espaços (o cajado e as sete roupas, sem mochila nem flechas) e os nomes dele; o Cavaleiro continua com os dez", () => {
  assert.equal(MAGE.wearsArmor, true); assert.equal(MAGE.equipmentSlots.length, 8); assert.equal(new Set(MAGE.equipmentSlots).size, 8);
  assert.equal(MAGE.equipmentSlots.includes("backpack"), false); assert.equal(MAGE.equipmentSlots.includes("ammo"), false);
  for (const slot of MAGE.equipmentSlots) assert.equal(typeof MAGE.slotLabels[slot], "string", slot);
  for (const id of IDS) assert.ok(MAGE.equipmentSlots.includes(GEAR[id].slot), id + " tem espaço");
});

test("o Mago nasce vestido com o conjunto do Aprendiz; o Cavaleiro nasce sem nada; peças da outra vocação não são vestidas", () => {
  assert.deepEqual(new Inventory(undefined, 1, "mage").gear, MAGE_STARTING_GEAR); assert.deepEqual(new Inventory(undefined, 1, "knight").gear, {}); assert.deepEqual(new Inventory().gear, {}, "sem vocação, é o Cavaleiro");
  assert.equal(new Inventory(undefined, 1, "mage").defense, 1); assert.equal(new Inventory(undefined, 1, "knight").defense, 0);
  assert.deepEqual(new Inventory({ gear: { head: "trail-helm", chest: "apprentice-robe" } }, 1, "mage").gear, { chest: "apprentice-robe" }, "o Mago não veste o elmo do Cavaleiro, mas fica com a túnica");
  assert.deepEqual(new Inventory({ gear: { head: "trail-helm", chest: "apprentice-robe" } }, 1, "knight").gear, { head: "trail-helm" }, "o Cavaleiro não veste a túnica do Mago");
  assert.deepEqual(gearForClass({ head: "trail-helm", legs: "apprentice-trousers" }, "mage"), { legs: "apprentice-trousers" });
  const bad = new Inventory({ gear: { head: "apprentice-hat" } }, 1, "mage"); assert.deepEqual(bad.gear, { head: "apprentice-hat" }, "um save com uma peça só veste só ela (o resto foi tirado de propósito)");
});

test("equipar e tirar peças: só da vocação, só no espaço certo; quem tirou tudo não volta a nascer vestido (o save lembra o registro vazio)", () => {
  const mage = new Inventory(undefined, 1, "mage"), knight = new Inventory(undefined, 1, "knight");
  assert.equal(mage.equipGear("head", "trail-helm", 99), "gear-wrong-class"); assert.equal(knight.equipGear("head", "apprentice-hat", 99), "gear-wrong-class");
  assert.equal(mage.equipGear("feet", "apprentice-hat", 99), "wrong-slot", "o chapéu não vai nas botas"); assert.equal(mage.equipGear("head", "apprentice-hat", 99), "gear-unchanged");
  assert.deepEqual(mage.gear, MAGE_STARTING_GEAR, "as tentativas inválidas não mudaram nada"); assert.deepEqual(knight.gear, {});
  for (const id of IDS) assert.equal(mage.equipGear(GEAR[id].slot, null, 99), "gear-removed", id);
  assert.deepEqual(mage.gear, {}); assert.equal(mage.defense, 0);
  const snapshot = JSON.parse(JSON.stringify(mage.snapshot())) as { gear?: unknown }; assert.deepEqual(snapshot.gear, {}, "o save do Mago guarda o registro vazio");
  assert.deepEqual(new Inventory(snapshot, 1, "mage").gear, {}, "e ao recarregar ele continua sem nada vestido");
  assert.deepEqual(normalizeInventory({ gear: {} }).gear, {}, "a normalização mantém o registro vazio");
  assert.equal("gear" in normalizeInventory({ gel: 1 }), false, "sem registro, sem campo");
  for (const junk of [[], null, "x", 3, [["head", "apprentice-hat"]]]) { assert.equal("gear" in normalizeInventory({ gear: junk }), false, "registro inválido não vira registro: " + JSON.stringify(junk)); assert.deepEqual(new Inventory({ gear: junk }, 1, "mage").gear, MAGE_STARTING_GEAR, "e o Mago nasce vestido: " + JSON.stringify(junk)); }
  assert.equal("gear" in new Inventory(undefined, 1, "knight").snapshot(), false, "o save do Cavaleiro sem nada vestido continua sem o campo");
  assert.equal("gear" in new Inventory(JSON.parse(JSON.stringify(new Inventory(undefined, 1, "mage").snapshot())), 1, "mage").snapshot(), true);
  assert.equal(mage.equipGear("chest", "apprentice-robe", 1), "gear-equipped"); assert.equal(mage.defense, 1);
});

test("no mundo: o Mago tem 1 de defesa, tira e veste pelo jogo, o save volta como foi e um save antigo (sem registro) nasce vestido; o Cavaleiro não muda", () => {
  const sim = new OfflineSimulation(SEED, undefined, "mage");
  assert.deepEqual(sim.inventory.gear, MAGE_STARTING_GEAR); assert.equal(sim.inventory.defense, 1);
  assert.deepEqual(equipGear(context(sim), "head", null), { message: "Item guardado na bolsa.", changed: true }); assert.equal(sim.inventory.gear.head, undefined);
  assert.equal(equipGear(context(sim), "head", "apprentice-hat").changed, true);
  for (const id of ["trail-helm", "willow-shield"] as const) assert.deepEqual(equipGear(context(sim), GEAR[id].slot, id), { message: WRONG_GEAR_CLASS_MESSAGE, changed: false }, id);
  equipGear(context(sim), "shield", null); equipGear(context(sim), "ring", null);
  const reopened = new OfflineSimulation(SEED, JSON.parse(JSON.stringify(sim.snapshot())));
  assert.deepEqual(reopened.inventory.gear, { head: "apprentice-hat", chest: "apprentice-robe", legs: "apprentice-trousers", feet: "apprentice-boots", neck: "dull-crystal-pendant" }, "o que foi tirado continua tirado");
  const { inventory: _skip, ...rest } = new OfflineSimulation(SEED, undefined, "mage").snapshot();
  const old = new OfflineSimulation(SEED, { ...rest, inventory: { gel: 3, potion: 0, questRewardClaimed: false } } as never);
  assert.deepEqual(old.inventory.gear, MAGE_STARTING_GEAR, "um Mago de antes das roupas (sem registro) nasce com o conjunto do Aprendiz");
  const knight = new OfflineSimulation(SEED); assert.deepEqual(knight.inventory.gear, {}); assert.equal(knight.inventory.defense, 0);
  assert.equal("gear" in (knight.snapshot().inventory ?? {}), false);
});

test("o desenho: cada peça do Aprendiz aparece quando vestida e some quando tirada, cada uma muda o desenho, e o kit do Cavaleiro não veste o Mago", () => {
  const visual = (gear?: Record<string, string>) => (c: CanvasRenderingContext2D) => renderHero(c, { faceX: 0, faceY: 1, walkTime: 0.3, attackTime: 0, vx: 0, vy: 0, id: "m", heroClass: "mage", equippedStaff: "apprentice", ...(gear ? { gear } : {}) } as never, 3, 4, 1.2);
  const without = (slot: string): Record<string, string> => { const gear: Record<string, string> = { ...MAGE_STARTING_GEAR } as Record<string, string>; delete gear[slot]; return gear; };
  const full = signature(visual(MAGE_STARTING_GEAR as Record<string, string>));
  assert.equal(signature(visual()), full, "sem registro de equipamento, o Mago aparece com o conjunto inteiro");
  const sigs = new Set([full]);
  for (const slot of ["head", "chest", "legs", "feet", "shield", "ring", "neck"]) { const s = signature(visual(without(slot))); assert.notEqual(s, full, `tirar ${slot} muda o desenho`); sigs.add(s); }
  sigs.add(signature(visual({}))); assert.equal(sigs.size, 9, "cada combinação é um desenho diferente");
  assert.equal(signature(visual({ head: "trail-helm", chest: "quilted-vest", shield: "willow-shield" })), signature(visual({})), "o kit do Cavaleiro não veste o Mago (e não desenha nada dele)");
  const tone = (s: ReturnType<typeof spy>, hex: string): boolean => s.raw.some(c => c.toLowerCase() === hex.toLowerCase());
  const on = spy(visual(MAGE_STARTING_GEAR as Record<string, string>)), off = spy(visual({}));
  for (const [what, hex] of [["calça", APPRENTICE_LEGWEAR.pants], ["botas", APPRENTICE_LEGWEAR.boots], ["borda das botas", APPRENTICE_LEGWEAR.bootsLight], ["páginas do livro", "#f1efe0"], ["fita do livro", "#b4435a"], ["latão do anel", "#c9a24e"], ["cristal do pingente", "#8aa3b8"], ["chapéu", MAGE_PAL.hat.dark], ["brilho do chapéu", "#b4aef2"], ["manto da túnica", MAGE_PAL.cloak.mid]] as const) {
    assert.equal(tone(on, hex), true, `vestido: ${what}`); assert.equal(tone(off, hex), false, `sem nada: ${what} não aparece`);
  }
});

test("mageWear: a calça, as botas, o livro, o anel e o colar só valem com a peça certa no espaço certo", () => {
  const full = mageWear(undefined); assert.deepEqual([full.legwear.pants, full.legwear.boots, full.book?.id, full.ring?.id, full.pendant?.id], [APPRENTICE_LEGWEAR.pants, APPRENTICE_LEGWEAR.boots, "apprentice", "apprentice", "apprentice"]);
  const none = mageWear({}); assert.deepEqual([none.legwear.pants, none.legwear.boots, none.legwear.bootsLight, none.book, none.ring, none.pendant], [null, null, null, null, null, null]);
  const wrong = mageWear({ legs: "travel-trousers", feet: "trail-boots", shield: "willow-shield", ring: "copper-ring", neck: "river-pendant" }); assert.deepEqual([wrong.legwear.pants, wrong.legwear.boots, wrong.book, wrong.ring, wrong.pendant], [null, null, null, null, null]);
  assert.notStrictEqual(mageWear({}).look, mageWear(undefined).look); assert.strictEqual(mageWear({}).look, mageWear({ head: "trail-helm" }).look, "o look é reaproveitado entre quadros");
});

test("a ligação do HUD e da tela: espaços, nomes e peças da vocação, ícones do Mago e o painel de oito espaços", () => {
  const service = read("src/app/hud.service.ts"), page = read("src/app/game-page.html"), css = read("src/app/styles/inventory.css"), icons = read("src/app/item-icon.component.ts");
  assert.match(service, /for \(const id of this\.kitIds\(\)\) \{/, "a mochila lista as peças da vocação"); assert.match(service, /'Conjunto ' \+ \(mage \? gearSetName\(id\) : 'inicial'\) \+ ' · '/);
  assert.match(service, /icon: gearItemIcon\(item\.slot, this\.heroClass\(\)\),/); assert.match(service, /readonly selectedGearOptions = computed\(\(\) => this\.kitIds\(\)\.filter/);
  assert.match(page, /\[class\.mage-grid\]="hud\.heroClass\(\) === 'mage'"/); assert.match(page, /hud\.gearSetOf\(id\)/);
  for (const slot of ["head", "neck", "chest", "legs", "ring", "weapon", "shield", "feet"]) assert.match(css, new RegExp(`mage-grid \\.equipment-slot\\[data-equipment-slot="${slot}"\\]`), slot);
  for (const id of ["mage-hat", "mage-robe", "mage-trousers", "mage-boots", "mage-book"]) { assert.ok(icons.includes(`'${id}'`), id + " no tipo"); assert.ok(icons.includes(`@case ('${id}')`), id + " tem o desenho"); }
  assert.match(icons, /head: 'mage-hat', chest: 'mage-robe', legs: 'mage-trousers', feet: 'mage-boots', shield: 'mage-book'/);
  assert.match(read("server/src/db/catalog.ts"), /filter\(\(\[id\]\)=>gearHeroClass\(id as GearId\)==='knight'\)/, "o catálogo do mercado segue só com o kit do Cavaleiro");
});

test("o registro de arte conhece as peças novas do Mago", () => {
  const assets = read("tests/helpers/artAssets.ts");
  for (const fn of ["drawMageBook", "drawMageRing", "drawMagePendant"]) assert.ok(assets.includes(`fn: "${fn}"`), fn);
  void ({} as GearId);
});
