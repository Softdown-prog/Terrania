import test from "node:test";
import assert from "node:assert/strict";
import { runNaturalQa } from "../src/qa/QaNatural.ts";

test("QA-BOT percorre mundo real e derrota slime de spawn natural", () => {
  const report = runNaturalQa(842136);
  assert.equal(report.status, "passed", JSON.stringify(report.findings));
  assert.ok(report.monstersDiscovered > 0);
  assert.ok(report.monstersReachable >= 1);
  assert.ok(report.targetMonsterId && !report.targetMonsterId.startsWith("qa-"));
  assert.ok(report.kills >= 1);
  assert.ok(report.gel >= 1);
  assert.ok(report.ticks > 30);
  assert.equal(report.capabilities.multiplayer, false);
});
test("bot natural é reproduzível para mesma seed", () => {
  assert.deepEqual(runNaturalQa(842136), runNaturalQa(842136));
});
test("bot natural rejeita seeds inválidas", () => {
  for (const seed of [-1, Infinity, Number.NaN, 4294967296]) {
    assert.throws(() => runNaturalQa(seed), RangeError);
  }
});
