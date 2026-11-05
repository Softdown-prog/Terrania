import assert from "node:assert/strict";
import test from "node:test";
import { Slime } from "../src/actors/Slime.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { MAX_EXPERIENCE, MAX_LEVEL, experienceProgress, grantExperience,
  levelForExperience, normalizeExperience } from "../src/engine/Experience.ts";

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
  const veteran = { hp: 420, maxHp: 590 };
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
  restored.update(1 / 60, STILL, false);
  assert.equal(restored.player.hp, 110);
  assert.equal(restored.experience, 30);
});
