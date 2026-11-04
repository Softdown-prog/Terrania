import assert from "node:assert/strict";
import test from "node:test";
import { runCombatQa } from "../src/qa/QaCombat.ts";

test("bot enfrenta cinco slimes, recolhe gel e usa poção via motor real", () => {
  const report = runCombatQa(842136);
  assert.equal(report.status, "passed", JSON.stringify(report.checks.filter(c => c.status !== "passed")));
  assert.equal(report.kills, 5);
  assert.equal(report.experience, 50);
  assert.equal(report.level, 2);
  assert.equal(report.maxHp, 110);
  assert.equal(report.checks.find(c => c.id === "experience-growth")?.status, "passed");
  assert.equal(report.gelCollected, 5);
  assert.equal(report.potionsAwarded, 2);
  assert.equal(report.potionsUsed, 1);
  assert.equal(report.totals.failed, 0);
  assert.equal(report.checks.filter(c => c.category === "combat" && c.status === "passed").length, 5);
  assert.equal(report.checks.filter(c => c.category === "loot" && c.status === "passed").length, 5);
  assert.equal(report.checks.find(c => c.id === "save-restore")?.status, "passed");
  assert.equal(report.capabilities.randomNaturalSpawns, false);
});
test("relatórios dos encontros controlados são reproduzíveis", () => {
  assert.deepEqual(runCombatQa(842136), runCombatQa(842136));
});
test("cenário rejeita seeds inválidas e não usa conta ou rede", () => {
  for (const seed of [-1, Number.NaN, Number.POSITIVE_INFINITY, 4294967296]) {
    assert.throws(() => runCombatQa(seed), RangeError);
  }
});
