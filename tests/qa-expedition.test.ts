import assert from "node:assert/strict";
import test from "node:test";
import { runExpeditionQa } from "../src/qa/QaExpedition.ts";

test("expedição enfrenta múltiplos slimes naturais, coletando e cruzando regiões", () => {
  const report = runExpeditionQa();
  assert.equal(report.status, "passed", JSON.stringify(report.findings.filter(f => f.status !== "passed")));
  assert.ok(report.kills >= 2);
  assert.equal(report.experience, report.kills * 10);
  assert.ok(report.level >= 1);
  assert.equal(report.gelCollected, 2);
  assert.ok(report.regionsVisited.length >= 2);
  assert.ok(report.walkedUnits > 100);
  assert.ok(report.tilesVisited > 3);
  assert.equal(report.encounters.filter(e => e.outcome === "defeated").length, 2);
  assert.ok(report.encounters.every(e => !e.monsterId.startsWith("qa-")));
  assert.equal(report.capabilities.multiplayer, false);
});
test("expedição reproduz a mesma trajetória para seed e limites idênticos", () => {
  assert.deepEqual(runExpeditionQa({ seed: 842136 }), runExpeditionQa({ seed: 842136 }));
});
test("expedição rejeita opções inseguras ou descontroladas", () => {
  for (const options of [
    { seed: -1 }, { seed: NaN }, { seed: 4294967296 },
    { targetKills: 0 }, { targetKills: 5 }, { maxTicks: 119 },
    { maxTicks: Infinity }, { maxTicks: 24001 },
  ]) assert.throws(() => runExpeditionQa(options), RangeError);
});
