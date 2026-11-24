import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { HERO_CLASS_IDS, KNIGHT, MAGE, heroClassSheet } from "../src/engine/character/classes/index.ts";
import { GEAR } from "../src/engine/character/Equipment.ts";
import { FORGE_SWORD_PRICE } from "../src/engine/character/Weapons.ts";
import { STAVES } from "../src/engine/character/Staves.ts";
import { buySword, equipGear, equipWeapon } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { npcOffer } from "../src/game/interactions.ts";
import { NO_ARMOR_MESSAGE, NO_SWORDS_MESSAGE } from "../src/game/messages/classRules.ts";
import { HERO_CLASS_INTRO } from "../src/game/messages/classIntro.ts";

/**
 * O Mago jogável (ADR 0072): o que é de cada vocação. O Cavaleiro luta com espadas e veste armadura; o Mago luta com o cajado de Aprendiz e
 * ainda não veste armadura. O ferreiro não vende espada ao Mago, e o inventário do Mago mostra o cajado, não as espadas nem os dez espaços.
 */
const SEED = 842136;
const read = (path: string): string => readFileSync(path, "utf8");
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);

test("as fichas: o que cada vocação usa", () => {
  assert.deepEqual([KNIGHT.usesSwords, KNIGHT.wearsArmor, KNIGHT.playable], [true, true, true]);
  assert.deepEqual([MAGE.usesSwords, MAGE.wearsArmor, MAGE.playable], [false, false, true]);
  for (const id of HERO_CLASS_IDS) assert.equal(typeof heroClassSheet(id).usesSwords, "boolean");
});

test("o ferreiro só vende espada a quem luta com espada; os outros moradores atendem os dois", () => {
  assert.deepEqual(npcOffer("toren"), { item: "sword", price: FORGE_SWORD_PRICE }, "sem a vocação, é o Cavaleiro de sempre");
  assert.deepEqual(npcOffer("toren", "knight"), { item: "sword", price: FORGE_SWORD_PRICE });
  assert.equal(npcOffer("toren", "mage"), undefined, "o Mago não compra espada");
  for (const id of ["lina", "stablemaster", "south-madame", "south-zinha"]) assert.deepEqual(npcOffer(id, "mage"), npcOffer(id, "knight"), id);
});

test("o Mago não compra nem equipa espada e não veste armadura; o Cavaleiro continua como sempre", () => {
  const mage = new OfflineSimulation(SEED, undefined, "mage"), before = JSON.stringify(mage.snapshot());
  assert.deepEqual(buySword(context(mage)), { message: NO_SWORDS_MESSAGE, changed: false });
  assert.deepEqual(equipWeapon(context(mage), "forge"), { message: NO_SWORDS_MESSAGE, changed: false });
  assert.deepEqual(equipWeapon(context(mage), "starter"), { message: NO_SWORDS_MESSAGE, changed: false });
  for (const id of Object.keys(GEAR) as Array<keyof typeof GEAR>) assert.deepEqual(equipGear(context(mage), GEAR[id].slot, id), { message: NO_ARMOR_MESSAGE, changed: false }, id);
  assert.equal(JSON.stringify(mage.snapshot()), before, "nada mudou no mundo do Mago");
  assert.equal(mage.inventory.defense, 0, "sem armadura, sem defesa");
  const nothing = equipGear(context(mage), "head", null);
  assert.equal(nothing.changed, false); assert.notEqual(nothing.message, NO_ARMOR_MESSAGE, "tirar o que não está vestido não é o aviso de armadura");
  const knight = new OfflineSimulation(SEED);
  const result = equipGear(context(knight), "head", "trail-helm");
  assert.equal(result.changed, true, "o Cavaleiro veste o elmo"); assert.equal(knight.inventory.gear.head, "trail-helm"); assert.ok(knight.inventory.defense > 0);
  assert.equal(equipWeapon(context(knight), "starter").message === NO_SWORDS_MESSAGE, false, "e continua usando espadas");
});

test("as mensagens de vocação explicam o motivo", () => {
  assert.match(NO_SWORDS_MESSAGE, /Mago/); assert.match(NO_SWORDS_MESSAGE, /cajado/); assert.match(NO_ARMOR_MESSAGE, /armadura/);
  assert.match(HERO_CLASS_INTRO.mage.traits.join(" "), /Aprendiz/, "a tela de escolha não promete cajados que ainda não existem");
  assert.equal(/11 níveis/.test(HERO_CLASS_INTRO.mage.traits.join(" ")), false);
});

test("o ícone do cajado existe e a tela usa o do cajado em mãos", () => {
  const svg = read("src/app/item-icon.component.ts");
  assert.match(svg, /export function staffItemIcon\(staff: StaffId\): ItemIconId \{\s*\n\s*return `staff-\$\{staff\}`;/, "cada cajado tem o ícone staff-<id>");
  assert.match(svg, /return slot === 'weapon' \? weaponItemIcon\(weapon\) : SLOT_ICONS\[slot\];/, "as espadas continuam como eram");
  assert.match(svg, /@case \('staff-apprentice'\) \{/, "o ícone é desenhado");
  assert.match(svg, /\| 'staff-apprentice'/);
  assert.ok(STAVES.apprentice.name.length > 3);
});

test("a ligação: o jogo diz a vocação ao HUD, que esconde espadas e armadura do Mago e mostra o cajado", () => {
  const game = read("src/game/Game.ts"), service = read("src/app/hud.service.ts"), page = read("src/app/game-page.html"), component = read("src/app/game-page.component.ts");
  const interior = read("src/game/modes/interiorMode.ts"), css = read("src/app/styles/inventory.css");
  assert.match(game, /heroClass: this\.sim\.heroClass,\s*\n\s*equippedStaff: this\.sim\.equippedStaff,/, "o jogo manda a vocação e o cajado");
  assert.match(game, /const offer = npcOffer\(npc\.id, this\.sim\.heroClass\);/, "o ferreiro conhece a vocação");
  assert.match(service, /this\.heroClass\.set\(hero\.heroClass\); this\.staff\.set\(hero\.equippedStaff\);/);
  assert.match(service, /readonly visibleEquipmentSlots = computed\(\(\) => this\.wearsArmor\(\) \? EQUIPMENT_SLOTS : EQUIPMENT_SLOTS\.filter\(slot => slot\.id === 'weapon'\)\);/, "o Mago só tem o espaço do cajado");
  assert.match(service, /if \(gear !== null && this\.wearsArmor\(\)\) \{/, "a mochila do Mago não lista armadura");
  assert.match(service, /if \(loadout && this\.usesSwords\(\)\) \{/, "nem espadas");
  assert.match(service, /if \(slot === 'weapon' && !this\.usesSwords\(\)\) return this\.staffIcon\(\);/);
  assert.match(service, /if \(slot === 'weapon' && !this\.usesSwords\(\)\) return STAVES\[this\.staff\(\)\]\.name;/);
  assert.match(service, /if \(slot === 'weapon' && !this\.usesSwords\(\)\) return 'Cajado';/);
  assert.match(page, /<h1 id="inventoryTitle">Inventário do \{\{ hud\.heroName\(\) \}\}<\/h1>/);
  assert.match(page, /@for \(slot of hud\.visibleEquipmentSlots\(\); track slot\.id\)/);
  assert.match(page, /\[class\.single-slot\]="!hud\.wearsArmor\(\)"/);
  assert.match(page, /SEU \{\{ hud\.heroName\(\)\.toUpperCase\(\) \}\}/);
  assert.match(page, /@if \(hud\.selectedSlot\(\) === 'weapon' && !hud\.usesSwords\(\)\) \{/, "o Mago vê o cajado onde o Cavaleiro vê as espadas");
  assert.match(page, /@if \(hud\.wearsArmor\(\) && hud\.gear\(\) !== null\) \{ <span>Defesa/, "o Mago não mostra defesa");
  assert.match(page, /\{\{ staff\.level > 0 \? "Nível " \+ staff\.level : "Inicial" \}\} · \{\{ staff\.damage \}\} dano/, "o cajado inicial é \"Inicial\", não \"Nível 0\"");
  assert.match(component, /gear: this\.hud\.wearsArmor\(\) \? this\.hud\.gear\(\) \?\? undefined : undefined,\s*\n\s*heroClass: this\.hud\.heroClass\(\), equippedStaff: this\.hud\.staff\(\),/, "a prévia desenha o herói de verdade");
  assert.match(interior, /\{ heroClass: host\.sim\.heroClass, equippedStaff: host\.sim\.equippedStaff \}\);/, "dentro das casas o Mago aparece como Mago");
  assert.match(css, /\.equipment-grid\.single-slot \.hero-preview \{ grid-area: 1 \/ 2 \/ span 1 \/ span 2; \}/);
});
