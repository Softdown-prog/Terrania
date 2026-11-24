import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { Inventory, normalizeInventory } from "../src/engine/character/Inventory.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { MAGE } from "../src/engine/character/classes/index.ts";
import { DEFAULT_STAFF_LOADOUT, isDefaultStaffLoadout, normalizeStaffLoadout, sanitizeStaffLoadout } from "../src/engine/character/StaffLoadout.ts";
import { DEFAULT_STAFF, STAFF_IDS, STAVES, staffUnlocked, type StaffId } from "../src/engine/character/Staves.ts";
import { WEAPONS } from "../src/engine/character/Weapons.ts";
import { applySpellEffect, resolveSpellStrike, spellHitDamage } from "../src/engine/combat/SpellCombat.ts";
import { ATTACK_DURATION } from "../src/engine/combat/combat.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import type { CollisionMap } from "../src/world/collision.ts";
import { equipStaff } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { NO_STAVES_MESSAGE } from "../src/game/messages/classRules.ts";
import { describeStaffEffect } from "../src/game/messages/staffEffects.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";
import { loadLocalSave, saveLocal } from "../src/storage/localSave.ts";

/**
 * Os cajados do lote 1 (ADR 0073): a Brisa (vento), a Rocha Viva (terra) e as Marés (água), com a lista de `docs/MAGO_CAJADOS.md`; o
 * efeito de cada magia; o cajado em mãos, comprado e liberado por nível, que vai para o save.
 */
const SEED = 842136, OPEN: CollisionMap = { canMove: () => true }, STILL = { x: 0, y: 0 };
const read = (path: string): string => readFileSync(path, "utf8");
const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;
const { mana: _fresh, ...MAGE_SAVE } = new OfflineSimulation(SEED, undefined, "mage").snapshot();
const mageAt = (level: number, staves?: unknown) => new OfflineSimulation(SEED, { ...MAGE_SAVE, experience: experienceForLevel(level),
  inventory: { ...normalizeInventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: 5000 }), ...(staves ? { staves } : {}) } } as never);
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);

test("a lista aprovada: nível, dano, intervalo, mana, efeito e elemento de cada cajado do lote 1", () => {
  const rows = [["breeze", "Cajado da Brisa", 10, 16, 1.2, 17, "wind", "push"], ["stone", "Cajado de Rocha Viva", 15, 21, 1.18, 22, "earth", "slow"],
    ["tide", "Cajado das Marés", 20, 26, 1.15, 28, "water", "heal"]] as const;
  for (const [id, name, level, damage, interval, mana, element, effect] of rows) {
    const s = STAVES[id];
    assert.deepEqual([s.name, s.level, s.damage, s.interval, s.manaCost, s.element, s.effect?.kind, s.range], [name, level, damage, interval, mana, element, effect, 6], id);
  }
  assert.deepEqual([STAVES.breeze.effect, STAVES.stone.effect, STAVES.tide.effect], [{ kind: "push", distance: 16 }, { kind: "slow", factor: 0.7, seconds: 2 }, { kind: "heal", percent: 10 }]);
  assert.equal(STAVES.apprentice.effect, null); assert.equal(STAVES.apprentice.price, undefined);
  assert.equal(STAVES.breeze.price, 30, "a Brisa custa 30 Terrania Gold, como a espada de ferro"); assert.equal(STAVES.stone.price, undefined); assert.equal(STAVES.tide.price, undefined);
  const doc = read("docs/MAGO_CAJADOS.md");
  for (const [, name, level, damage, interval, mana] of rows) assert.ok(doc.includes(`| ${level} | ${name} |`) && doc.includes(String(damage)) && doc.includes(`${interval}`.replace(".", ",")) && doc.includes(`| ${mana} |`), name);
});

test("a regra do documento: dano da espada que espelham, intervalo + 0,2 s, mana = intervalo × mana máxima do nível ÷ 10, preparo menor que o golpe", () => {
  const mirror: Record<string, keyof typeof WEAPONS> = { breeze: "forge", stone: "common", tide: "bronze" };
  for (const id of ["breeze", "stone", "tide"] as const) {
    const s = STAVES[id], sword = WEAPONS[mirror[id]!];
    assert.equal(s.level, sword.level, id + " tem o nível da espada"); assert.equal(s.damage, sword.damage, id + " tem o dano da espada");
    assert.ok(near(s.interval, Math.round((sword.interval + 0.2) * 100) / 100, 1e-9), id + " tem o intervalo da espada + 0,2 s");
    assert.equal(s.manaCost, Math.round(s.interval * MAGE.maxMana(s.level) / 10), id + " gasta intervalo × mana máxima do nível ÷ 10");
    assert.ok(s.windup < ATTACK_DURATION && s.windup > 0, "o preparo cabe no golpe");
    assert.ok(s.manaCost <= MAGE.maxMana(s.level), "uma magia cabe na barra do nível dele");
  }
  assert.equal(new Set(STAFF_IDS.map(id => STAVES[id].name)).size, STAFF_IDS.length, "nomes diferentes");
  for (const id of STAFF_IDS) { const g = STAVES[id].visual.gem; assert.ok(g.light !== g.mid && g.mid !== g.dark, id + " tem gema de três tons"); }
  const gems = new Set(STAFF_IDS.map(id => STAVES[id].visual.gem.mid)); assert.equal(gems.size, STAFF_IDS.length, "cada cajado tem a cor da sua gema (e portanto a do projétil)");
});

test("o que cada efeito faz: empurra, desacelera e cura; só o que faz sentido em cada caso", () => {
  const hero = new Player(); hero.x = 100; hero.y = 100; hero.hp = 50; hero.maxHp = 100;
  const wolf = () => { const m = new RegionalMonster("w", "glacial-wolf", 140, 100); return m; };
  const pushed = wolf(); applySpellEffect("breeze", hero, pushed, 10, OPEN);
  assert.ok(near(pushed.x, 156, 1e-6) && near(pushed.y, 100, 1e-6), "empurrado 16 px para longe do herói");
  const wall: CollisionMap = { canMove: (x: number) => x < 145 }; const blocked = wolf(); applySpellEffect("breeze", hero, blocked, 10, wall);
  assert.ok(blocked.x < 145, "a parede segura o empurrão");
  const above = new RegionalMonster("v", "glacial-wolf", 100, 160); applySpellEffect("breeze", hero, above, 10, OPEN);
  assert.ok(near(above.x, 100, 1e-6) && near(above.y, 176, 1e-6), "empurrado também na vertical, para longe do herói");
  const diagonal = new RegionalMonster("d", "glacial-wolf", 130, 140); applySpellEffect("breeze", hero, diagonal, 10, OPEN);
  assert.ok(near(Math.hypot(diagonal.x - 130, diagonal.y - 140), 16, 1e-6), "o empurrão tem sempre 16 px, em qualquer direção");
  const dead = wolf(); dead.hp = 0; applySpellEffect("breeze", hero, dead, 10, OPEN); assert.equal(dead.x, 140, "quem caiu não é empurrado");
  const onTop = new RegionalMonster("t", "glacial-wolf", 100, 100); applySpellEffect("breeze", hero, onTop, 10, OPEN); assert.equal(onTop.x, 100, "sem direção, sem empurrão");
  const slowed = wolf(); assert.equal(slowed.swordSpeedMultiplier, 1); applySpellEffect("stone", hero, slowed, 10, OPEN);
  assert.equal(slowed.swordSpeedMultiplier, 0.7); assert.equal(slowed.spellSlowSeconds, 2);
  const corpse = wolf(); corpse.hp = 0; applySpellEffect("stone", hero, corpse, 10, OPEN); assert.equal(corpse.swordSpeedMultiplier, 1, "quem caiu não é desacelerado");
  applySpellEffect("tide", hero, wolf(), 26, OPEN); assert.equal(hero.hp, 53, "10% de 26 = 2,6 → 3");
  applySpellEffect("tide", hero, wolf(), 4, OPEN); assert.equal(hero.hp, 54, "no mínimo 1 de vida por acerto");
  hero.hp = 40; applySpellEffect("tide", hero, wolf(), 100, OPEN); assert.equal(hero.hp, 50, "10% de 100 = 10 exatos");
  hero.hp = 99; applySpellEffect("tide", hero, wolf(), 200, OPEN); assert.equal(hero.hp, 100, "não passa da vida máxima");
  hero.hp = 0; applySpellEffect("tide", hero, wolf(), 100, OPEN); assert.equal(hero.hp, 0, "herói caído não é levantado pela cura");
  hero.hp = 50; applySpellEffect("tide", hero, wolf(), 0, OPEN); assert.equal(hero.hp, 50, "sem dano, sem cura");
  const plain = wolf(); applySpellEffect("apprentice", hero, plain, 10, OPEN); assert.deepEqual([plain.x, plain.swordSpeedMultiplier, hero.hp], [140, 1, 50], "o Aprendiz só dá dano");
  const effectsOnly = wolf(); applySpellEffect("tide", hero, effectsOnly, 10, OPEN); assert.deepEqual([effectsOnly.x, effectsOnly.swordSpeedMultiplier], [140, 1], "a cura não empurra nem desacelera");
});

test("a lentidão da magia: a mais forte vale, soma tempo, acaba sozinha e convive com o gelo da espada", () => {
  const m = new Slime("s", 0, 0), hero = new Player();
  m.applySpellSlow(0.7, 2); assert.equal(m.swordSpeedMultiplier, 0.7);
  m.applySpellSlow(0.9, 5); assert.equal(m.swordSpeedMultiplier, 0.7, "a mais forte fica"); assert.equal(m.spellSlowSeconds, 5, "o tempo maior fica");
  m.applySpellSlow(0.8, 1); assert.equal(m.swordSpeedMultiplier, 0.7); assert.equal(m.spellSlowSeconds, 5, "um efeito mais curto não encurta o que já corre");
  m.applySwordStatus("ice", 2, 0); assert.equal(m.swordSpeedMultiplier, 0.7, "valem o gelo (0,8) e a magia (0,7): vale o menor");
  const only = new Slime("o", 0, 0); only.applySwordStatus("ice", 2, 0); only.applySpellSlow(0.95, 1); assert.equal(only.swordSpeedMultiplier, 0.8);
  for (const bad of [[0, 2], [1, 2], [1.2, 2], [-1, 2], [Number.NaN, 2], [0.5, 0], [0.5, -1], [0.5, 11], [0.5, Number.NaN]] as const) { const x = new Slime("x", 0, 0); x.applySpellSlow(bad[0], bad[1]); assert.equal(x.swordSpeedMultiplier, 1, String(bad)); assert.equal(x.spellSlowSeconds, 0, "e nada fica guardado: " + bad); }
  const gone = new Slime("g", 0, 0); gone.hp = 0; gone.applySpellSlow(0.5, 2); assert.equal(gone.swordSpeedMultiplier, 1, "quem caiu não recebe");
  for (let i = 0; i < 40; i++) m.update(0.1, hero, OPEN);
  assert.ok(m.spellSlowSeconds > 0.5 && m.swordSpeedMultiplier < 1, "aos 4 s ainda faltava 1 s dos 5");
  for (let i = 0; i < 20; i++) m.update(0.1, hero, OPEN);
  assert.equal(m.swordSpeedMultiplier, 1, "depois do tempo, volta ao normal"); assert.equal(m.spellSlowSeconds, 0);
});

test("o resolvedor aplica o efeito depois do dano, e a cura vale também no golpe que derrota", () => {
  const hero = new Player(); hero.x = 100; hero.y = 100; hero.hp = 40; hero.maxHp = 100;
  const mob = new RegionalMonster("a", "glacial-wolf", 150, 100), fallen: string[] = [];
  const damage = spellHitDamage("tide", mob);
  resolveSpellStrike("tide", hero, [mob], OPEN, m => fallen.push(m.id));
  assert.equal(hero.hp, 40 + Math.max(1, Math.round(damage / 10)), "curou 10% do dano real (já com a defesa)");
  const weak = new Slime("w", 150, 100); weak.hp = 1; hero.hp = 40; resolveSpellStrike("tide", hero, [weak], OPEN, m => fallen.push(m.id));
  assert.deepEqual(fallen, ["w"]); assert.equal(hero.hp, 41, "abater também cura, pelo dano que causou");
  const pushed = new RegionalMonster("p", "clay-troll", 150, 100); resolveSpellStrike("breeze", hero, [pushed], OPEN, () => {});
  assert.ok(pushed.x > 150, "a Brisa empurra quem sobrevive");
});

test("o cajado em mãos e os comprados: padrão, normalização do save e o que o save guarda", () => {
  assert.deepEqual(DEFAULT_STAFF_LOADOUT, { equipped: "apprentice", bought: [] }); assert.equal(isDefaultStaffLoadout(DEFAULT_STAFF_LOADOUT), true);
  assert.equal(isDefaultStaffLoadout({ equipped: "tide", bought: [] }), false); assert.equal(isDefaultStaffLoadout({ equipped: "apprentice", bought: ["breeze"] }), false);
  for (const bad of [undefined, null, 3, "x", [], {}]) assert.deepEqual(sanitizeStaffLoadout(bad), DEFAULT_STAFF_LOADOUT, String(bad));
  assert.deepEqual(sanitizeStaffLoadout({ equipped: "tide", bought: ["breeze", "breeze", "stone", "lua", 5, null] }), { equipped: "tide", bought: ["breeze"] },
    "só os vendidos entram (a Rocha Viva libera por nível), sem repetir, sem lixo");
  assert.deepEqual(sanitizeStaffLoadout({ equipped: "lua", bought: "breeze" }), DEFAULT_STAFF_LOADOUT);
  assert.equal(normalizeStaffLoadout({ equipped: "tide", bought: [] }, 19).equipped, "apprentice", "sem o nível, volta ao Aprendiz");
  assert.equal(normalizeStaffLoadout({ equipped: "tide", bought: [] }, 20).equipped, "tide", "com o nível, fica");
  assert.equal(normalizeStaffLoadout({ equipped: "breeze", bought: [] }, 99).equipped, "apprentice", "a Brisa sem compra não vale, qualquer nível");
  assert.equal(normalizeStaffLoadout({ equipped: "breeze", bought: ["breeze"] }, 10).equipped, "breeze");
  assert.equal(normalizeStaffLoadout({ equipped: "tide", bought: ["breeze"] }, 20).bought[0], "breeze", "a compra se mantém");
  assert.equal(staffUnlocked("breeze", 10), false); assert.equal(staffUnlocked("breeze", 10, ["breeze"]), true); assert.equal(staffUnlocked("breeze", 9, ["breeze"]), false);
  assert.equal(staffUnlocked("stone", 15), true); assert.equal(staffUnlocked("stone", 14), false); assert.equal(staffUnlocked("tide", 20), true);
  assert.equal(staffUnlocked("stone", 15.5), false, "nível quebrado não libera");
  assert.deepEqual(normalizeInventory({ gel: 1, staves: { equipped: "breeze", bought: ["breeze", "tide"] } }).staves, { equipped: "breeze", bought: ["breeze"] });
  assert.equal("staves" in normalizeInventory({ gel: 1, staves: { equipped: "apprentice", bought: [] } }), false, "o padrão não ocupa espaço no save");
});

test("a bolsa: comprar a Brisa, trocar de cajado só com nível e posse, e guardar no save", () => {
  const inv = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: 100 }, 25), hero = { hp: 10 };
  assert.equal(inv.equipStaff("breeze", 25), "staff-not-owned", "a Brisa precisa ser comprada");
  assert.equal(inv.buyStaff("stone", hero), "staff-not-for-sale", "a Rocha Viva não é vendida"); assert.equal(inv.buyStaff("apprentice", hero), "staff-not-for-sale");
  assert.equal(inv.buyStaff("breeze", { hp: 0 }), "staff-unavailable");
  assert.equal(inv.buyStaff("breeze", hero), "staff-purchased"); assert.equal(inv.coins, 70, "30 Terrania Gold");
  assert.equal(inv.buyStaff("breeze", hero), "staff-already-owned"); assert.equal(inv.coins, 70, "não cobra duas vezes");
  assert.equal(inv.equipStaff("breeze", 9), "staff-level-too-low"); assert.equal(inv.equipStaff("breeze", 10.5), "staff-level-too-low");
  assert.equal(inv.equipStaff("breeze", 25), "staff-equipped"); assert.equal(inv.equipStaff("breeze", 25), "staff-already-equipped");
  assert.equal(inv.equipStaff("tide", 19), "staff-level-too-low"); assert.equal(inv.equipStaff("tide", 25), "staff-equipped");
  assert.equal(inv.equipStaff("lua" as StaffId, 25), "staff-not-owned");
  assert.deepEqual(inv.staves, { equipped: "tide", bought: ["breeze"] });
  assert.deepEqual(inv.snapshot().staves, { equipped: "tide", bro: undefined }.equipped === "tide" ? { equipped: "tide", bought: ["breeze"] } : undefined);
  const back = new Inventory(inv.snapshot(), 25); assert.deepEqual(back.staves, { equipped: "tide", bought: ["breeze"] }, "o save volta igual");
  const low = new Inventory(inv.snapshot(), 12); assert.equal(low.staves.equipped, "apprentice", "num nível menor o cajado equipado volta ao Aprendiz"); assert.deepEqual(low.staves.bought, ["breeze"], "mas a compra fica");
  const poor = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: 29 }, 25); assert.equal(poor.buyStaff("breeze", hero), "staff-insufficient-coins"); assert.equal(poor.coins, 29);
  assert.equal("staves" in new Inventory(undefined, 1).snapshot(), false);
  for (const outcome of ["staff-purchased", "staff-already-owned", "staff-not-for-sale", "staff-insufficient-coins", "staff-too-far", "staff-unavailable", "staff-equipped", "staff-already-equipped", "staff-not-owned", "staff-level-too-low"] as const)
    assert.ok(INVENTORY_FEEDBACK[outcome].length > 10, outcome);
  assert.match(INVENTORY_FEEDBACK["staff-insufficient-coins"], /30/);
});

test("na simulação: o cajado em mãos é o da bolsa, vai para o save e a magia usa o dele", () => {
  const fresh = new OfflineSimulation(SEED, undefined, "mage"); assert.equal(fresh.equippedStaff, DEFAULT_STAFF);
  const sim = mageAt(20); assert.equal(sim.equippedStaff, "apprentice");
  assert.equal(equipStaff(context(sim), "tide").changed, true); assert.equal(sim.equippedStaff, "tide");
  assert.equal(sim.combatProfile.interval, STAVES.tide.interval, "o ritmo é o do cajado novo"); assert.equal(sim.combatProfile.ranged?.reach, STAVES.tide.range * 32);
  const back = new OfflineSimulation(SEED, sim.snapshot()); assert.equal(back.equippedStaff, "tide", "o cajado volta no save");
  assert.equal(new OfflineSimulation(SEED + 1, sim.snapshot()).equippedStaff, "apprentice", "outro mundo não herda");
  const low = mageAt(5, { equipped: "tide", bought: [] }); assert.equal(low.equippedStaff, "apprentice", "um save adulterado não dá um cajado que o nível não permite");
  const mage = mageAt(20); mage.update(0.01, STILL, false); mage.slimes.clear(); mage.player.x = 16; mage.player.y = 16; mage.player.faceX = 1; mage.player.faceY = 0;
  equipStaff(context(mage), "tide");
  const mob = new RegionalMonster("m", "glacial-wolf", 166, 16); mob.hp = 5000; mage.slimes.set(mob.id, mob);
  assert.equal(mage.player.startCast("tide", c => mage.spendMana(c)), true);
  assert.equal(mage.player.strikeDamage, STAVES.tide.damage); assert.equal(mage.mana, mage.maxMana - STAVES.tide.manaCost, "gastou a mana do cajado novo");
  mage.player.hp = 10; for (let i = 0; i < 30; i++) mage.update(1 / 60, STILL, false, mob.id);
  assert.ok(mob.hp < 5000, "a magia acertou"); assert.ok(mage.player.hp > 10, "as Marés curam o mago pelo dano que causou (na superfície)");
});

test("na caverna a mesma magia: a Brisa empurra, a Rocha Viva desacelera e as Marés curam", () => {
  const entrance = caveEntranceInCell(0, 0, SEED)!;
  const cast = (staff: StaffId) => {
    const room = new CaveRoom(entrance), p = room.player; p.hp = 50; p.maxHp = 100; room.monsters.clear();
    // um ponto livre a 150 px do herói, em linha reta
    let spot: { x: number; y: number } | null = null;
    for (let a = 0; a < 16 && !spot; a++) {
      const dx = Math.cos(a * Math.PI / 8), dy = Math.sin(a * Math.PI / 8), x = p.x + dx * 150, y = p.y + dy * 150;
      let clear = room.collision.canMove(x, y);
      for (let s = 1; s <= 25 && clear; s++) clear = room.collision.canMove(p.x + dx * 6 * s, p.y + dy * 6 * s);
      if (clear) spot = { x, y };
    }
    assert.ok(spot, "há um ponto livre na gruta");
    const mob = new RegionalMonster("c", "glacial-wolf", spot.x, spot.y); room.monsters.set(mob.id, mob);
    mob.hp = 5000; const hp0 = p.hp; let cast = 0, jump = 0, hitFrame = -1;
    for (let i = 0; i < 60; i++) {
      const before = mob.x, life = mob.hp;
      room.update(1 / 60, STILL, i === 0, "starter", 0, mob.id, { staff, spend: () => { cast++; return true; } });
      if (hitFrame < 0 && mob.hp < life) { hitFrame = i; jump = mob.x - before; }
    }
    return { room, mob, p, hp0, cast, jump, hitFrame };
  };
  const wind = cast("breeze"); assert.ok(wind.hitFrame > 0, "a magia acertou"); assert.ok(wind.jump > 12, `empurrado na caverna (${wind.jump} px no quadro do acerto)`); assert.equal(wind.cast, 1);
  const plain = cast("apprentice"); assert.ok(plain.jump < 4, "o Aprendiz não empurra"); assert.equal(plain.mob.swordSpeedMultiplier, 1);
  const earth = cast("stone"); assert.ok(earth.mob.swordSpeedMultiplier < 1, "desacelerado na caverna"); assert.ok(earth.mob.spellSlowSeconds > 0);
  const water = cast("tide"); assert.ok(water.p.hp > water.hp0, "curado na caverna"); assert.ok(water.mob.swordSpeedMultiplier === 1);
});

test("a ficha do inventário diz o efeito de cada cajado em palavras", () => {
  assert.equal(describeStaffEffect(null), "dano simples");
  assert.equal(describeStaffEffect(STAVES.breeze.effect), "empurra o alvo para trás");
  assert.equal(describeStaffEffect(STAVES.stone.effect), "deixa o alvo 30% mais lento por 2 s");
  assert.equal(describeStaffEffect(STAVES.tide.effect), "cura você em 10% do dano causado");
  assert.equal(describeStaffEffect({ kind: "slow", factor: 0.6, seconds: 3 }), "deixa o alvo 40% mais lento por 3 s");
});

test("a ação de trocar de cajado: só o Mago, vivo, e a bolsa decide", () => {
  const knight = new OfflineSimulation(SEED); assert.deepEqual(equipStaff(context(knight), "tide"), { message: NO_STAVES_MESSAGE, changed: false });
  const sim = mageAt(20); sim.player.hp = 0; assert.equal(equipStaff(context(sim), "tide").changed, false);
  const mage = mageAt(20); assert.deepEqual(equipStaff(context(mage), "breeze"), { message: INVENTORY_FEEDBACK["staff-not-owned"], changed: false }, "a Brisa precisa ser comprada");
  assert.equal(equipStaff(context(mage), "tide").message, INVENTORY_FEEDBACK["staff-equipped"]);
  assert.equal(equipStaff(context(mage), "tide").message, INVENTORY_FEEDBACK["staff-already-equipped"]);
  const novice = mageAt(1); assert.equal(equipStaff(context(novice), "stone").message, INVENTORY_FEEDBACK["staff-level-too-low"]);
  assert.match(NO_STAVES_MESSAGE, /Mago/);
});

test("save do navegador: o cajado em mãos e a compra sobrevivem; lixo no save vira o Aprendiz", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage"), store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } } });
  try {
    const sim = mageAt(25); equipStaff(context(sim), "tide"); sim.inventory.buyStaff("breeze", sim.player); saveLocal(sim.snapshot());
    const loaded = loadLocalSave()!; assert.deepEqual(loaded.inventory.staves, { equipped: "tide", bought: ["breeze"] });
    assert.equal(new OfflineSimulation(SEED, loaded).equippedStaff, "tide");
    const raw = (staves: unknown) => store.set("terrania-origins-v1", JSON.stringify({ seed: SEED, x: 16, y: 16, hp: 50, kills: 0, defeated: [], heroClass: "mage", experience: experienceForLevel(25), inventory: { gel: 0, potion: 0, questRewardClaimed: false, staves } }));
    raw({ equipped: "lua", bought: ["lua", "breeze", "breeze"] }); assert.deepEqual(loadLocalSave()!.inventory.staves, { equipped: "apprentice", bought: ["breeze"] });
    raw("lixo"); assert.equal("staves" in loadLocalSave()!.inventory, false);
  } finally { if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage"); }
});

test("a ligação: o jogo troca o cajado, o HUD lista os cajados e a tela mostra o estado de cada um", () => {
  const game = read("src/game/Game.ts"), service = read("src/app/hud.service.ts"), page = read("src/app/game-page.html");
  assert.match(game, /this\.hud\.onStaffEquip\(staff => this\.shop\(context => equipStaff\(context, staff\)\)\);/);
  assert.match(game, /this\.hud\.updateStaves\(inventory\.staves\);/);
  assert.match(service, /updateStaves\(loadout: StaffLoadout\): void \{ this\.staffBought\.set\(loadout\.bought\.join\(','\)\); \}/);
  assert.match(service, /equipStaff\(staff: StaffId\): void \{ this\.inventoryFeedback\.set\(this\.staffEquipCallback\(staff\)\); \}/);
  assert.match(service, /staffUnlocked\(id, level, bought\) \? 'available' as const\s*\n\s*: level >= def\.level \? 'for-sale' as const : 'locked' as const;/, "disponível, à venda (nível alcançado, falta comprar) ou bloqueado");
  assert.match(service, /id === this\.staff\(\) \? 'equipped' as const/, "o cajado em mãos aparece como equipado");
  assert.match(service, /this\.progression\(\)\?\.level \?\? 1, bought/, "o HUD usa o nível do mago para liberar");
  assert.match(page, /@for \(row of hud\.staffRows\(\); track row\.id\)/);
  assert.match(page, /\[disabled\]="row\.status !== 'available'"\s*\n\s*\(click\)="hud\.equipStaff\(row\.id\)"/, "só se pode trocar para o que está disponível");
  for (const label of ["Equipado", "Equipar", "Comprar na Academia", "Bloqueado"]) assert.ok(page.includes(label), label);
  assert.match(page, /<p id="equippedStaffEffect">Efeito: \{\{ hud\.staffEffectText\(\) \}\}<\/p>/);
});
