import assert from "node:assert/strict";
import test from "node:test";
import { SnapshotTimeline } from "../src/net/SnapshotTimeline.ts";
import type { HeroState } from "../src/shared/protocol.ts";

const hero = (patch: Partial<HeroState> = {}): HeroState => ({
  id: "a", name: "Hero", x: 16, y: 16, hp: 100, kills: 0,
  faceX: 1, faceY: 0, walkTime: 0, attackTime: 0, vx: 0, vy: 0,
  stepTarget: null, ...patch,
});
const close = (actual: number, expected: number): void => {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
};
const start = (timeline: SnapshotTimeline): void => {
  timeline.advance(0.1); timeline.advance(0.08);
};

test("apresentação segue duas pernas do passo sem atravessar a quina", () => {
  const timeline = new SnapshotTimeline();
  timeline.push(1, [hero({ x: 46, stepTarget: { x: 48, y: 16 } })], []);
  timeline.push(1.1, [hero({ x: 48, y: 26, walkTime: 1.44, stepTarget: { x: 48, y: 48 } })], []);
  start(timeline);
  const mid = timeline.advance(0.05)!.players[0]!;
  close(mid.x, 48); close(mid.y, 20); close(mid.walkTime, 0.72);
  close(mid.faceX, 0); close(mid.faceY, 1);
  assert.ok(mid.vy > 0);
  const end = timeline.advance(0.05)!.players[0]!;
  close(end.x, 48); close(end.y, 26);
});

test("a chegada fica exata e o relógio de ataque nunca reinicia a cada pacote", () => {
  const timeline = new SnapshotTimeline();
  timeline.push(1, [hero()], []);
  timeline.push(1.1, [hero({ x: 28, walkTime: 1.44, attackTime: 0.23, faceX: 0, faceY: -1 })], []);
  start(timeline);
  timeline.advance(0.02);
  // The next state confirms the same swing rather than beginning it again.
  timeline.push(1.2, [hero({ x: 28, walkTime: 1.44, attackTime: 0.13 })], []);
  assert.equal(timeline.advance(0.02)!.players[0]!.attackTime, 0);
  const attacking = timeline.advance(0.02)!.players[0]!;
  close(attacking.attackTime, 0.27);
  assert.deepEqual([attacking.faceX, attacking.faceY], [0, -1]);
  timeline.advance(0.04);
  close(timeline.advance(0.02)!.players[0]!.attackTime, 0.21);
  const same = timeline.advance(0.01)!.players[0]!;
  close(same.attackTime, 0.20); close(same.x, 28);
  for (let i = 0; i < 10; i++) timeline.advance(0.05);
  const stopped = timeline.advance(0)!.players[0]!;
  close(stopped.x, 28); close(stopped.attackTime, 0); close(stopped.vx!, 0);
});

test("a espada visível em repouso acompanha a troca sem exigir ataque", () => {
  const timeline = new SnapshotTimeline();
  timeline.push(1, [hero({ equippedWeapon: "forge" })], []);
  timeline.push(1.1, [hero({ equippedWeapon: "forge" })], []);
  start(timeline);
  const idle = timeline.advance(0.05)!.players[0]!;
  assert.equal(idle.attackTime, 0);
  assert.equal(idle.equippedWeapon, "forge");
  timeline.push(1.2, [hero()], []);
  const swapped = timeline.advance(0.08)!.players[0]!;
  assert.equal(swapped.attackTime, 0);
  assert.equal(swapped.equippedWeapon, undefined);
});

test("jitter mantém progresso monótono e pacotes antigos não retrocedem o herói", () => {
  const timeline = new SnapshotTimeline();
  timeline.push(1, [hero()], []);
  timeline.push(1.1, [hero({ x: 28, walkTime: 1.44, stepTarget: { x: 48, y: 16 } })], []);
  assert.equal(timeline.push(1.05, [hero({ x: -10 })], []), false);
  assert.equal(timeline.push(NaN, [], []), false);
  start(timeline);
  let x = 16;
  for (let i = 0; i < 6; i++) {
    if (i === 4) timeline.push(1.2, [hero({ x: 40, walkTime: 2.88, stepTarget: { x: 48, y: 16 } })], []);
    const current = timeline.advance(0.02)!.players[0]!;
    assert.ok(current.x >= x); x = current.x;
  }
  assert.ok(x > 30 && x <= 30.4);
});

test("a pose da forjada começa junto do ataque reconstruído e dura até o fim", () => {
  const timeline = new SnapshotTimeline();
  timeline.push(1, [hero()], []);
  timeline.push(1.1, [hero({ attackTime: 0.23, attackWeapon: "forge" })], []);
  timeline.push(1.2, [hero({ attackTime: 0.13, attackWeapon: "forge" })], []);
  start(timeline);
  const before = timeline.advance(0.04)!.players[0]!;
  assert.equal(before.attackTime, 0);
  assert.equal(before.attackWeapon, "starter");
  const strike = timeline.advance(0.02)!.players[0]!;
  close(strike.attackTime, 0.27);
  assert.equal(strike.attackWeapon, "forge");
  timeline.push(1.3, [hero({ attackTime: 0.03, attackWeapon: "forge" })], []);
  timeline.push(1.4, [hero()], []);
  for (let i = 0; i < 5; i++) timeline.advance(0.05);
  const end = timeline.advance(0.04)!.players[0]!;
  assert.equal(end.attackTime, 0);
  assert.equal(end.attackWeapon, "starter");
});

test("a passada continua após 20 segundos com o relógio da sala ligeiramente mais lento", () => {
  for (const intervals of [[6], [6, 9, 6, 6, 9]]) {
    const timeline = new SnapshotTimeline();
    let previous: HeroState | undefined;
    let nextPacket = 0, packet = 0;
    for (let frame = 0; frame < 2400; frame++) {
      // Snapshots alternate between 100 and 150 ms, with 0.6% clock drift.
      if (frame === nextPacket) {
        const time = frame / 60 * 0.994;
        timeline.push(time, [hero({ x: 16 + 126 * time, vx: 126, walkTime: 126 * time * 0.12 })], []);
        nextPacket += intervals[packet++ % intervals.length]!;
      }
      const current = timeline.advance(1 / 60)!.players[0]!;
      if (frame >= 20 * 60) {
        assert.ok(current.vx! > 0, `passada parada em ${(frame / 60).toFixed(2)} s`);
        assert.ok(current.x > previous!.x);
        assert.ok(current.walkTime > previous!.walkTime);
      }
      previous = current;
    }
  }
});

test("respawn salta para o novo ponto sem interpolar através do mapa", () => {
  const timeline = new SnapshotTimeline();
  timeline.push(1, [hero({ x: -800, walkTime: 100 })], []);
  timeline.push(1.1, [hero()], []);
  start(timeline);
  assert.equal(timeline.advance(0.05)!.players[0]!.x, -800);
  assert.equal(timeline.advance(0.05)!.players[0]!.x, 16);
  timeline.reset();
  assert.equal(timeline.advance(0.05), null);
  assert.equal(timeline.push(0.1, [hero({ id: "new" })], []), true);
});

test("surgimento e remoção de entidades obedecem ao tempo apresentado", () => {
  const timeline = new SnapshotTimeline();
  timeline.push(1, [hero()], [{ id: "slime", x: 40, y: 16, hp: 2, bounce: 0 }]);
  timeline.push(1.1, [hero(), hero({ id: "b" })], []);
  start(timeline);
  const before = timeline.advance(0.05)!;
  assert.equal(before.players.length, 1);
  assert.equal(before.mobs.length, 1);
  const after = timeline.advance(0.05)!;
  assert.equal(after.players.length, 2);
  assert.equal(after.mobs.length, 0);
});


test("relógio se recupera de servidor atrasado sem reproduzir snapshots antigos", () => {
  const timeline = new SnapshotTimeline();
  timeline.push(1, [hero()], []);
  for (let i = 0; i < 10; i++) timeline.advance(0.1);
  timeline.push(1.1, [hero({ x: 28, walkTime: 1.44 })], []);
  close(timeline.advance(0)!.players[0]!.x, 28);
  timeline.push(1.2, [hero({ x: 40, walkTime: 2.88 })], []);
  start(timeline);
  const recovered = timeline.advance(0.05)!.players[0]!;
  close(recovered.x, 34);
});


test("perda de pacote que esconde duas curvas não inventa um atalho diagonal", () => {
  const timeline = new SnapshotTimeline();
  timeline.push(1, [hero({ x: 47, stepTarget: { x: 48, y: 16 } })], []);
  start(timeline);
  timeline.push(1.35, [hero({ x: 80, y: 23, walkTime: 4.8, stepTarget: { x: 80, y: 48 } })], []);
  for (let i = 0; i < 3; i++) {
    const held = timeline.advance(0.1)!.players[0]!;
    assert.deepEqual([held.x, held.y], [47, 16]);
  }
  const arrived = timeline.advance(0.05)!.players[0]!;
  assert.deepEqual([arrived.x, arrived.y], [80, 23]);
});

test("equipamentos visuais da sala seguem o snapshot recente e somem ao retirar", () => {
  const timeline = new SnapshotTimeline();
  timeline.push(1, [hero({ gear: { head: "trail-helm" } })], []);
  timeline.push(1.1, [hero({ gear: { shield: "willow-shield" } })], []);
  start(timeline);
  const during = timeline.advance(0.04)!.players[0]!;
  assert.equal(during.gear?.shield, "willow-shield");
  assert.equal(during.gear?.head, undefined);
  timeline.push(1.2, [hero()], []);
  const removed = timeline.advance(0.12)!.players[0]!;
  assert.equal(removed.gear, undefined);
});
