import assert from "node:assert/strict";
import test from "node:test";
import { QA_BOT_ID, runQaBot } from "../src/qa/QaBot.ts";

test("bot interno cria relatório reproduzível sem conta ou navegador", () => {
  const a = runQaBot({ seed: 842136, maxTicks: 500 });
  const b = runQaBot({ seed: 842136, maxTicks: 500 });
  assert.deepEqual(a, b);
  assert.equal(a.botId, QA_BOT_ID);
  assert.equal(a.environment, "offline-memory");
  assert.equal(a.capabilities.multiplayer, false);
  assert.equal(a.capabilities.experience, false);
  assert.ok(a.ticks <= 500);
  assert.ok(a.totals.mapTilesVisited >= 1);
  assert.ok(a.checks.some(check => check.id === "aela" &&
    check.category === "interaction" && check.status === "passed"));
});
test("bot informa falhas e etapas não testadas sem declarar vitória", () => {
  const report = runQaBot({ maxTicks: 120 });
  assert.ok(report.checks.some(check => check.status !== "passed"));
  assert.notEqual(report.status, "passed");
  assert.equal(report.totals.passed + report.totals.failed + report.totals.skipped,
    report.checks.length);
  for (const check of report.checks) {
    assert.ok(Number.isFinite(check.at.x) && Number.isFinite(check.at.y));
    assert.ok(check.tick <= report.ticks);
  }
});
test("bot recusa seeds e limites inválidos", () => {
  for (const options of [
    { seed: -1 }, { seed: 4294967296 }, { seed: Number.NaN },
    { maxTicks: 0 }, { maxTicks: Number.POSITIVE_INFINITY }, { maxTicks: 36001 },
  ]) assert.throws(() => runQaBot(options), RangeError);
});

test("bot se aproxima de placas sólidas sem tentar atravessar o centro", () => {
  const report = runQaBot({ seed: 842136, maxTicks: 12000 });
  for (const id of ["entrance", "square"]) {
    const result = report.checks.find(check => check.id === id &&
      check.category === "interaction");
    assert.equal(result?.status, "passed", "placa acessível: " + id);
  }
  assert.ok(report.totals.interiorsVisited >= 1);
});
