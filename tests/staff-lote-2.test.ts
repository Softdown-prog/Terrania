import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { MAGE } from "../src/engine/character/classes/index.ts";
import { STAVES, staffUnlocked, type StaffId } from "../src/engine/character/Staves.ts";
import { WEAPONS } from "../src/engine/character/Weapons.ts";
import { ATTACK_DURATION } from "../src/engine/combat/combat.ts";
import { applySpellEffect, resolveSpellStrike, spellHitDamage } from "../src/engine/combat/SpellCombat.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { equipStaff } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { describeStaffEffect } from "../src/game/messages/staffEffects.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import type { CollisionMap } from "../src/world/collision.ts";

/**
 * Os cajados do lote 2 (ADR 0075): Brasa Rubra (fogo, queima), Espinheiro (natureza, veneno que acumula até 3 vezes) e Geada Boreal (gelo,
 * lentidão forte), com a lista de `docs/MAGO_CAJADOS.md`; os efeitos ao longo do tempo valem na superfície e na caverna e o abate por eles conta.
 */
const SEED = 842136, OPEN: CollisionMap = { canMove: () => true }, STILL = { x: 0, y: 0 };
const read = (path: string): string => readFileSync(path, "utf8");
const { mana: _fresh, ...MAGE_SAVE } = new OfflineSimulation(SEED, undefined, "mage").snapshot();
const mageAt = (level: number) => new OfflineSimulation(SEED, { ...MAGE_SAVE, experience: experienceForLevel(level) } as never);
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);
const hero = (): Player => { const p = new Player(); p.x = 100; p.y = 100; p.hp = 50; p.maxHp = 100; return p; };
const big = (id = "w", x = 150) => { const m = new RegionalMonster(id, "glacial-wolf", x, 100); m.hp = 5000; return m; };
/** Deixa passar `seconds` de jogo (múltiplo de 0,05) no monstro, em passos de 0,05 s, sem ele se mexer nem machucar o herói. */
const tick = (mob: Slime, seconds: number): void => { const far = new Player(); far.x = 9999; far.y = 9999; for (let i = 0, n = Math.round(seconds / 0.05); i < n; i++) mob.update(0.05, far, OPEN); };

test("a lista aprovada: nível, dano, intervalo, mana, preparo, efeito e elemento dos três cajados do lote 2", () => {
  const rows = [["ember", "Cajado de Brasa Rubra", 30, 38, 1.55, 53, 0.21, "fire", "burn"], ["thorn", "Cajado do Espinheiro", 45, 52, 1.35, 66, 0.16, "nature", "poison"],
    ["frost", "Cajado da Geada Boreal", 60, 68, 1.3, 83, 0.16, "ice", "slow"]] as const;
  for (const [id, name, level, damage, interval, mana, windup, element, effect] of rows) {
    const s = STAVES[id];
    assert.deepEqual([s.name, s.level, s.damage, s.interval, s.manaCost, s.windup, s.element, s.effect?.kind, s.range, s.price], [name, level, damage, interval, mana, windup, element, effect, 6, undefined], id);
  }
  assert.deepEqual([STAVES.ember.effect, STAVES.thorn.effect, STAVES.frost.effect], [{ kind: "burn", seconds: 3, damage: 4 }, { kind: "poison", seconds: 4, damage: 3, maxStacks: 3 }, { kind: "slow", factor: 0.6, seconds: 3 }]);
  const doc = read("docs/MAGO_CAJADOS.md");
  for (const [, name, level, damage, interval, mana] of rows) assert.ok(doc.includes(`| ${level} | ${name} |`) && doc.includes(`| ${damage} |`) && doc.includes(`${interval}`.replace(".", ",")) && doc.includes(`| ${mana} |`), name);
});

test("a regra do documento vale para o lote 2: espelha a espada (nível e dano), intervalo + 0,2 s, mana = intervalo × mana máxima do nível ÷ 10, e o preparo é o da espada + 0,05 s", () => {
  const mirror = { ember: "copper", thorn: "dunes", frost: "boreal" } as const;
  for (const id of ["ember", "thorn", "frost"] as const) {
    const s = STAVES[id], sword = WEAPONS[mirror[id]];
    assert.equal(s.level, sword.level, id); assert.equal(s.damage, sword.damage, id);
    assert.ok(Math.abs(s.interval - Math.round((sword.interval + 0.2) * 100) / 100) < 1e-9, id + " intervalo");
    assert.equal(s.manaCost, Math.round(s.interval * MAGE.maxMana(s.level) / 10), id + " mana");
    assert.ok(Math.abs(s.windup - (sword.windup + 0.05)) < 1e-9, id + " preparo"); assert.ok(s.windup < ATTACK_DURATION, "o preparo cabe no golpe");
    assert.equal(staffUnlocked(id, s.level), true, "libera no nível, sem comprar"); assert.equal(staffUnlocked(id, s.level - 1), false);
  }
  const gems = new Set(Object.values(STAVES).map(s => s.visual.gem.mid)); assert.equal(gems.size, Object.keys(STAVES).length, "cada cajado tem a gema da sua cor");
});

test("a queimadura: 4 de dano por segundo durante 3 s (12 no total), renova sem acumular e não pega quem já caiu", () => {
  const mob = big(); applySpellEffect("ember", hero(), mob, 30, OPEN); assert.equal(mob.hp, 5000, "queimar não machuca na hora");
  tick(mob, 1.05); assert.equal(mob.hp, 4996, "1 s: 4"); tick(mob, 2); assert.equal(mob.hp, 4988, "3 s: 12 no total, com o último tique incluído");
  tick(mob, 5); assert.equal(mob.hp, 4988, "depois dos 3 s acaba");
  const again = big(); applySpellEffect("ember", hero(), again, 30, OPEN); tick(again, 1.5); applySpellEffect("ember", hero(), again, 30, OPEN); tick(again, 5);
  assert.equal(5000 - again.hp, 4 * 4, "a segunda queimadura renova o tempo (3 s) sem dobrar o dano: 1 tique antes e 3 depois, de 4 por segundo");
  const dead = big(); dead.hp = 0; applySpellEffect("ember", hero(), dead, 30, OPEN); dead.hp = 100; tick(dead, 4); assert.equal(dead.hp, 100, "quem caiu não queima"); assert.equal(dead.spellBurnSeconds, 0);
  const fresh = big(); applySpellEffect("ember", hero(), fresh, 30, OPEN); assert.equal(fresh.spellBurnSeconds, 3, "dura 3 s"); tick(fresh, 1); assert.ok(Math.abs(fresh.spellBurnSeconds - 2) < 1e-9, "e conta o tempo que falta");
  for (const bad of [[0, 3], [-1, 3], [21, 3], [Number.NaN, 3], [4, 0], [4, 11], [4, Number.NaN], [4, -2]] as const) { const m = big(); m.applySpellBurn(bad[0], bad[1]); assert.equal(m.spellBurnSeconds, 0, "valor inválido não queima: " + bad); tick(m, 2); assert.equal(m.hp, 5000, String(bad)); }
  const fast = big(); applySpellEffect("ember", hero(), fast, 30, OPEN); for (let i = 0; i < 60 * 3 + 6; i++) fast.update(1 / 60, new Player(), OPEN);
  assert.equal(5000 - fast.hp >= 12 && 5000 - fast.hp <= 12, true, "no passo de 1/60 s do jogo o último tique também conta: 12 no total");
  const hit = hero(), wolf = new RegionalMonster("b", "glacial-wolf", 150, 100); wolf.hp = 500; resolveSpellStrike("ember", hit, [wolf], OPEN, () => {});
  assert.equal(wolf.hp, 500 - spellHitDamage("ember", wolf), "o acerto causa o dano da magia pela defesa"); tick(wolf, 3.05);
  assert.equal(wolf.hp, 500 - spellHitDamage("ember", wolf) - 12, "e a queimadura soma 12, sem passar pela defesa");
});

test("o tempo do efeito é exato: o relógio de tiques continua ao renovar, o último tique não se perde por arredondamento e um passo grande não passa do fim", () => {
  const steps = (mob: Slime, n: number, dt: number): void => { const far = new Player(); far.x = 9999; far.y = 9999; for (let i = 0; i < n; i++) mob.update(dt, far, OPEN); };
  const burn = big(); applySpellEffect("ember", hero(), burn, 30, OPEN); steps(burn, 30, 0.1); assert.equal(5000 - burn.hp, 12, "3 s em passos de 0,1 s (que somam um tico menos que 1 s): os três tiques, o último também");
  const poison = big(); for (let i = 0; i < 3; i++) applySpellEffect("thorn", hero(), poison, 40, OPEN); steps(poison, 40, 0.1); assert.equal(5000 - poison.hp, 36, "4 s em passos de 0,1 s: os quatro tiques de 9");
  const plain = (): Slime => { const m = new Slime("p", 150, 100); m.hp = 5000; return m; };
  const huge = plain(); applySpellEffect("ember", hero(), huge, 30, OPEN); steps(huge, 1, 10); assert.equal(5000 - huge.hp, 12, "um passo de 10 s não causa mais que os 3 s da queimadura");
  const hugePoison = plain(); applySpellEffect("thorn", hero(), hugePoison, 40, OPEN); steps(hugePoison, 1, 10); assert.equal(5000 - hugePoison.hp, 12, "nem o veneno: 4 s × 3");
  const keep = big(); applySpellEffect("ember", hero(), keep, 30, OPEN); tick(keep, 1.5); applySpellEffect("ember", hero(), keep, 30, OPEN); const before = keep.hp; tick(keep, 0.5);
  assert.equal(before - keep.hp, 4, "ao renovar a queimadura, o meio segundo já contado continua: o próximo tique vem 0,5 s depois");
  const keepPoison = big(); applySpellEffect("thorn", hero(), keepPoison, 40, OPEN); tick(keepPoison, 1.5); applySpellEffect("thorn", hero(), keepPoison, 40, OPEN); const was = keepPoison.hp; tick(keepPoison, 0.5);
  assert.equal(was - keepPoison.hp, 6, "e o veneno também: o tique de 2 acúmulos vem 0,5 s depois de renovar");
});

test("o veneno acumula até 3 vezes: cada acúmulo causa 3 por segundo, um novo acerto renova o tempo e passar do teto não soma", () => {
  const mob = big(); applySpellEffect("thorn", hero(), mob, 40, OPEN); assert.equal(mob.spellPoisonStacks, 1);
  tick(mob, 1.05); assert.equal(mob.hp, 4997, "1 acúmulo: 3 por segundo");
  applySpellEffect("thorn", hero(), mob, 40, OPEN); assert.equal(mob.spellPoisonStacks, 2); tick(mob, 1); assert.equal(mob.hp, 4991, "2 acúmulos: 6 por segundo");
  applySpellEffect("thorn", hero(), mob, 40, OPEN); applySpellEffect("thorn", hero(), mob, 40, OPEN); assert.equal(mob.spellPoisonStacks, 3, "no máximo 3");
  tick(mob, 1); assert.equal(mob.hp, 4982, "3 acúmulos: 9 por segundo"); tick(mob, 4); assert.equal(mob.spellPoisonStacks, 0, "acaba sozinho");
  const after = mob.hp; tick(mob, 3); assert.equal(mob.hp, after, "e depois não causa mais dano");
  const renew = big(); applySpellEffect("thorn", hero(), renew, 40, OPEN); tick(renew, 3); applySpellEffect("thorn", hero(), renew, 40, OPEN); tick(renew, 3.9);
  assert.equal(renew.spellPoisonStacks, 2, "o segundo acerto renovou o tempo: aos 6,9 s ainda há veneno"); tick(renew, 0.2); assert.equal(renew.spellPoisonStacks, 0);
  const total = big(); for (let i = 0; i < 3; i++) applySpellEffect("thorn", hero(), total, 40, OPEN); tick(total, 4.05); assert.equal(5000 - total.hp, 9 * 4, "três acúmulos por 4 s: 36 no total");
  const dead = big(); dead.hp = 0; applySpellEffect("thorn", hero(), dead, 40, OPEN); assert.equal(dead.spellPoisonStacks, 0, "quem caiu não é envenenado");
  for (const bad of [[0, 4, 3], [-1, 4, 3], [21, 4, 3], [Number.NaN, 4, 3], [3, 0, 3], [3, 11, 3], [3, Number.NaN, 3], [3, 4, 0], [3, 4, 6], [3, 4, 1.5]] as const) {
    const m = big(); m.applySpellPoison(bad[0], bad[1], bad[2]); assert.equal(m.spellPoisonStacks, 0, String(bad));
  }
  const single = big(); single.applySpellPoison(3, 4, 1); single.applySpellPoison(3, 4, 1); assert.equal(single.spellPoisonStacks, 1, "o teto do cajado manda");
});

test("a Geada Boreal deixa o alvo 40% mais lento por 3 s e vale mais que a lentidão da Rocha Viva", () => {
  const mob = big(); applySpellEffect("stone", hero(), mob, 10, OPEN); assert.equal(mob.swordSpeedMultiplier, 0.7);
  applySpellEffect("frost", hero(), mob, 10, OPEN); assert.equal(mob.swordSpeedMultiplier, 0.6, "a mais forte vale"); assert.equal(mob.spellSlowSeconds, 3);
  tick(mob, 3.1); assert.equal(mob.swordSpeedMultiplier, 1);
  const alone = big(); applySpellEffect("frost", hero(), alone, 10, OPEN); applySpellEffect("stone", hero(), alone, 10, OPEN); assert.equal(alone.swordSpeedMultiplier, 0.6, "a Rocha Viva depois não afrouxa");
});

test("quem morre de queimadura ou veneno conta como derrota: experiência na superfície e monstro removido na caverna", () => {
  for (const staff of ["ember", "thorn"] as const) {
    const sim = mageAt(60); sim.update(0.01, STILL, false); sim.slimes.clear(); sim.player.x = 16; sim.player.y = 16; sim.player.faceX = 1; sim.player.faceY = 0;
    const mob = new RegionalMonster("m", "glacial-wolf", 120, 16); sim.slimes.set(mob.id, mob);
    mob.hp = spellHitDamage(staff, mob) + 5; const xp0 = sim.experience;
    assert.equal(equipStaff(context(sim), staff).changed, true);
    assert.equal(sim.player.startCast(staff, c => sim.spendMana(c)), true);
    for (let i = 0; i < 60 * 4 && sim.slimes.has("m"); i++) sim.update(1 / 60, STILL, false, "m");
    assert.equal(sim.slimes.has("m"), false, staff + ": o monstro morreu pelo efeito ao longo do tempo"); assert.ok(sim.experience > xp0, staff + ": e a experiência foi dada");
  }
  const entrance = caveEntranceInCell(0, 0, SEED)!;
  for (const staff of ["ember", "thorn"] as const) {
    const room = new CaveRoom(entrance), p = room.player; room.monsters.clear(); let spot: { x: number; y: number } | null = null;
    for (let a = 0; a < 16 && !spot; a++) {
      const dx = Math.cos(a * Math.PI / 8), dy = Math.sin(a * Math.PI / 8), x = p.x + dx * 150, y = p.y + dy * 150; let clear = room.collision.canMove(x, y);
      for (let s = 1; s <= 25 && clear; s++) clear = room.collision.canMove(p.x + dx * 6 * s, p.y + dy * 6 * s);
      if (clear) spot = { x, y };
    }
    assert.ok(spot); const mob = new RegionalMonster("c", "glacial-wolf", spot.x, spot.y); room.monsters.set(mob.id, mob); mob.hp = spellHitDamage(staff, mob) + 5;
    for (let i = 0; i < 60 * 4 && room.monsters.has("c"); i++) room.update(1 / 60, STILL, i === 0, "starter", 0, "c", { staff, spend: () => true });
    assert.equal(room.monsters.has("c"), false, staff + ": na caverna também morre pelo efeito ao longo do tempo");
  }
});

test("os cajados do lote 2 liberam sozinhos nos níveis 30, 45 e 60, e a troca respeita o nível", () => {
  const sim = mageAt(45);
  assert.equal(equipStaff(context(sim), "ember").changed, true); assert.equal(sim.equippedStaff, "ember"); assert.equal(sim.combatProfile.interval, 1.55);
  assert.equal(equipStaff(context(sim), "thorn").changed, true); assert.equal(sim.combatProfile.ranged?.reach, 6 * 32);
  assert.equal(equipStaff(context(sim), "frost").changed, false, "no nível 45 a Geada ainda não");
  const up = mageAt(60); assert.equal(equipStaff(up.context ? context(up) : context(up), "frost").changed, true); assert.equal(up.equippedStaff, "frost");
  const low = mageAt(29); assert.equal(equipStaff(context(low), "ember").changed, false); const back = new OfflineSimulation(SEED, up.snapshot()); assert.equal(back.equippedStaff, "frost", "salva");
  const before = mageAt(60); equipStaff(context(before), "thorn" as StaffId); assert.equal(before.snapshot().inventory.staves?.equipped, "thorn");
});

test("a ficha do inventário diz o efeito em palavras", () => {
  assert.equal(describeStaffEffect(STAVES.ember.effect), "queima o alvo: 4 de dano por segundo durante 3 s");
  assert.equal(describeStaffEffect(STAVES.thorn.effect), "envenena: 3 de dano por segundo durante 4 s, e acumula até 3 vezes");
  assert.equal(describeStaffEffect(STAVES.frost.effect), "deixa o alvo 40% mais lento por 3 s");
});
