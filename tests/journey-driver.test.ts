import test from "node:test";
import assert from "node:assert/strict";
import { driveJourney, type JourneyFrame } from "../src/game/journeyDriver.ts";
import { Journey } from "../src/engine/movement/Journey.ts";
import { TapNavigator } from "../src/engine/movement/TapNavigator.ts";
import { TravelState } from "../src/game/TravelState.ts";
import type { CollisionMap } from "../src/world/collision.ts";

/** Um quadro da viagem (ADR 0099): quando pede trecho, quando entrega ao navegador, e quando a viagem é interrompida por dano ou perigo. */
const open: CollisionMap = { canMove: () => true };
const center = (p: { x: number; y: number }) => ({ x: (Math.floor(p.x / 32) + .5) * 32, y: (Math.floor(p.y / 32) + .5) * 32 });
function frame(over: Partial<JourneyFrame> = {}): JourneyFrame & { journey: Journey; navigator: TapNavigator } {
  const journey = new Journey(), navigator = new TapNavigator();
  return { journey, navigator, collision: open, from: { x: 16, y: 16 }, tileSteps: false, snap: p => p, hurt: false, threatened: false, ...over } as JourneyFrame & { journey: Journey; navigator: TapNavigator };
}

test("sem viagem nada acontece", () => {
  const f = frame(); assert.equal(driveJourney(f), null); assert.equal(f.navigator.target, null);
});

test("com viagem e o herói parado, entrega o primeiro trecho ao navegador", () => {
  const f = frame(); f.journey.start({ x: 3016, y: 16 });
  assert.equal(driveJourney(f), null);
  assert.deepEqual(f.navigator.target, { x: 576, y: 16 }, "o primeiro trecho de 560 a partir de (16,16)");
  assert.equal(f.journey.active, true);
});

test("enquanto o navegador anda o trecho, não pede outro", () => {
  const f = frame(); f.journey.start({ x: 3016, y: 16 }); driveJourney(f);
  let planned = 0; const spy = f.journey.plan.bind(f.journey); f.journey.plan = (...args) => { planned++; return spy(...args); };
  assert.equal(driveJourney(f), null); assert.equal(planned, 0, "navegador ocupado: nada de planejar");
});

test("dano ou perigo interrompem a viagem e o trecho", () => {
  for (const key of ["hurt", "threatened"] as const) {
    const f = frame({ [key]: true }); f.journey.start({ x: 3016, y: 16 }); f.navigator.go({ x: 16, y: 16 }, { x: 300, y: 16 }, open);
    assert.equal(driveJourney(f), "danger", key); assert.equal(f.journey.active, false); assert.equal(f.navigator.target, null);
  }
  const quiet = frame({ hurt: true }); assert.equal(driveJourney(quiet), null, "sem viagem, dano não avisa nada");
});

test("chegou: avisa e a viagem se encerra", () => {
  const f = frame({ from: { x: 3000, y: 16 } }); f.journey.start({ x: 3016, y: 16 });
  assert.equal(driveJourney(f), "arrived"); assert.equal(f.journey.active, false);
});

test("sem caminho nenhum: desiste e avisa", () => {
  const f = frame({ collision: { canMove: (x, y) => x === 16 && y === 16 } }); f.journey.start({ x: 3016, y: 16 });
  assert.equal(driveJourney(f), "stuck"); assert.equal(f.journey.active, false);
});

test("no andar por tiles, os trechos vão a centros de tile", () => {
  const f = frame({ tileSteps: true, snap: center, from: { x: 16, y: 16 } }); f.journey.start(center({ x: 3016, y: 16 }));
  assert.equal(driveJourney(f), null);
  const target = f.navigator.target!; assert.deepEqual(target, center(target), "centro de tile");
  assert.ok(target.x > 400 && target.x < 700, "e perto dos 560 de sempre");
});

test("se o navegador do jogo recusa o trecho, a viagem desiste em vez de insistir", () => {
  const f = frame(); f.journey.start({ x: 3016, y: 16 });
  (f.navigator as unknown as { go: () => boolean }).go = () => false;
  assert.equal(driveJourney(f), "stuck"); assert.equal(f.journey.active, false);
});

test("o estado de viagem do jogo: parar tudo ou mudar de lugar cancela; parar só os passos (montar) não", () => {
  const travel = new TravelState();
  travel.journey.start({ x: 5000, y: 0 }); travel.stopSteps(); assert.equal(travel.journey.active, true, "montar e desmontar não cancelam a viagem");
  travel.stopMotion(); assert.equal(travel.journey.active, false, "mudar de lugar cancela");
  travel.journey.start({ x: 5000, y: 0 }); travel.stopAll(); assert.equal(travel.journey.active, false, "mundo novo cancela");
  const custom = new Journey(); assert.equal(new TravelState({ journey: custom }).journey, custom, "dublê aceito");
});
