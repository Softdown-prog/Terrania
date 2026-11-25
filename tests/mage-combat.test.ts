import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { MAGE_HP_PERCENT, heroClassSheet } from "../src/engine/character/classes/index.ts";
import { BASE_MAX_HP, experienceForLevel, grantExperience, maxHpForExperience } from "../src/engine/character/Experience.ts";
import { STAVES } from "../src/engine/character/Staves.ts";
import { WEAPONS } from "../src/engine/character/Weapons.ts";
import { ATTACK_DURATION } from "../src/engine/combat/combat.ts";
import { ClassicCombat } from "../src/engine/combat/ClassicCombat.ts";
import { ClassicPursuit, CLASSIC_FOLLOW_STOP, findClassicApproach, inClassicAttackPosition } from "../src/engine/combat/ClassicPursuit.ts";
import { resolveSpellStrike, spellHitDamage, spellReach, spellStrikeTargets } from "../src/engine/combat/SpellCombat.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { NO_MANA_MESSAGE } from "../src/game/messages/noMana.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import type { CollisionMap } from "../src/world/collision.ts";
import { loadLocalSave, saveLocal } from "../src/storage/localSave.ts";

/**
 * O combate à distância do Mago (ADR 0069): vida a 80% da do Cavaleiro; a magia do cajado com a mesma defesa da espada, ao alcance de
 * 6 tiles, que gasta mana; a mira por alvo e a perseguição com o alcance do cajado; sem mana nada sai e a recarga não é gasta; e a mesma
 * regra na superfície e na caverna.
 */
const SEED = 842136, DT = 1 / 60, STILL = { x: 0, y: 0 }, OPEN: CollisionMap = { canMove: () => true };
const REACH = 192, STAFF = STAVES.apprentice;
const wall = (x: number): CollisionMap => ({ canMove: (px: number) => px < x });

function mageWorld(kind: "glacial-wolf" | "clay-troll" | "basalt-golem" = "glacial-wolf", distance = 150) {
  const sim = new OfflineSimulation(SEED, undefined, "mage");
  sim.update(0.01, STILL, false); sim.slimes.clear(); sim.player.x = 16; sim.player.y = 16; sim.player.faceX = 1; sim.player.faceY = 0;
  const mob = new RegionalMonster("m1", kind, 16 + distance, 16); sim.slimes.set(mob.id, mob);
  const fight = new ClassicCombat(); fight.select(mob.id, sim.slimes);
  /** Um quadro, como o jogo roda: a mira decide, a simulação resolve. */
  const frame = (): void => {
    const p = sim.combatProfile;
    const attack = fight.tick(DT, sim.player, sim.slimes, sim.collision, p.interval, p.weapon, p.ranged);
    sim.update(DT, STILL, attack, fight.strikeTargetId);
  };
  return { sim, mob, fight, frame };
}

test("a vida do Mago é 80% da do Cavaleiro no mesmo nível, arredondada, e a do Cavaleiro não mudou", () => {
  assert.equal(MAGE_HP_PERCENT, 80); assert.deepEqual([heroClassSheet("knight").hpPercent, heroClassSheet("mage").hpPercent], [100, 80]);
  for (const level of [1, 2, 3, 10, 50, 100]) {
    const xp = experienceForLevel(level), knight = BASE_MAX_HP + (level - 1) * 10;
    assert.equal(maxHpForExperience(xp), knight, `Cavaleiro nível ${level}`); assert.equal(maxHpForExperience(xp, "knight"), knight);
    assert.equal(maxHpForExperience(xp, "mage"), Math.round(knight * 0.8), `Mago nível ${level}`);
  }
  assert.deepEqual([maxHpForExperience(0, "mage"), maxHpForExperience(experienceForLevel(2), "mage"), maxHpForExperience(experienceForLevel(10), "mage")], [80, 88, 152]);
});

test("o Mago nasce, renasce e sobe de nível com a vida dele; salvar e carregar respeita o máximo dele", () => {
  const mage = new OfflineSimulation(SEED, undefined, "mage"), knight = new OfflineSimulation(SEED);
  assert.deepEqual([mage.player.hp, mage.player.maxHp], [80, 80]); assert.deepEqual([knight.player.hp, knight.player.maxHp], [100, 100]);
  mage.player.hp = 0; assert.equal(mage.respawn(), true); assert.deepEqual([mage.player.hp, mage.player.maxHp], [80, 80], "renasce com a vida cheia do Mago");
  const hero = { hp: 80, maxHp: 80 };
  assert.equal(grantExperience(0, experienceForLevel(2), hero, "mage"), experienceForLevel(2));
  assert.deepEqual([hero.hp, hero.maxHp], [88, 88], "subir de nível dá os 8 de vida a mais do Mago");
  const knightHero = { hp: 100, maxHp: 100 }; grantExperience(0, experienceForLevel(2), knightHero);
  assert.deepEqual([knightHero.hp, knightHero.maxHp], [110, 110], "e os 10 do Cavaleiro");
  const saved = new OfflineSimulation(SEED, { ...mage.snapshot(), hp: 9_999, experience: experienceForLevel(10) });
  assert.deepEqual([saved.player.hp, saved.player.maxHp], [152, 152], "vida de save acima do máximo volta ao máximo do Mago");
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage"), store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } } });
  try {
    store.set("terrania-origins-v1", JSON.stringify({ seed: SEED, x: 16, y: 16, hp: 5_000, kills: 0, defeated: [], heroClass: "mage", experience: experienceForLevel(10) }));
    assert.equal(loadLocalSave()!.hp, 152, "o save do navegador limita a vida ao máximo do Mago");
    store.set("terrania-origins-v1", JSON.stringify({ seed: SEED, x: 16, y: 16, hp: 5_000, kills: 0, defeated: [], experience: experienceForLevel(10) }));
    assert.equal(loadLocalSave()!.hp, 190, "e ao do Cavaleiro quando não há vocação");
    saveLocal(new OfflineSimulation(SEED, undefined, "mage").snapshot()); assert.equal(loadLocalSave()!.hp, 80);
  } finally { if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage"); }
});

test("o herói lança uma magia: paga a mana só se pode atacar, guarda o preparo do cajado, e o golpe de espada volta a valer depois", () => {
  const p = new Player(), paid: number[] = [], pay = (ok = true) => (cost: number) => { paid.push(cost); return ok; };
  assert.equal(p.startCast("apprentice", pay(false)), false, "sem mana não sai"); assert.deepEqual([p.attackTime, p.attackCooldown, p.attackIsSpell], [0, 0, false]);
  assert.equal(p.startCast("apprentice", pay()), true);
  assert.deepEqual([p.attackTime, p.attackCooldown, p.attackStaff, p.attackWindup, p.attackIsSpell, p.strikeDamage], [ATTACK_DURATION, 1, "apprentice", 0.12, true, 8]);
  assert.deepEqual(paid, [5, 5]);
  const armed = new Player(); armed.attackWeapon = "forge"; armed.startCast("apprentice", () => true);
  assert.equal(armed.strikeDamage, STAFF.damage, "o dano da magia é o do cajado, mesmo com uma espada de outro dano na mão");
  assert.notEqual(WEAPONS.forge.damage, STAFF.damage, "(controle: a espada de ferro tem outro dano)");
  assert.equal(p.startCast("apprentice", pay()), false, "em recarga não sai"); assert.deepEqual(paid, [5, 5], "e não cobra mana");
  const dead = new Player(); dead.hp = 0; assert.equal(dead.startCast("apprentice", pay()), false); assert.deepEqual(paid, [5, 5], "caído não cobra mana");
  const stunned = new Player(); stunned.applyStatus("stun", 2); assert.equal(stunned.startCast("apprentice", pay()), false); assert.deepEqual(paid, [5, 5], "atordoado não cobra mana");
  const slow = new Player(); slow.applyStatus("attack-slow", 5); slow.startCast("apprentice", pay()); assert.equal(slow.attackCooldown, 1.8, "a lentidão de ataque também vale para a magia");
  const sword = new Player(); sword.startCast("apprentice", pay());
  for (let i = 0; i < 12; i++) sword.update(0.1, STILL, OPEN); // a recarga da magia (1 s) passa
  assert.equal(sword.startAttack("forge"), true);
  assert.deepEqual([sword.attackStaff, sword.attackIsSpell, sword.attackWindup, sword.strikeDamage], [null, false, WEAPONS.forge.windup, WEAPONS.forge.damage],
    "a espada limpa o cajado e usa o preparo e o dano dela");
});

test("o golpe sai depois do preparo de cada arma: 0,12 s na magia do cajado, o da espada no golpe de espada", () => {
  const spell = new Player(); spell.startCast("apprentice", () => true);
  let t = 0; while (!spell.consumeStrike()) { spell.update(0.01, STILL, OPEN); t += 0.01; assert.ok(t < 0.4, "a magia saiu"); }
  assert.ok(t >= 0.119 && t < 0.15, `a magia sai em ~0,12 s (saiu em ${t.toFixed(3)})`);
  const sword = new Player(); sword.startAttack("starter");
  let u = 0; while (!sword.consumeStrike()) { sword.update(0.01, STILL, OPEN); u += 0.01; assert.ok(u < 0.4); }
  assert.ok(u >= 0.069 && u < 0.1, `a espada de treino sai em ~0,07 s (saiu em ${u.toFixed(3)})`);
});

test("a regra da magia: alcance de 6 tiles, só o alvo escolhido, à vista, vivo; dano pela mesma defesa da espada", () => {
  assert.equal(spellReach("apprentice"), REACH); assert.equal(STAFF.range * 32, REACH);
  const hero = { x: 0, y: 0, faceX: 1, faceY: 0 }, at = (id: string, x: number, hp = 50) => { const m = new Slime(id, x, 0); m.hp = hp; return m; };
  const target = at("a", 150), other = at("b", 100), mobs = [target, other];
  assert.deepEqual(spellStrikeTargets("apprentice", hero, mobs, OPEN, "a"), [target], "só o escolhido, mesmo havendo outro mais perto");
  for (const none of [undefined, null, "z"]) assert.deepEqual(spellStrikeTargets("apprentice", hero, mobs, OPEN, none), [], `sem alvo (${String(none)})`);
  assert.equal(spellStrikeTargets("apprentice", hero, [at("a", REACH - 0.1)], OPEN, "a").length, 1, "dentro do alcance");
  assert.equal(spellStrikeTargets("apprentice", hero, [at("a", REACH)], OPEN, "a").length, 0, "no limite do alcance já não pega");
  assert.equal(spellStrikeTargets("apprentice", hero, [at("a", 150, 0)], OPEN, "a").length, 0, "morto não é atingido");
  assert.equal(spellStrikeTargets("apprentice", hero, mobs, wall(120), "a").length, 0, "parede no caminho barra a magia");
  assert.equal(spellStrikeTargets("apprentice", hero, [at("a", 60)], wall(120), "a").length, 1, "parede depois do alvo não atrapalha");
  assert.equal(spellStrikeTargets("apprentice", { ...hero, faceX: -1 }, mobs, OPEN, "a").length, 0, "de costas para o alvo não acerta");
  for (const [kind, defense] of [["glacial-wolf", 0], ["clay-troll", 8], ["basalt-golem", 20]] as const) {
    const mob = new RegionalMonster("x", kind, 0, 0); assert.equal(mob.defense, defense);
    assert.equal(spellHitDamage("apprentice", mob), Math.max(1, STAFF.damage - defense), `${kind}: ${STAFF.damage} menos a defesa, no mínimo 1`);
  }
  assert.equal(spellHitDamage("apprentice", new RegionalMonster("x", "basalt-golem", 0, 0)), 1, "o golem blindado leva o mínimo");
});

test("resolver a magia: fere o alvo, avisa quem foi abatido uma vez, e ignora morto", () => {
  const p = new Player(); p.x = 0; p.y = 0;
  const wolf = new RegionalMonster("w", "glacial-wolf", 100, 0), weak = new Slime("s", 100, 0), dead = new Slime("d", 100, 0); dead.hp = 0;
  const fallen: string[] = [];
  resolveSpellStrike("apprentice", p, [wolf, weak, dead], OPEN, m => fallen.push(m.id));
  assert.equal(wolf.hp, 140 - 8); assert.equal(weak.hp, 0, "o slime de 3 de vida cai"); assert.deepEqual(fallen, ["s"], "só o abatido, uma vez; o morto não conta");
  resolveSpellStrike("apprentice", p, [], OPEN, () => assert.fail("sem alvos nada acontece"));
});

test("a mira por alvo do Mago: dispara a até 6 tiles, a espada não; sem mana não sai, não gasta recarga e avisa uma vez por bloqueio", () => {
  const hero = new Player(); hero.x = 0; hero.y = 0; hero.faceX = 1; hero.faceY = 0;
  const near = new Slime("near", 150, 0), far = new Slime("far", 300, 0), mobs = new Map([[near.id, near], [far.id, far]]);
  const ready = { reach: REACH, ready: true }, empty = { reach: REACH, ready: false };
  const sword = new ClassicCombat(); sword.select("near", mobs);
  assert.equal(sword.tick(DT, hero, mobs, OPEN), false, "a espada não alcança 150 px");
  const fight = new ClassicCombat(); fight.select("near", mobs);
  assert.equal(fight.tick(DT, hero, mobs, OPEN, 1, "starter", ready), true, "o cajado alcança"); assert.equal(fight.strikeTargetId, "near"); assert.equal(fight.cooldown, 1);
  const dry = new ClassicCombat(); dry.select("near", mobs);
  assert.equal(dry.tick(DT, hero, mobs, OPEN, 1, "starter", empty), false); assert.equal(dry.cooldown, 0, "sem mana a recarga não é gasta"); assert.equal(dry.strikeTargetId, null);
  assert.equal(dry.takeBlocked(), "no-mana"); assert.equal(dry.takeBlocked(), null, "avisa uma vez");
  for (let i = 0; i < 5; i++) dry.tick(DT, hero, mobs, OPEN, 1, "starter", empty);
  assert.equal(dry.takeBlocked(), null, "e não repete enquanto continua sem mana");
  assert.equal(dry.tick(DT, hero, mobs, OPEN, 1, "starter", ready), true, "a mana volta e a magia sai"); assert.equal(dry.takeBlocked(), null);
  const again = new ClassicCombat(); again.select("near", mobs); again.tick(DT, hero, mobs, OPEN, 1, "starter", empty); again.takeBlocked();
  again.select("far", mobs); again.select("near", mobs); again.tick(DT, hero, mobs, OPEN, 1, "starter", empty);
  assert.equal(again.takeBlocked(), "no-mana", "trocar de alvo faz avisar de novo");
  const wander = new ClassicCombat(); wander.select("near", mobs); wander.tick(DT, hero, mobs, OPEN, 1, "starter", empty); wander.takeBlocked();
  near.x = 400; wander.tick(DT, hero, mobs, OPEN, 1, "starter", empty); near.x = 150; wander.tick(DT, hero, mobs, OPEN, 1, "starter", empty);
  assert.equal(wander.takeBlocked(), "no-mana", "sair do alcance e voltar sem mana avisa de novo");
  const out = new ClassicCombat(); out.select("far", mobs);
  assert.equal(out.tick(DT, hero, mobs, OPEN, 1, "starter", empty), false); assert.equal(out.takeBlocked(), null, "fora do alcance não há o que avisar");
  const blocked = new ClassicCombat(); blocked.select("near", mobs);
  assert.equal(blocked.tick(DT, hero, mobs, wall(100), 1, "starter", empty), false); assert.equal(blocked.takeBlocked(), null, "atrás de parede também não");
  const reset = new ClassicCombat(); reset.select("near", mobs); reset.tick(DT, hero, mobs, OPEN, 1, "starter", empty); reset.reset();
  assert.equal(reset.takeBlocked(), null, "um mundo novo não herda o aviso");
});

test("a perseguição do Mago para dentro do alcance do cajado; a do Cavaleiro continua parando junto do alvo", () => {
  const hero = new Player(); hero.x = 16; hero.y = 16;
  const mob = new Slime("m", 166, 16), mobs = new Map([[mob.id, mob]]), stop = REACH - 4;
  assert.equal(CLASSIC_FOLLOW_STOP, 48);
  assert.equal(inClassicAttackPosition(hero, mob, OPEN), false, "a 150 px a espada ainda não alcança");
  assert.equal(inClassicAttackPosition(hero, mob, OPEN, stop), true, "o cajado já alcança");
  assert.equal(inClassicAttackPosition(hero, new Slime("f", 16 + stop, 16), OPEN, stop), false, "na distância de parada já é fora");
  assert.equal(inClassicAttackPosition(hero, new Slime("f", 16 + stop - 1, 16), OPEN, stop), true);
  assert.equal(inClassicAttackPosition(hero, mob, wall(100), stop), false, "sem linha de visão não alcança");
  assert.deepEqual(new ClassicPursuit().direction(DT, hero, mob.id, mobs, OPEN, false, null, stop), STILL, "o mago já está em posição e não anda");
  const melee = new ClassicPursuit().direction(DT, hero, mob.id, mobs, OPEN);
  assert.ok(Math.hypot(melee.x, melee.y) > 0.05, "o cavaleiro vai até o alvo");
  const far = new Slime("far", 16 + 300, 16), farMobs = new Map([[far.id, far]]), chase = new ClassicPursuit();
  const step = chase.direction(DT, hero, far.id, farMobs, OPEN, false, null, stop);
  assert.ok(Math.hypot(step.x, step.y) > 0.05, "o mago longe do alvo anda para perto");
  const approach = findClassicApproach(hero, far, OPEN, false, stop)!;
  assert.ok(approach && inClassicAttackPosition(approach, far, OPEN, stop), "o destino já está dentro do alcance");
  for (const tileSteps of [false, true]) assert.deepEqual(new ClassicPursuit().direction(DT, hero, mob.id, mobs, OPEN, tileSteps, null, stop), STILL, `em posição (tiles: ${tileSteps})`);
});

test("o perfil de combate: o Cavaleiro bate de perto, o Mago atira de longe e só está pronto com mana para a magia", () => {
  const knight = new OfflineSimulation(SEED), mage = new OfflineSimulation(SEED, undefined, "mage");
  assert.deepEqual({ ...knight.combatProfile }, { interval: knight.inventory.weapon.interval, weapon: knight.inventory.loadout.equipped, followStop: CLASSIC_FOLLOW_STOP });
  assert.equal(knight.combatProfile.ranged, undefined);
  assert.equal(mage.equippedStaff, "apprentice");
  assert.deepEqual({ ...mage.combatProfile, ranged: { ...mage.combatProfile.ranged! } }, { interval: 1, weapon: "starter", ranged: { reach: REACH, ready: true }, followStop: REACH - 4 });
  mage.spendMana(46); assert.equal(mage.mana, 4); assert.equal(mage.combatProfile.ranged!.ready, false, "com 4 de mana não dá para 5");
  for (let i = 0; i < 4; i++) mage.advanceClock(0.1); // o relógio avança em passos de até 0,1 s: 4 de mana + 1 = 5
  assert.equal(mage.combatProfile.ranged!.ready, true, "volta a ficar pronto com a regeneração");
});

test("na superfície: o Mago lança a magia no alvo escolhido, paga 5 de mana, e o dano usa a defesa do alvo", () => {
  const { sim, mob, frame } = mageWorld();
  for (let i = 0; i < 60; i++) frame();
  assert.equal(mob.hp, 140 - 8, "uma magia de 8 de dano no lobo sem armadura");
  assert.ok(Math.abs(sim.mana - (45 + 2.5 * (59 / 60))) < 0.01, `pagou 5 e regenerou o resto (mana ${sim.mana})`);
  assert.equal(sim.player.attackStaff, "apprentice"); assert.equal(sim.player.attackIsSpell, true);
  const armored = mageWorld("basalt-golem");
  for (let i = 0; i < 60; i++) armored.frame();
  assert.equal(armored.mob.hp, 450 === armored.mob.hp ? 450 : armored.mob.hp, "o golem só perde o mínimo");
  assert.equal(new RegionalMonster("g", "basalt-golem", 0, 0).hp - armored.mob.hp, 1, "o golem blindado perde 1");
  for (let i = 0; i < 120; i++) frame();
  assert.ok(mob.hp <= 140 - 8 * 2, "depois de 1 s de recarga sai a segunda magia");
});

test("na superfície: sem alvo escolhido a magia não sai e a mana fica; sem mana nada sai e a tela é avisada uma vez", () => {
  const w = mageWorld();
  for (const none of [undefined, null]) { w.sim.update(DT, STILL, true, none); }
  assert.equal(w.sim.mana, 50, "atacar sem alvo não gasta mana"); assert.equal(w.sim.player.attackTime, 0); assert.equal(w.mob.hp, 140);
  w.sim.update(DT, STILL, true, "m1"); assert.equal(w.sim.mana < 50, true, "com alvo escolhido a magia sai");
  const dry = mageWorld(); dry.sim.spendMana(50);
  let notices = 0;
  for (let i = 0; i < 100; i++) { dry.frame(); if (dry.fight.takeBlocked() === "no-mana") notices++; }
  assert.equal(dry.mob.hp, 140, "durante 100 quadros sem mana o lobo não levou nada"); assert.equal(notices, 1, "e a tela foi avisada uma vez");
  assert.equal(dry.fight.cooldown, 0, "a recarga não foi gasta");
  for (let i = 0; i < 80; i++) dry.frame();
  assert.equal(dry.mob.hp, 140 - 8, "quando a mana volta (5 de mana em 2 s) a magia sai");
});

test("o Mago sobe de nível pela superfície com a vida dele (8 a mais, não os 10 do Cavaleiro)", () => {
  const sim = new OfflineSimulation(SEED, undefined, "mage"); sim.update(0.01, STILL, false); sim.slimes.clear();
  sim.experience = experienceForLevel(2) - 1; sim.player.x = 16; sim.player.y = 16; sim.player.faceX = 1; sim.player.faceY = 0;
  const slime = new Slime("lv", 150, 16); sim.slimes.set(slime.id, slime);
  const fight = new ClassicCombat(); fight.select(slime.id, sim.slimes);
  for (let i = 0; i < 40; i++) { const p = sim.combatProfile; sim.update(DT, STILL, fight.tick(DT, sim.player, sim.slimes, sim.collision, p.interval, p.weapon, p.ranged), fight.strikeTargetId); }
  assert.ok(sim.experience >= experienceForLevel(2), "chegou ao nível 2");
  assert.deepEqual([sim.player.maxHp, sim.player.hp], [88, 88], "vida de Mago no nível 2");
});

test("o Mago abate o monstro e ganha a experiência dele, como o Cavaleiro", () => {
  const sim = new OfflineSimulation(SEED, undefined, "mage"); sim.update(0.01, STILL, false); sim.slimes.clear();
  sim.player.x = 16; sim.player.y = 16; sim.player.faceX = 1; sim.player.faceY = 0;
  const slime = new Slime("s", 150, 16); sim.slimes.set(slime.id, slime);
  const fight = new ClassicCombat(); fight.select(slime.id, sim.slimes);
  for (let i = 0; i < 40; i++) { const p = sim.combatProfile; sim.update(DT, STILL, fight.tick(DT, sim.player, sim.slimes, sim.collision, p.interval, p.weapon, p.ranged), fight.strikeTargetId); }
  assert.equal(slime.hp, 0); assert.ok(sim.experience > 0, "ganhou experiência"); assert.equal(sim.defeated.has("s"), true, "a criatura ficou abatida");
});

test("o Cavaleiro continua batendo com a espada: sem cajado, sem mana, e o alvo da espada leva o dano da espada", () => {
  const sim = new OfflineSimulation(SEED); sim.update(0.01, STILL, false); sim.slimes.clear();
  sim.player.x = 16; sim.player.y = 16; sim.player.faceX = 1; sim.player.faceY = 0;
  const wolf = new RegionalMonster("k", "glacial-wolf", 60, 16); sim.slimes.set(wolf.id, wolf);
  const fight = new ClassicCombat(); fight.select(wolf.id, sim.slimes);
  for (let i = 0; i < 30; i++) { const p = sim.combatProfile; sim.update(DT, STILL, fight.tick(DT, sim.player, sim.slimes, sim.collision, p.interval, p.weapon, p.ranged), fight.strikeTargetId); }
  assert.equal(sim.player.attackStaff, null); assert.equal(sim.mana, 0); assert.ok(wolf.hp < 140, "a espada feriu o lobo");
  assert.equal(140 - wolf.hp, 8, "8 de dano, o da espada de treino");
});

test("na caverna: a mesma magia, o mesmo dano e a mesma mana (paridade com a superfície, por tipo de monstro)", () => {
  const entry = caveEntranceInCell(0, 0, SEED)!;
  for (const kind of ["glacial-wolf", "clay-troll", "basalt-golem"] as const) {
    const cave = new CaveRoom(entry); cave.monsters.clear();
    // um ponto livre a 150 px do herói, em linha reta
    let spot: { x: number; y: number } | null = null;
    for (let a = 0; a < 16 && !spot; a++) {
      const dx = Math.cos(a * Math.PI / 8), dy = Math.sin(a * Math.PI / 8), x = cave.player.x + dx * 150, y = cave.player.y + dy * 150;
      let clear = cave.collision.canMove(x, y);
      for (let s = 1; s <= 25 && clear; s++) clear = cave.collision.canMove(cave.player.x + dx * 6 * s, cave.player.y + dy * 6 * s);
      if (clear) spot = { x, y };
    }
    assert.ok(spot, "há um ponto livre a 150 px na gruta");
    const mob = new RegionalMonster("c1", kind, spot.x, spot.y); cave.monsters.set(mob.id, mob);
    const paid: number[] = [], caster = { staff: "apprentice" as const, spend: (c: number) => { paid.push(c); return true; } };
    const before = mob.hp;
    cave.update(DT, STILL, true, "starter", 0, "c1", caster);
    for (let i = 0; i < 12; i++) cave.update(DT, STILL, false, "starter", 0, "c1", caster);
    assert.deepEqual(paid, [5], `${kind}: pagou uma magia`);
    assert.equal(before - mob.hp, spellHitDamage("apprentice", mob), `${kind}: o mesmo dano da superfície`);
    const surface = mageWorld(kind);
    for (let i = 0; i < 20; i++) surface.frame();
    assert.equal(before - mob.hp, new RegionalMonster("t", kind, 0, 0).hp - surface.mob.hp, `${kind}: igual ao dano na superfície`);
  }
});

test("na caverna: sem alvo escolhido ou sem mana a magia não sai; o Cavaleiro (sem lançador) segue com a espada", () => {
  const entry = caveEntranceInCell(0, 0, SEED)!, paid: number[] = [];
  const caster = (ok: boolean) => ({ staff: "apprentice" as const, spend: (c: number) => { paid.push(c); return ok; } });
  const cave = new CaveRoom(entry); cave.monsters.clear();
  cave.update(DT, STILL, true, "starter", 0, undefined, caster(true)); cave.update(DT, STILL, true, "starter", 0, null, caster(true));
  assert.deepEqual(paid, [], "sem alvo escolhido não há cobrança"); assert.equal(cave.player.attackTime, 0);
  cave.update(DT, STILL, true, "starter", 0, "x", caster(false)); assert.equal(cave.player.attackTime, 0, "sem mana a magia não sai"); assert.deepEqual(paid, [5], "tentou pagar e não deu");
  const knight = new CaveRoom(entry); knight.monsters.clear();
  knight.update(DT, STILL, true, "starter", 0, undefined); assert.ok(knight.player.attackTime > 0, "o Cavaleiro ataca sem lançador"); assert.equal(knight.player.attackStaff, null);
});

test("a fiação do combate à distância: os dois modos usam o perfil, avisam 'Sem mana' e passam o alcance do mago à perseguição", () => {
  const surface = readFileSync("src/game/modes/surfaceMode.ts", "utf8"), cave = readFileSync("src/game/modes/caveMode.ts", "utf8");
  assert.equal(NO_MANA_MESSAGE, "Sem mana");
  for (const [name, source] of [["superfície", surface], ["caverna", cave]] as const) {
    assert.match(source, /const profile = host\.sim\.combatProfile;/, `${name}: lê o perfil`);
    assert.match(source, /profile\.interval,\s*profile\.weapon,\s*profile\.ranged\)/, `${name}: a mira recebe intervalo, arma e alcance`);
    assert.match(source, /host\.travel\.combat\.takeBlocked\(\) === "no-mana"\) host\.hud\.setTravelNotice\(NO_MANA_MESSAGE\)/, `${name}: avisa sem mana`);
    assert.match(source, /profile\.followStop/, `${name}: a perseguição para no alcance`);
  }
  assert.equal((surface.match(/profile\.followStop/g) ?? []).length, 2, "as duas perseguições da superfície (quadro e passo por tile)");
  assert.match(cave, /host\.sim\.usesMana \? \{ staff: host\.sim\.equippedStaff, spend: cost => host\.sim\.spendMana\(cost\), gain: amount => host\.sim\.gainMana\(amount\) \} : undefined/, "a caverna só dá lançador a quem usa mana");
});
