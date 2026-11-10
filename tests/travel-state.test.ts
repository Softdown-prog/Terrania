import test from "node:test";
import assert from "node:assert/strict";
import { TravelState } from "../src/game/TravelState.ts";
import { ClassicCombat } from "../src/engine/combat/ClassicCombat.ts";
import { ClassicPursuit } from "../src/engine/combat/ClassicPursuit.ts";
import { ClassicTileWalker } from "../src/engine/movement/ClassicTileWalker.ts";
import { TapNavigator } from "../src/engine/movement/TapNavigator.ts";

/** Dublês que só anotam quem foi chamado, na ordem. */
function spied() {
  const calls: string[] = [];
  const part = (name: string, method: string) => ({ [method]: () => { calls.push(name + "." + method); } });
  const travel = new TravelState({
    navigator: part("navigator", "cancel") as unknown as TapNavigator,
    combat: part("combat", "reset") as unknown as ClassicCombat,
    pursuit: part("pursuit", "reset") as unknown as ClassicPursuit,
    walker: part("walker", "reset") as unknown as ClassicTileWalker,
  });
  return { travel, calls };
}

test("viagem: parar os passos cancela só a rota e o passo comprometido", () => {
  const { travel, calls } = spied();
  travel.stopSteps();
  assert.deepEqual([...calls].sort(), ["navigator.cancel", "walker.reset"]);
});

test("viagem: parar o movimento também encerra a perseguição, mas NUNCA mexe no combate", () => {
  const { travel, calls } = spied();
  travel.stopMotion();
  assert.deepEqual([...calls].sort(), ["navigator.cancel", "pursuit.reset", "walker.reset"]);
  assert.ok(!calls.some(c => c.startsWith("combat.")), "alvo e recarga do golpe ficam intactos");
});

test("viagem: parar tudo zera o combate (alvo e recarga) além do movimento", () => {
  const { travel, calls } = spied();
  travel.stopAll();
  assert.deepEqual([...calls].sort(), ["combat.reset", "navigator.cancel", "pursuit.reset", "walker.reset"]);
});

test("viagem: a perseguição automática começa ligada e é só um indicador, não é alterada pelas paradas", () => {
  const { travel } = spied();
  assert.equal(travel.autoFollow, true);
  travel.autoFollow = false;
  travel.stopAll();
  assert.equal(travel.autoFollow, false, "quem chama decide religar (novo mundo liga, sair da caverna desliga)");
});

test("viagem: com as peças reais, parar o movimento preserva a recarga do golpe e parar tudo a zera", () => {
  const travel = new TravelState();
  assert.ok(travel.combat instanceof ClassicCombat && travel.navigator instanceof TapNavigator);
  const target = new Map([["s1", { id: "s1", x: 0, y: 0, hp: 5 }]]);
  assert.equal(travel.combat.select("s1", target as never), true);
  // `remaining` é a recarga do golpe; só `reset` a zera, `cancel` e `stopMotion` não.
  (travel.combat as unknown as { remaining: number }).remaining = 1.2;
  travel.stopMotion();
  assert.equal((travel.combat as unknown as { remaining: number }).remaining, 1.2, "stopMotion preserva a recarga");
  travel.combat.cancel();
  assert.equal((travel.combat as unknown as { remaining: number }).remaining, 1.2, "cancel (porta de interior) preserva a recarga");
  travel.stopAll();
  assert.equal((travel.combat as unknown as { remaining: number }).remaining, 0, "stopAll zera a recarga");
  assert.equal(travel.combat.targetId, null);
});
