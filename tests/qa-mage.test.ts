import assert from "node:assert/strict";
import test from "node:test";
import { runMageQa } from "../src/qa/QaMage.ts";
import { STAFF_IDS } from "../src/engine/character/Staves.ts";
import { gearIdsFor } from "../src/engine/character/Equipment.ts";

/** O bot de QA do Mago: confere o que ele promete em todo o conteúdo dele (cajados, roupas, comida, save), só com o motor real. */
const SEED = 842136;

test("o bot do Mago passa: nascimento, magia que derruba slime, onze cajados, quatorze peças, comida e save", () => {
  const report = runMageQa(SEED);
  assert.equal(report.status, "passed", JSON.stringify(report.findings.filter(item => item.status === "failed")));
  assert.equal(report.staves, STAFF_IDS.length); assert.equal(report.gearPieces, gearIdsFor("mage").length);
  const ids = report.findings.map(item => item.id);
  for (const id of ["spawn", "spawn-dressed", "cast-kills-slime", "loot", "gear-bonus-cap", "food-mana", "save-roundtrip"]) assert.ok(ids.includes(id), id);
  for (const staff of STAFF_IDS) assert.ok(ids.includes("staff-" + staff), staff);
  for (const piece of gearIdsFor("mage")) assert.ok(ids.includes("gear-" + piece), piece);
  assert.equal(report.totals.failed, 0); assert.equal(report.totals.passed, report.findings.length);
  assert.equal(report.findings.length, 7 + STAFF_IDS.length + gearIdsFor("mage").length);
});

test("relatório reproduzível e seeds inválidas rejeitadas", () => {
  assert.deepEqual(runMageQa(SEED), runMageQa(SEED));
  for (const seed of [-1, Number.NaN, Number.POSITIVE_INFINITY, 4294967296]) assert.throws(() => runMageQa(seed), RangeError);
});
