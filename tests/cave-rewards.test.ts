import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { applyCaveVictories, type CaveVictorySource } from "../src/engine/CaveRewards.ts";
import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS } from "../src/actors/CreatureCatalog.ts";
import { rollCreatureLoot } from "../src/actors/RegionalMonster.ts";

const kind = REGIONAL_CREATURE_KINDS[0];
const source = (victories: Array<{ id: string }>): CaveVictorySource => {
  let pending = victories.map(v => ({ kind, id: v.id }));
  return { player: { hp: 100, maxHp: 100 }, drainVictories: () => pending.splice(0) };
};

test("caverna: cada vitória rende experiência e saque uma única vez, mesmo se repetida ou reaberta", () => {
  const s = new OfflineSimulation(842136);
  assert.equal(applyCaveVictories(s, source([])), false, "sem vitórias nada muda");

  const gained = CREATURE_CATALOG[kind].experience;
  assert.equal(applyCaveVictories(s, source([{ id: "cave-a#1" }, { id: "cave-a#1" }])), true);
  assert.equal(s.experience, gained, "o mesmo id na mesma leva conta uma vez");
  assert.ok(s.defeated.has("cave-a#1"));

  const materials = { ...s.inventory.materials };
  for (const item of rollCreatureLoot(kind, "cave-a#1")) assert.ok((materials[item] ?? 0) >= 1, "saque: " + item);

  assert.equal(applyCaveVictories(s, source([{ id: "cave-a#1" }])), false, "voltar à caverna não premia de novo");
  assert.equal(s.experience, gained);
  assert.deepEqual(s.inventory.materials, materials);

  assert.equal(applyCaveVictories(s, source([{ id: "cave-a#2" }])), true);
  assert.equal(s.experience, gained * 2, "outra criatura premia normalmente");
});

test("caverna: a fonte é drenada, então as vitórias não se acumulam entre chamadas", () => {
  const s = new OfflineSimulation(842136);
  const cave = source([{ id: "cave-b#1" }]);
  assert.equal(applyCaveVictories(s, cave), true);
  assert.equal(applyCaveVictories(s, cave), false);
});
