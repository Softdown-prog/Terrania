import assert from "node:assert/strict";
import test from "node:test";
import { Player } from "../src/actors/Player.ts";
import { Monster } from "../src/actors/Monster.ts";
import { Slime } from "../src/actors/Slime.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { canStrike, HEAVY_ATTACK_COOLDOWN, HEAVY_ATTACK_DAMAGE,
  HEAVY_ATTACK_WINDUP } from "../src/engine/combat.ts";

const STAY = { x: 0, y: 0 };
const OPEN = { canMove: () => true };

test("golpe forte tem preparo, dano dois, um único impacto e recarga maior", () => {
  const hero = new Player();
  assert.equal(hero.strikeDamage, 1);
  assert.equal(hero.startHeavyAttack(), true);
  assert.equal(hero.attackKind, "heavy");
  assert.equal(hero.strikeDamage, HEAVY_ATTACK_DAMAGE);
  assert.equal(hero.consumeStrike(), false);
  assert.equal(hero.startAttack(), false);
  assert.equal(hero.startHeavyAttack(), false);
  // O motor limita cada frame a 0,1 s; não simular saltos de tempo irreais.
  hero.update(.1, STAY, OPEN);
  hero.update(HEAVY_ATTACK_WINDUP - .14, STAY, OPEN);
  assert.equal(hero.consumeStrike(), false);
  hero.update(.05, STAY, OPEN);
  assert.equal(hero.consumeStrike(), true);
  assert.equal(hero.consumeStrike(), false);
  for (let i=0; i<8; i++) hero.update(.1, STAY, OPEN);
  assert.equal(hero.startHeavyAttack(), false);
  hero.update(HEAVY_ATTACK_COOLDOWN, STAY, OPEN); // dt is capped at .1 per frame
  for (let i=0; i<5; i++) hero.update(.1, STAY, OPEN);
  assert.equal(hero.startAttack(), true);
  assert.equal(hero.attackKind, "light");
  assert.equal(hero.strikeDamage, 1);
  hero.hp = 0;
  assert.equal(hero.startHeavyAttack(), false);
});

test("golpe forte derrota slime em um acerto, sem duplicar XP, drop ou missão", () => {
  const sim = new OfflineSimulation(842136);
  sim.update(0, STAY, false);
  sim.slimes.clear();
  const mob = new Slime("strong-slime", 50, 16);
  mob.hurtTime = 100;
  mob.contactCooldown = 100;
  sim.slimes.set(mob.id, mob);
  sim.player.faceX = 1; sim.player.faceY = 0;
  sim.update(1/60, STAY, false, true);
  for (let i = 0; i < 10; i++) sim.update(1/60, STAY, false);
  assert.equal(mob.hp, 2, "preparação não pode causar dano cedo");
  for (let i = 0; i < 13; i++) sim.update(1/60, STAY, false);
  assert.equal(sim.slimes.has(mob.id), false);
  assert.equal(sim.kills, 1);
  assert.equal(sim.slimeKills, 1);
  assert.equal(sim.experience, 10);
  assert.equal(sim.drops.get(mob.id)?.item, "gel");
  for (let i = 0; i < 60; i++) sim.update(1/60, STAY, false);
  assert.equal(sim.kills, 1);
  assert.equal(sim.experience, 10);
  assert.equal(sim.snapshot().defeated.filter(id => id === mob.id).length, 1);
  const restored = new OfflineSimulation(842136, sim.snapshot());
  assert.equal(restored.kills, 1);
  assert.equal(restored.experience, 10);
  assert.ok(restored.defeated.has(mob.id));
});

test("golpe forte reduz três pontos de vida de lobo a um; golpe normal reduz um", () => {
  const sim = new OfflineSimulation(842136);
  sim.update(0, STAY, false);
  sim.slimes.clear();
  const wolf = new Monster("wolf", "heavy-wolf", 50, 16);
  wolf.hurtTime = 100;
  wolf.contactCooldown = 100;
  sim.slimes.set(wolf.id, wolf);
  sim.player.faceX = 1; sim.player.faceY = 0;
  sim.update(1/60, STAY, false, true);
  for (let i=0;i<24;i++)sim.update(1/60,STAY,false);
  assert.equal(wolf.hp, 1);
  assert.equal(sim.kills, 0);
  assert.equal(sim.experience, 0);
  for(let i=0;i<70;i++)sim.update(1/60,STAY,false);
  sim.update(1/60,STAY,true);
  for(let i=0;i<12;i++)sim.update(1/60,STAY,false);
  assert.equal(sim.kills, 1);
  assert.equal(sim.slimeKills, 0);
  assert.equal(sim.experience, 20);
});

test("sem atravessar paredes ou acertar atrás do personagem", () => {
  const hero = new Player();
  hero.x = 0; hero.y = 0; hero.faceX = 1; hero.faceY = 0;
  assert.equal(canStrike(hero, { x: -30, y: 0 }, OPEN), false);
  assert.equal(canStrike(hero, { x: 35, y: 0 }, { canMove: x => x < 20 }), false);
  assert.equal(canStrike(hero, { x: 35, y: 0 }, OPEN), true);
});
