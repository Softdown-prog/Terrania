import assert from "node:assert/strict";
import test from "node:test";
import { Slime } from "../src/actors/Slime.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { MAX_EXPERIENCE, MAX_LEVEL, maxHpForExperience, experienceProgress, grantExperience,
  levelForExperience, normalizeExperience } from "../src/engine/character/Experience.ts";

const STILL = { x: 0, y: 0 };

test("XP tem curva cumulativa, limite e bônus de vida ao subir de nível", () => {
  for (const [xp, level] of [[0, 1], [29, 1], [30, 2], [89, 2], [90, 3]])
    assert.equal(levelForExperience(xp!), level);
  assert.deepEqual(experienceProgress(50), { level: 2, earned: 20, needed: 60 });
  assert.deepEqual(experienceProgress(MAX_EXPERIENCE), { level: MAX_LEVEL, earned: 0, needed: 0 });
  for (const invalid of [NaN, Infinity, -1, "30", 1.5]) assert.equal(normalizeExperience(invalid), 0);
  assert.equal(normalizeExperience(Number.MAX_SAFE_INTEGER), MAX_EXPERIENCE);
  const hero = { hp: 73, maxHp: 100 };
  assert.equal(grantExperience(20, 10, hero), 30);
  assert.deepEqual(hero, { hp: 83, maxHp: 110 });
  const veteran = { hp: 420, maxHp: maxHpForExperience(MAX_EXPERIENCE) };
  assert.equal(grantExperience(MAX_EXPERIENCE, 10, veteran), MAX_EXPERIENCE);
  assert.equal(veteran.hp, 420);
});

test("abates solo creditam XP uma vez e sobrevivem ao save e ao respawn", () => {
  const sim = new OfflineSimulation(842136, {
    seed: 842136, x: 16, y: 16, hp: 79, kills: 5, defeated: ["antigo"],
  });
  assert.equal(sim.experience, 0);
  for (let kill = 1; kill <= 3; kill++) {
    const id = `xp-test-${kill}`;
    sim.slimes.set(id, new Slime(id, 48, 16));
    for (let frame = 0; frame < 90 && sim.slimes.has(id); frame++)
      sim.update(1 / 60, STILL, true, id);
    assert.equal(sim.slimes.has(id), false);
    assert.equal(sim.experience, kill * 10);
    sim.update(0.05, STILL, true, id);
    assert.equal(sim.experience, kill * 10);
  }
  assert.equal(sim.kills, 8);
  assert.equal(sim.player.maxHp, 110);
  const restored = new OfflineSimulation(sim.seed, sim.snapshot());
  assert.equal(restored.experience, 30);
  assert.equal(restored.player.maxHp, 110);
  restored.player.takeDamage(1000, 16, 26);
  assert.equal(restored.respawn(), true);
  assert.equal(restored.player.hp, 110);
  assert.equal(restored.experience, 30);
});

test("dano letal impede coleta e ataques até retornar à vila uma única vez", () => {
  const seed = 842136;
  const drop = { id: "previous", item: "gel" as const, x: -560, y: -1008 };
  const inventory = { gel: 3, potion: 2, questRewardClaimed: true };
  const sim = new OfflineSimulation(seed, {
    seed, x: drop.x, y: drop.y, hp: 1, kills: 5, defeated: [drop.id],
    experience: 50, inventory, drops: [drop],
  });
  const killer = "-2,-2,0";
  assert.equal(sim.update(1 / 60, STILL, true, killer), true);
  assert.equal(sim.awaitingRespawn, true);
  assert.equal(sim.slimes.get(killer)?.hp, 2);
  const checkpoint = sim.snapshot();
  assert.equal(checkpoint.hp, 0);
  assert.equal(checkpoint.awaitingRespawn, true);
  assert.deepEqual(checkpoint.inventory, inventory);
  assert.deepEqual(checkpoint.drops, [drop]);
  assert.equal(sim.update(0.1, { x: 1, y: 0 }, true, killer), false);
  assert.deepEqual(sim.snapshot(), checkpoint);

  const restored = new OfflineSimulation(seed, checkpoint);
  assert.equal(restored.awaitingRespawn, true);
  assert.equal(restored.inventory.usePotion(restored.player), false);
  assert.equal(restored.respawn(), true);
  assert.equal(restored.respawn(), false);
  assert.equal(restored.collision.canMove(restored.player.x, restored.player.y), true);
  const { awaitingRespawn: _defeat, ...progress } = checkpoint;
  assert.deepEqual(restored.snapshot(), { ...progress, x: 432, y: 48, hp: 110 });
});
