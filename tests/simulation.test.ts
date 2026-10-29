import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";

test("motor offline roda sem navegador e restaura save", () => {
  const sim = new OfflineSimulation(842136);
  sim.update(0.05, { x: 0, y: 0 }, false);
  const state = sim.snapshot();
  assert.equal(state.seed, 842136);
  assert.equal(state.hp, 100);
  const restored = new OfflineSimulation(842136, {
    ...state,
    kills: 3,
    defeated: ["slime-a"],
  });
  assert.equal(restored.kills, 3);
  assert.ok(restored.defeated.has("slime-a"));
});
test("seed reproduz colisão em dois motores", () => {
  const a = new OfflineSimulation(842136);
  const b = new OfflineSimulation(842136);
  assert.equal(a.collision.canMove(16, 16), b.collision.canMove(16, 16));
  assert.equal(a.collision.canMove(-123, 456), b.collision.canMove(-123, 456));
});

test("save antigo em obstáculo novo retorna à clareira sem perder a missão", () => {
  const sim = new OfflineSimulation(842136, {
    seed: 842136,
    x: 176,
    y: -112,
    hp: 73,
    kills: 3,
    defeated: ["slime-a"],
  });
  assert.equal(sim.player.x, 16);
  assert.equal(sim.player.y, 16);
  assert.equal(sim.player.hp, 73);
  assert.equal(sim.kills, 3);
  assert.ok(sim.defeated.has("slime-a"));
});
