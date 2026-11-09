import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { experienceForLevel } from "../src/engine/Experience.ts";
import { runMountAction } from "../src/engine/MountActions.ts";
import { STABLE_MASTER, WILD_HOOFPRINTS, WILD_WARHORSE, sampleMountCaptureLoot } from "../src/engine/MountStable.ts";
import { MOUNT_MESSAGES } from "../src/game/messages/mountMessages.ts";

/** Simulação real no ponto indicado, com nível e gel dados. */
function sim(at: { x: number; y: number }, level: number, gel: number): OfflineSimulation {
  const s = new OfflineSimulation(842136);
  s.experience = experienceForLevel(level);
  for (let i = 0; i < gel; i++) s.inventory.addGel();
  s.player.x = at.x; s.player.y = at.y;
  return s;
}
const move = (s: OfflineSimulation, at: { x: number; y: number }): void => { s.player.x = at.x; s.player.y = at.y; };

test("montaria: a missão do Cavalo de Batalha inteira pelo motor, com o que salvar e o que interromper em cada passo", () => {
  const s = sim(STABLE_MASTER, 15, 18);
  const step = (action: Parameters<typeof runMountAction>[1]) => runMountAction(s, action);

  assert.deepEqual(step("build"), { result: "built", persist: true, stopMovement: false });
  assert.equal(s.inventory.gel, 6, "o cercado custa 12 de gel");
  assert.deepEqual(step("train"), { result: "trained", persist: true, stopMovement: false });
  s.kills = 3;
  assert.deepEqual(step("start-warhorse"), { result: "quest-started", persist: true, stopMovement: false });
  move(s, WILD_HOOFPRINTS);
  assert.equal(step("inspect-tracks").result, "tracks-found");
  move(s, WILD_WARHORSE);
  s.kills = 7;
  assert.deepEqual(step("tame"), { result: "slimes-needed", persist: false, stopMovement: false }, "faltam abates: nada a salvar");
  s.kills = 8;
  move(s, STABLE_MASTER);
  assert.equal(step("make-halter").result, "halter-made");
  assert.equal(s.inventory.gel, 3, "o cabresto custa 3 de gel");
  move(s, WILD_WARHORSE);
  assert.equal(step("tame").result, "calmed");

  move(s, STABLE_MASTER);
  const before = { ...s.inventory.materials };
  assert.deepEqual(step("return-warhorse"), { result: "returned", persist: true, stopMovement: false });
  const loot = sampleMountCaptureLoot("warhorse", s.seed);
  const after = s.inventory.materials;
  for (const item of loot) assert.equal(after[item], (before[item] ?? 0) + loot.filter(x => x === item).length, "saque da captura: " + item);
  assert.equal(step("return-warhorse").result, "missing-quest", "devolver duas vezes não duplica o saque");
  assert.deepEqual(s.inventory.materials, after);

  assert.deepEqual(step("mount-warhorse"), { result: "mounted", persist: true, stopMovement: true });
  assert.deepEqual(step("dismount"), { result: "dismounted", persist: true, stopMovement: true });
});

test("montaria: recusas não salvam nem interrompem o movimento, e cada resultado tem texto", () => {
  const refusals: Array<[string, OfflineSimulation, Parameters<typeof runMountAction>[1], string]> = [
    ["sem gel", sim(STABLE_MASTER, 15, 0), "build", "no-gel"],
    ["longe do estábulo", sim({ x: 0, y: 0 }, 15, 30), "build", "too-far"],
    ["sem cercado para treinar", sim(STABLE_MASTER, 15, 0), "train", "no-stable"],
    ["sem missão para devolver", sim(STABLE_MASTER, 15, 0), "return-warhorse", "missing-quest"],
  ];
  for (const [label, s, action, expected] of refusals) {
    const outcome = runMountAction(s, action);
    assert.equal(outcome.result, expected, label);
    assert.equal(outcome.persist, false, label + ": nada mudou, não salvar");
    assert.equal(outcome.stopMovement, false, label);
    assert.ok(MOUNT_MESSAGES[outcome.result].length > 10, label + ": falta texto");
  }
});
