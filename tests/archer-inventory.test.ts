import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { ARCHER, KNIGHT, MAGE, HERO_CLASS_IDS, heroClassSheet } from "../src/engine/character/classes/index.ts";
import { buyStaff, buySword, equipStaff, equipWeapon } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { npcOffer } from "../src/game/interactions.ts";
import { NO_STAVES_MESSAGE, NO_SWORDS_MESSAGE } from "../src/game/messages/classRules.ts";
import { BOW_IDS } from "../src/engine/character/Bows.ts";

/** O Arqueiro no inventário e nas lojas (ADR 0113, lote A1c-3): cada vocação tem o seu tipo de arma e o resto do jogo (lojas, painéis, ícones) segue esse tipo, não "quem não usa espada é o Mago". */
const SEED = 842136;
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);
const read = (path: string): string => readFileSync(path, "utf8");

test("o tipo de arma de cada vocação: espada, cajado, arco", () => {
  assert.deepEqual(HERO_CLASS_IDS.map(id => heroClassSheet(id).weapon), ["sword", "staff", "bow"]);
  assert.deepEqual([KNIGHT.weapon, MAGE.weapon, ARCHER.weapon], ["sword", "staff", "bow"]);
  for (const id of HERO_CLASS_IDS) assert.equal(heroClassSheet(id).usesSwords, heroClassSheet(id).weapon === "sword", "só o tipo espada usa espadas: " + id);
});

test("o Arqueiro não compra nem equipa espada nem cajado (e a Academia e o ferreiro não lhe oferecem nada); o Mago e o Cavaleiro seguem como antes", () => {
  const archer = new OfflineSimulation(SEED, undefined, "archer"), before = JSON.stringify(archer.snapshot());
  assert.deepEqual(buySword(context(archer)), { message: NO_SWORDS_MESSAGE, changed: false });
  assert.deepEqual(equipWeapon(context(archer), "starter"), { message: NO_SWORDS_MESSAGE, changed: false });
  assert.deepEqual(buyStaff(context(archer), "breeze"), { message: NO_STAVES_MESSAGE, changed: false });
  assert.deepEqual(equipStaff(context(archer), "apprentice"), { message: NO_STAVES_MESSAGE, changed: false });
  assert.equal(JSON.stringify(archer.snapshot()), before, "nada mudou no mundo do Arqueiro");
  assert.equal(npcOffer("toren", "archer"), undefined, "o ferreiro não vende espada ao Arqueiro");
  assert.equal(npcOffer("capital-mestra-arcana", "archer"), undefined, "nem a Mestra da Academia lhe oferece o Cajado da Brisa");
  assert.equal(npcOffer("capital-mestra-arcana", "mage")?.item, "academy", "ao Mago ela oferece"); assert.equal(npcOffer("capital-mestra-arcana", "knight"), undefined);
  assert.equal(npcOffer("toren", "knight")?.item, "sword"); assert.equal(npcOffer("toren", "mage"), undefined);
  const mage = new OfflineSimulation(SEED, undefined, "mage"); assert.deepEqual(buySword(context(mage)), { message: NO_SWORDS_MESSAGE, changed: false });
  const knight = new OfflineSimulation(SEED); assert.deepEqual(buyStaff(context(knight), "breeze"), { message: NO_STAVES_MESSAGE, changed: false });
});

test("as mensagens de recusa dizem de quem é cada arma e o que as outras vocações usam", () => {
  assert.equal(NO_SWORDS_MESSAGE, "Espadas são para o Cavaleiro: o Mago luta com cajado e o Arqueiro, com arco.");
  assert.equal(NO_STAVES_MESSAGE, "Cajados são para o Mago: o Cavaleiro luta com espadas e o Arqueiro, com arco.");
});

test("o ícone do arco: um por arco (`bow-<id>`), com o desenho no componente; as flechas usam o ícone de flechas", () => {
  const icons = read("src/app/item-icon.component.ts");
  for (const id of BOW_IDS) { assert.match(icons, new RegExp(`'bow-${id}'`)); assert.match(icons, new RegExp(`@case \\('bow-${id}'\\) \\{`)); }
  assert.match(icons, /export function bowItemIcon\(bow: BowId\): ItemIconId \{\s*return `bow-\$\{bow\}`;\s*\}/);
  assert.deepEqual(BOW_IDS.map(id => `bow-${id}`), ["bow-hunting", "bow-horn", "bow-yew", "bow-bone", "bow-ember", "bow-thorn", "bow-boreal", "bow-sun", "bow-moon", "bow-storm", "bow-astral"], "todo arco do catálogo tem o ícone com o nome previsto");
  assert.match(icons, /ammo: 'arrows'/);
});

test("a fiação: o HUD decide por tipo de arma, guarda o arco e a aljava, e o jogo os entrega; a tela tem o painel do arco e o da aljava", () => {
  const hud = read("src/app/hud.service.ts"), page = read("src/app/game-page.html"), game = read("src/game/Game.ts"), ui = read("src/ui/GameUi.ts");
  assert.match(hud, /readonly weaponKind = computed\(\(\) => HERO_CLASSES\[this\.heroClass\(\)\]\.weapon\);/);
  assert.match(hud, /readonly bow = signal<BowId>\(DEFAULT_BOW\);/); assert.match(hud, /readonly quiver = signal<Quiver>\(EMPTY_QUIVER\);/);
  assert.match(hud, /if \(slot === 'weapon' && this\.weaponKind\(\) === 'bow'\) return bowItemIcon\(this\.bow\(\)\);/);
  assert.match(hud, /if \(slot === 'weapon' && this\.weaponKind\(\) === 'bow'\) return BOWS\[this\.bow\(\)\]\.name;/);
  assert.match(hud, /if \(slot === 'ammo' && this\.weaponKind\(\) === 'bow'\) return this\.arrowTotal\(\) > 0 \? ARROWS\[this\.quiver\(\)\.equipped\]\.name \+ ' × ' \+ this\.arrowCount\(this\.quiver\(\)\.equipped\) : '';/);
  assert.match(hud, /updateQuiver\(quiver: Quiver\): void \{ this\.quiver\.set\(quiver\); \}/);
  assert.match(hud, /this\.staff\.set\(hero\.equippedStaff\); this\.bow\.set\(hero\.equippedBow\);/);
  assert.match(game, /equippedBow: this\.sim\.equippedBow,/); assert.match(game, /this\.hud\.updateQuiver\(inventory\.quiver\);/);
  assert.match(ui, /readonly equippedBow: BowId;/); assert.match(ui, /updateQuiver\(quiver: Quiver\): void;/);
  assert.match(page, /@if \(hud\.selectedSlot\(\) === 'weapon' && hud\.weaponKind\(\) === 'bow'\) \{/);
  assert.match(page, /@else if \(hud\.selectedSlot\(\) === 'ammo' && hud\.weaponKind\(\) === 'bow'\) \{/);
  assert.match(page, /@else if \(hud\.selectedSlot\(\) === 'weapon' && hud\.weaponKind\(\) === 'staff'\) \{/);
  assert.match(page, /hud\.visibleEquipmentSlots\(\)\.length === 9 \? 'Nove'/);
  assert.equal((page.match(/!hud\.usesSwords\(\)/g) ?? []).length, 0, "nenhum painel decide mais por 'não usa espada'");
});
