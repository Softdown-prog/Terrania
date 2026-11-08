import test from "node:test";
import assert from "node:assert/strict";
import { PresenceTracker } from "../src/presence.ts";

const id = (n: number): string => "sessao-de-teste-" + String(n).padStart(4, "0");

test("presença: conta ids válidos e rejeita identificadores malformados", () => {
  const tracker = new PresenceTracker();
  assert.equal(tracker.beat(id(1), 0), "ok");
  assert.equal(tracker.beat(id(2), 0), "ok");
  for (const bad of [undefined, null, 5, "", "curto", "x".repeat(65), "com espaço no meio!!", "../../etc/passwd-aaaa"])
    assert.equal(tracker.beat(bad, 0), "invalid", String(bad));
  assert.equal(tracker.count(0), 2);
});

test("presença: o id expira depois do prazo e some da contagem", () => {
  const tracker = new PresenceTracker(45_000);
  tracker.beat(id(1), 0);
  assert.equal(tracker.count(44_999), 1);
  // A varredura roda no máximo uma vez por segundo (evita varrer o mapa a cada GET): tolerância de 1 s.
  assert.equal(tracker.count(46_000), 0);
});

test("presença: um novo sinal depois do intervalo mínimo renova o prazo", () => {
  const tracker = new PresenceTracker(45_000, 10, 5_000);
  tracker.beat(id(1), 0);
  tracker.beat(id(1), 20_000);
  assert.equal(tracker.count(50_000), 1, "renovado em 20 s, vale até 65 s");
  assert.equal(tracker.count(65_000), 0);
});

test("presença: sinais repetidos em rajada não prolongam a vida do id", () => {
  const tracker = new PresenceTracker(45_000, 10, 5_000);
  tracker.beat(id(1), 0);
  for (let t = 100; t < 5_000; t += 100) assert.equal(tracker.beat(id(1), t), "ok");
  assert.equal(tracker.count(45_000), 0, "a rajada dentro do intervalo mínimo não renova");
});

test("presença: o limite global impede crescimento da memória e é liberado pela expiração", () => {
  const tracker = new PresenceTracker(45_000, 3, 5_000);
  for (let n = 0; n < 3; n++) assert.equal(tracker.beat(id(n), 0), "ok");
  assert.equal(tracker.beat(id(99), 1_000), "full");
  assert.equal(tracker.count(1_000), 3, "o contador não passa do limite");
  assert.equal(tracker.beat(id(0), 6_000), "ok", "quem já está contado continua podendo renovar");
  assert.equal(tracker.beat(id(99), 46_000), "ok", "com vagas expiradas, entra de novo");
});
