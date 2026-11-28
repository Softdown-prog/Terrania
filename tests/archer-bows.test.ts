import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Inventory, normalizeInventory } from "../src/engine/character/Inventory.ts";
import { BOWS, BOW_IDS, DEFAULT_BOW, bowUnlocked, isBowId, type BowId } from "../src/engine/character/Bows.ts";
import { DEFAULT_BOW_LOADOUT, equipBowResult, isDefaultBowLoadout, normalizeBowLoadout, sanitizeBowLoadout } from "../src/engine/character/BowLoadout.ts";
import { WEAPONS } from "../src/engine/character/Weapons.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { BOW_HALF, BOW_TIP_X, drawBow } from "../src/render/bows/bow.ts";
import { arrowHitDamage } from "../src/engine/combat/ArrowCombat.ts";
import { equipBow, type ShopContext } from "../src/game/actions/shopActions.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";
import { NO_BOWS_MESSAGE } from "../src/game/messages/classRules.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";
import { spy, usesTone } from "./helpers/spyContext.ts";

/** Os arcos do Arqueiro, lote A4a (ADR 0120): o Arco de Chifre, o Longo de Teixo e o de Osso, a troca por nível, o save e o desenho de cada um. */
const SEED = 842136;
const read = (path: string): string => readFileSync(path, "utf8");
const archer = (level: number, extra: Record<string, unknown> = {}) => new OfflineSimulation(SEED, { ...new OfflineSimulation(SEED).snapshot(), heroClass: "archer", experience: experienceForLevel(level), ...extra });
const context = (sim: OfflineSimulation, extra: Partial<ShopContext> = {}): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: false, caveHeroDown: false, ...extra });

test("os três arcos do lote: nível, dano e ritmo da espada correspondente, material e ordem do catálogo", () => {
  assert.deepEqual([...BOW_IDS], ["hunting", "horn", "yew", "bone", "ember", "thorn", "boreal", "sun", "moon", "storm", "astral"]); assert.equal(DEFAULT_BOW, "hunting");
  const rows = (["horn", "yew", "bone"] as const).map(id => [id, BOWS[id].name, BOWS[id].level, BOWS[id].damage, BOWS[id].interval, BOWS[id].windup, BOWS[id].range, BOWS[id].arrowsPerShot, BOWS[id].material]);
  assert.deepEqual(rows, [
    ["horn", "Arco de Chifre", 10, 16, 1, 0.13, 7, 1, "chifre curvo"],
    ["yew", "Arco Longo de Teixo", 15, 21, 0.98, 0.14, 7, 1, "teixo"],
    ["bone", "Arco de Osso", 20, 26, 0.95, 0.12, 7, 1, "osso polido"],
  ]);
  for (const [bow, sword] of [["horn", "forge"], ["yew", "common"], ["bone", "bronze"]] as const) assert.deepEqual([BOWS[bow].level, BOWS[bow].damage, BOWS[bow].interval], [WEAPONS[sword].level, WEAPONS[sword].damage, WEAPONS[sword].interval], `${bow} espelha a espada ${sword}`);
  const levels = BOW_IDS.map(id => BOWS[id].level); assert.deepEqual(levels, [...levels].sort((a, b) => a - b), "em ordem de nível");
  for (const id of BOW_IDS) assert.ok(BOWS[id].windup < BOWS[id].interval, `${id}: o preparo cabe entre dois tiros`);
  assert.equal(isBowId("horn"), true); assert.equal(isBowId("yew"), true); assert.equal(isBowId("bone"), true); assert.equal(isBowId("Horn"), false);
  assert.equal(bowUnlocked("horn", 9), false); assert.equal(bowUnlocked("horn", 10), true); assert.equal(bowUnlocked("yew", 14), false); assert.equal(bowUnlocked("yew", 15), true);
  assert.equal(bowUnlocked("bone", 19), false); assert.equal(bowUnlocked("bone", 20), true);
});

test("cada arco tem a sua aparência: cores próprias, comprimento e pontas viradas de cada um", () => {
  const woods = BOW_IDS.map(id => BOWS[id].visual.limb.mid); assert.equal(new Set(woods).size, BOW_IDS.length, "madeira diferente em cada um");
  const looks = BOW_IDS.map(id => JSON.stringify(BOWS[id].visual)); assert.equal(new Set(looks).size, BOW_IDS.length);
  assert.deepEqual(BOW_IDS.map(id => [BOWS[id].visual.length, BOWS[id].visual.flick]), [[1, 0], [1, 1.6], [1.2, 0], [1.06, 0.8], [1.08, 0.6], [1.12, 0.4], [1.1, 1.2], [1.1, 1], [1.08, 0.8], [1.1, 1.4], [1.15, 1]]);
  for (const id of BOW_IDS) for (const key of ["light", "mid", "dark"] as const) assert.match(BOWS[id].visual.limb[key], /^#[0-9a-f]{6}$/, `${id} ${key}`);
});

test("o save e a troca de arco: só valem ids que existem e o nível do Arqueiro; o padrão não vai para o save", () => {
  assert.deepEqual(DEFAULT_BOW_LOADOUT, { equipped: "hunting" }); assert.equal(isDefaultBowLoadout(DEFAULT_BOW_LOADOUT), true); assert.equal(isDefaultBowLoadout({ equipped: "yew" }), false);
  assert.deepEqual(sanitizeBowLoadout({ equipped: "yew" }), { equipped: "yew" });
  for (const bad of [undefined, null, 4, "yew", [], {}, { equipped: "lua" }, { equipped: 3 }]) assert.deepEqual(sanitizeBowLoadout(bad), DEFAULT_BOW_LOADOUT, JSON.stringify(bad));
  assert.deepEqual(normalizeBowLoadout({ equipped: "yew" }, 15), { equipped: "yew" });
  assert.deepEqual(normalizeBowLoadout({ equipped: "yew" }, 14), DEFAULT_BOW_LOADOUT, "um save com arco acima do nível volta ao de Caça");
  assert.deepEqual(equipBowResult(DEFAULT_BOW_LOADOUT, "horn", 10), { result: "bow-equipped", loadout: { equipped: "horn" } });
  assert.deepEqual(equipBowResult({ equipped: "horn" }, "horn", 99), { result: "bow-already-equipped", loadout: { equipped: "horn" } });
  assert.deepEqual(equipBowResult(DEFAULT_BOW_LOADOUT, "horn", 9), { result: "bow-level-too-low", loadout: DEFAULT_BOW_LOADOUT });
  for (const bad of [1.5, Number.NaN, -1]) assert.equal(equipBowResult(DEFAULT_BOW_LOADOUT, "horn", bad).result, "bow-level-too-low", String(bad));
  assert.equal(equipBowResult(DEFAULT_BOW_LOADOUT, "lua", 100).result, "bow-unknown"); assert.equal(equipBowResult(DEFAULT_BOW_LOADOUT, undefined, 100).result, "bow-unknown");
});

test("a bolsa do Arqueiro troca de arco, guarda no save só se difere do padrão e as outras vocações não têm arco", () => {
  const bag = new Inventory(undefined, 20, "archer");
  assert.equal(bag.bows.equipped, "hunting"); assert.equal("bows" in bag.snapshot(), false, "o padrão não vai para o save");
  assert.equal(bag.equipBow("bone", 20), "bow-equipped"); assert.equal(bag.bows.equipped, "bone"); assert.deepEqual(bag.snapshot().bows, { equipped: "bone" });
  assert.equal(bag.equipBow("bone", 20), "bow-already-equipped"); assert.equal(bag.equipBow("yew", 14), "bow-level-too-low"); assert.equal(bag.bows.equipped, "bone", "recusa não muda nada");
  assert.equal(new Inventory(bag.snapshot(), 20, "archer").bows.equipped, "bone", "o save volta igual");
  assert.equal(new Inventory(bag.snapshot(), 19, "archer").bows.equipped, "hunting", "abaixo do nível do arco, o de Caça");
  assert.equal(bag.equipBow("hunting", 20), "bow-equipped"); assert.equal("bows" in bag.snapshot(), false, "voltar ao de Caça tira do save");
  for (const heroClass of ["knight", "mage"] as const) {
    const other = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, bows: { equipped: "bone" } } as never, 50, heroClass);
    assert.equal(other.bows.equipped, "hunting", heroClass); assert.equal(other.equipBow("horn", 50), "bow-unknown", heroClass); assert.equal("bows" in other.snapshot(), false, heroClass);
  }
  assert.deepEqual(normalizeInventory({ gel: 0, potion: 0, questRewardClaimed: false, bows: { equipped: "horn" } }).bows, { equipped: "horn" });
  assert.equal("bows" in normalizeInventory({ gel: 1, bows: { equipped: "hunting" } }), false); assert.equal("bows" in normalizeInventory({ gel: 1, bows: { equipped: "xx" } }), false);
});

test("o mundo: o arco em mãos vem da bolsa e dá o dano, o ritmo e o alcance do combate", () => {
  const sim = archer(20);
  assert.equal(sim.equippedBow, "hunting"); assert.equal(sim.combatProfile.interval, BOWS.hunting.interval);
  sim.inventory.equipBow("bone", 20);
  assert.equal(sim.equippedBow, "bone"); assert.equal(sim.combatProfile.interval, 0.95); assert.equal(sim.combatProfile.ranged?.reach, 7 * TILE_SIZE);
  const slime = { defense: 0 } as never;
  assert.equal(arrowHitDamage("bone", "reed", slime), 26); assert.equal(arrowHitDamage("horn", "iron", slime), 19, "o arco de chifre (16) com a flecha de ferro (+3)");
  assert.equal(archer(20, { inventory: { gel: 0, potion: 0, questRewardClaimed: false, bows: { equipped: "bone" } } }).equippedBow, "bone", "o save de nível 20 volta com o arco");
  assert.equal(archer(5, { inventory: { gel: 0, potion: 0, questRewardClaimed: false, bows: { equipped: "bone" } } }).equippedBow, "hunting", "o de nível 5 não");
  assert.equal(archer(1).equippedBow, "hunting");
});

test("a troca de arco pela tela: só o Arqueiro, vivo, no nível do arco; as respostas são as da tabela de mensagens", () => {
  const sim = archer(10);
  assert.deepEqual(equipBow(context(sim), "horn"), { message: INVENTORY_FEEDBACK["bow-equipped"], changed: true }); assert.equal(sim.equippedBow, "horn");
  assert.deepEqual(equipBow(context(sim), "horn"), { message: INVENTORY_FEEDBACK["bow-already-equipped"], changed: false });
  assert.deepEqual(equipBow(context(sim), "yew"), { message: INVENTORY_FEEDBACK["bow-level-too-low"], changed: false }); assert.equal(sim.equippedBow, "horn");
  assert.deepEqual(equipBow(context(sim, { menuOpen: true, inInterior: true }), "hunting"), { message: INVENTORY_FEEDBACK["bow-equipped"], changed: true }, "vale em qualquer lugar");
  for (const heroClass of ["knight", "mage"] as const) { const other = new OfflineSimulation(SEED, { ...new OfflineSimulation(SEED).snapshot(), heroClass, experience: experienceForLevel(50) }); assert.deepEqual(equipBow(context(other), "horn"), { message: NO_BOWS_MESSAGE, changed: false }, heroClass); }
  const dead = archer(50); dead.player.hp = 0;
  assert.deepEqual(equipBow(context(dead), "horn"), { message: INVENTORY_FEEDBACK.unavailable, changed: false }); assert.equal(dead.equippedBow, "hunting", "caído não troca de arco");
  assert.match(NO_BOWS_MESSAGE, /^Arcos são para o Arqueiro/);
  assert.equal(INVENTORY_FEEDBACK["bow-unknown"], "Esse arco não existe.");
});

test("o lote 2 dos arcos (A4b): Brasa, Espinheiro e Boreal, com o nível, o dano e o ritmo das espadas de cobre, das dunas e boreal", () => {
  const rows = (["ember", "thorn", "boreal"] as const).map(id => [id, BOWS[id].name, BOWS[id].level, BOWS[id].damage, BOWS[id].interval, BOWS[id].windup, BOWS[id].range, BOWS[id].arrowsPerShot, BOWS[id].material]);
  assert.deepEqual(rows, [
    ["ember", "Arco de Brasa", 30, 38, 1.35, 0.14, 7, 1, "madeira queimada com brasas"],
    ["thorn", "Arco de Espinheiro", 45, 52, 1.15, 0.13, 7, 1, "galhos vivos com espinhos"],
    ["boreal", "Arco Boreal", 60, 68, 1.1, 0.13, 7, 1, "madeira branca e cordas de gelo"],
  ]);
  for (const [bow, sword] of [["ember", "copper"], ["thorn", "dunes"], ["boreal", "boreal"]] as const) assert.deepEqual([BOWS[bow].level, BOWS[bow].damage, BOWS[bow].interval], [WEAPONS[sword].level, WEAPONS[sword].damage, WEAPONS[sword].interval], `${bow} espelha a espada ${sword}`);
  for (const [id, level] of [["ember", 30], ["thorn", 45], ["boreal", 60]] as const) { assert.equal(bowUnlocked(id, level - 1), false, id); assert.equal(bowUnlocked(id, level), true, id); assert.equal(isBowId(id), true); }
  const bag = new Inventory(undefined, 60, "archer");
  for (const id of ["ember", "thorn", "boreal"] as const) { assert.equal(bag.equipBow(id, 60), "bow-equipped", id); assert.equal(new Inventory(bag.snapshot(), 60, "archer").bows.equipped, id, `${id} volta do save`); assert.equal(new Inventory(bag.snapshot(), BOWS[id].level - 1, "archer").bows.equipped, "hunting", `${id} abaixo do nível`); }
  const sim = archer(60); sim.inventory.equipBow("boreal", 60); assert.equal(sim.equippedBow, "boreal"); assert.equal(sim.combatProfile.interval, 1.1); assert.equal(arrowHitDamage("boreal", "iron", { defense: 0 } as never), 71);
  const icons = read("src/app/item-icon.component.ts"); for (const id of ["ember", "thorn", "boreal"]) assert.match(icons, new RegExp(`@case \\('bow-${id}'\\) \\{`));
});

test("o lote final (A4c): Solar, Lua Negra, Tempestade e Estelar completam os onze arcos, cada um com o nível, o dano e o ritmo da sua espada", () => {
  const rows = (["sun", "moon", "storm", "astral"] as const).map(id => [id, BOWS[id].name, BOWS[id].level, BOWS[id].damage, BOWS[id].interval, BOWS[id].windup, BOWS[id].range, BOWS[id].arrowsPerShot, BOWS[id].material]);
  assert.deepEqual(rows, [
    ["sun", "Arco Solar", 70, 84, 1.25, 0.14, 7, 1, "latão e feixe de luz"],
    ["moon", "Arco da Lua Negra", 80, 98, 1.3, 0.14, 7, 1, "madeira escura e corda de sombra"],
    ["storm", "Arco da Tempestade", 90, 115, 1.15, 0.13, 7, 1, "cobre e corda que faísca"],
    ["astral", "Arco Estelar", 100, 140, 1.4, 0.15, 7, 1, "liga de estrelas"],
  ]);
  assert.equal(BOW_IDS.length, 11, "os onze do plano");
  const swords = { hunting: "starter", horn: "forge", yew: "common", bone: "bronze", ember: "copper", thorn: "dunes", boreal: "boreal", sun: "obsidian", moon: "marsh", storm: "tempest", astral: "astral" } as const;
  for (const id of BOW_IDS) assert.deepEqual([BOWS[id].level, BOWS[id].damage, BOWS[id].interval], [WEAPONS[swords[id]].level, WEAPONS[swords[id]].damage, WEAPONS[swords[id]].interval], `${id} espelha a espada ${swords[id]}`);
  const bag = new Inventory(undefined, 100, "archer");
  for (const id of BOW_IDS) { assert.equal(bag.equipBow(id, 100), id === "hunting" ? "bow-already-equipped" : "bow-equipped", id); assert.equal(new Inventory(bag.snapshot(), 100, "archer").bows.equipped, id); }
  assert.equal(new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, bows: { equipped: "astral" } }, 99, "archer").bows.equipped, "hunting", "o Estelar só no nível 100");
  const sim = archer(100); sim.inventory.equipBow("astral", 100); assert.equal(sim.equippedBow, "astral"); assert.equal(sim.combatProfile.interval, 1.4); assert.equal(arrowHitDamage("astral", "iron", { defense: 0 } as never), 143);
  const icons = read("src/app/item-icon.component.ts"); for (const id of ["sun", "moon", "storm", "astral"]) assert.match(icons, new RegExp(`@case \\('bow-${id}'\\) \\{`));
  assert.match(read("src/app/game-page.html"), /' · coleção completa'/);
});

type Move = { x: number; y: number };
/** As pontas do arco desenhado: os pontos onde o contorno da madeira começa (moveTo) e termina. */
const tips = (bow: BowId): { top: Move; bottom: Move } => {
  const s = spy(c => drawBow(c, bow, 0, t => t)), moves = s.args.moveTo!.map(([x, y]) => ({ x: x!, y: y! }));
  return { top: moves[0]!, bottom: moves.slice().sort((a, b) => b.y - a.y)[0]! };
};
test("o arco desenhado usa as cores do próprio arco, o longo é mais alto e as pontas viradas saem para a frente", () => {
  for (const id of BOW_IDS) {
    const s = spy(c => drawBow(c, id, 0, t => t)), v = BOWS[id].visual;
    for (const tone of [v.limb.mid, v.limb.dark, v.string, v.wrap, v.wrapDark, v.tip, v.charm]) assert.ok(usesTone(s, tone) || s.raw.some(c => c.toLowerCase().includes(tone.slice(1))), `${id} ${tone}`);
  }
  const hunting = tips("hunting"), yew = tips("yew"), horn = tips("horn"), bone = tips("bone");
  assert.equal(hunting.top.y, -BOW_HALF); assert.equal(yew.top.y, -BOW_HALF * 1.2); assert.ok(Math.abs(bone.top.y + BOW_HALF * 1.06) < 1e-9); assert.equal(horn.top.y, -BOW_HALF);
  assert.equal(hunting.top.x, BOW_TIP_X); assert.equal(yew.top.x, BOW_TIP_X); assert.ok(Math.abs(horn.top.x - (BOW_TIP_X + 1.6)) < 1e-9, "a ponta do chifre vira 1,6 px para a frente");
  assert.ok(Math.abs(bone.top.x - (BOW_TIP_X + 0.8)) < 1e-9);
  const drawn = spy(c => drawBow(c, "horn", 1, t => t)).args.moveTo!.map(([x]) => x!);
  assert.ok(drawn.includes(BOW_TIP_X - 1.1 + 1.6), "puxado, a ponta cede 1,1 px e mantém o coice");
  // em repouso a corda é reta de ponta a ponta (mesmo x nas duas pontas e no meio), mesmo nos arcos de pontas viradas
  for (const id of BOW_IDS) { const lines = spy(c => drawBow(c, id, 0, t => t)).args.lineTo!, string = lines.slice(-0).find(([, y]) => y === 0)!; assert.ok(Math.abs(string[0]! - (BOW_TIP_X + BOWS[id].visual.flick)) < 1e-9, `${id}: a corda parada passa pelo x das pontas`); }
});

test("a ligação: o jogo troca o arco, o HUD guarda a lista e o inventário mostra um botão por arco com o ícone dele", () => {
  const game = read("src/game/Game.ts"), service = read("src/app/hud.service.ts"), page = read("src/app/game-page.html"), ui = read("src/ui/GameUi.ts"), icons = read("src/app/item-icon.component.ts");
  assert.match(game, /this\.hud\.onBowEquip\(bow => this\.shop\(context => equipBow\(context, bow\)\)\);/);
  assert.match(ui, /onBowEquip\(callback: \(bow: BowId\) => string\): void;/);
  assert.match(service, /equipBow\(bow: BowId\): void \{ this\.inventoryFeedback\.set\(this\.bowEquipCallback\(bow\)\); \}/);
  assert.match(service, /status: id === this\.bow\(\) \? 'equipped' as const : bowUnlocked\(id, level\) \? 'available' as const : 'locked' as const/);
  assert.match(page, /@for \(row of hud\.bowRows\(\); track row\.id\) \{/); assert.match(page, /\[attr\.id\]="'equip-slot-bow-' \+ row\.id"/);
  assert.match(page, /\[disabled\]="row\.status !== 'available'"\s*\n\s*\(click\)="hud\.equipBow\(row\.id\)"/);
  assert.match(page, /Arcos do arqueiro · \{\{ hud\.bowIds\.length \}\} de 11\{\{ hud\.bowIds\.length < 11 \? ' · os outros chegam nos próximos lotes' : ' · coleção completa' \}\}/);
  for (const id of ["horn", "yew", "bone"]) { assert.match(icons, new RegExp(`\\| 'bow-${id}'`)); assert.match(icons, new RegExp(`@case \\('bow-${id}'\\) \\{`)); }
});
