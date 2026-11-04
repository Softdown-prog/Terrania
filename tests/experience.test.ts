import assert from "node:assert/strict";
import test from "node:test";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { MAX_EXPERIENCE, MAX_LEVEL, SLIME_XP, experienceForLevel,
  levelForExperience, maxHpForExperience, nextLevelExperience, normalizeExperience
} from "../src/engine/Experience.ts";
import { loadLocalSave, saveLocal } from "../src/storage/localSave.ts";

test("níveis determinísticos, vida crescente e teto de XP", () => {
  assert.equal(SLIME_XP, 10);
  assert.equal(levelForExperience(0), 1);
  assert.equal(levelForExperience(29), 1);
  assert.equal(levelForExperience(30), 2);
  assert.equal(levelForExperience(89), 2);
  assert.equal(levelForExperience(90), 3);
  assert.equal(experienceForLevel(3), 90);
  assert.equal(nextLevelExperience(30), 90);
  assert.equal(maxHpForExperience(30), 110);
  assert.equal(levelForExperience(MAX_EXPERIENCE), MAX_LEVEL);
  assert.equal(nextLevelExperience(MAX_EXPERIENCE), MAX_EXPERIENCE);
  assert.throws(() => experienceForLevel(0), RangeError);
  assert.throws(() => experienceForLevel(MAX_LEVEL + 1), RangeError);
});
test("saves antigos iniciam XP zero e números inválidos são sanitizados", () => {
  for (const bad of [NaN, Infinity, -1, "30", {}, 1.5])
    assert.equal(normalizeExperience(bad), 0);
  assert.equal(normalizeExperience(Number.MAX_SAFE_INTEGER), MAX_EXPERIENCE);
  const old = new OfflineSimulation(842136, {
    seed: 842136, x: 16, y: 16, hp: 70, kills: 5, defeated: ["old"],
  });
  assert.equal(old.experience, 0);
  assert.equal(old.level, 1);
  assert.equal(old.player.hp, 70);
  assert.equal(old.kills, 5);
});
test("morte preserva experiência e restaura vida máxima", () => {
  const sim = new OfflineSimulation(842136, {
    seed: 842136, x: 16, y: 16, hp: 55, kills: 4, defeated: [], experience: 40,
  });
  assert.equal(sim.level, 2);
  assert.equal(sim.player.maxHp, 110);
  assert.equal(sim.player.hp, 55);
  assert.equal(sim.player.takeDamage(500, 16, 26), true);
  sim.update(1 / 60, { x: 0, y: 0 }, false);
  assert.equal(sim.player.hp, 110);
  assert.equal(sim.player.maxHp, 110);
  assert.equal(sim.experience, 40);
  assert.equal(sim.kills, 4);
  assert.equal(new OfflineSimulation(842136, sim.snapshot()).experience, 40);
});
test("localStorage restaura XP e HP acima de 100 sem perder saves antigos", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
    },
  });
  try {
    const key = "terrania-origins-v1";
    data.set(key, JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 75, kills: 5, defeated: [],
    }));
    assert.equal(loadLocalSave()?.experience, 0);
    const sim = new OfflineSimulation(842136, {
      seed: 842136, x: 16, y: 16, hp: 107, kills: 5, defeated: [], experience: 50,
    });
    saveLocal(sim.snapshot());
    const restored = loadLocalSave();
    assert.equal(restored?.experience, 50);
    assert.equal(restored?.hp, 107);
    assert.equal(new OfflineSimulation(842136, restored ?? undefined).player.maxHp, 110);
    data.set(key, JSON.stringify({ ...sim.snapshot(), experience: -900, hp: 400 }));
    assert.equal(loadLocalSave()?.experience, 0);
    assert.equal(loadLocalSave()?.hp, 100);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
