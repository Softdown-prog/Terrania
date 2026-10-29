import test from "node:test";
import assert from "node:assert/strict";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { moveBody, type CollisionMap } from "../src/world/collision.ts";
import { canStrike } from "../src/engine/combat.ts";
import { Camera } from "../src/render/Camera.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
const floor: CollisionMap = { canMove: () => true };
function travel(steps: number, x: number, y: number): Player {
  const player = new Player();
  for (let i = 0; i < steps; i++) player.update(1 / steps, { x, y }, floor);
  return player;
}
test("acceleration agrees at server and client rates; diagonal speed is bounded", () => {
  const server = travel(20, 1, 0),
    client = travel(60, 1, 0),
    diagonal = travel(60, 1, 1);
  assert.ok(Math.abs(server.x - client.x) < 0.001);
  assert.ok(
    Math.abs(Math.hypot(diagonal.x - 16, diagonal.y - 16) - (client.x - 16)) <
      0.001,
  );
  assert.ok(client.x - 16 < 126 && client.x - 16 > 115);
});
test("release brakes the player and blocked steps do not animate walking", () => {
  const player = travel(60, 1, 0),
    x = player.x;
  for (let i = 0; i < 30; i++) player.update(1 / 60, { x: 0, y: 0 }, floor);
  assert.ok(player.x - x < 5.1);
  const blocked = new Player();
  blocked.update(0.05, { x: 1, y: 0 }, { canMove: () => false });
  assert.equal(blocked.walkTime, 0);
  assert.equal(blocked.x, 16);
});
test("swept movement cannot tunnel through a wall and still slides along it", () => {
  const body = { x: 0, y: 0 };
  moveBody(body, 100, 30, { canMove: (x) => x < 40 || x > 60 });
  assert.ok(body.x < 40);
  assert.ok(Math.abs(body.y - 30) < 0.001);
});
test("strike has windup, happens once and respects its cooldown", () => {
  const player = new Player();
  assert.equal(player.startAttack(), true);
  assert.equal(player.consumeStrike(), false);
  player.update(0.08, { x: 0, y: 0 }, floor);
  assert.equal(player.consumeStrike(), true);
  assert.equal(player.consumeStrike(), false);
  assert.equal(player.startAttack(), false);
  for (let i = 0; i < 5; i++) player.update(0.1, { x: 0, y: 0 }, floor);
  assert.equal(player.startAttack(), true);
});
test("sword respects range, direction and intervening obstacles", () => {
  const attacker = { x: 0, y: 0, faceX: 1, faceY: 0 };
  assert.equal(canStrike(attacker, { x: 40, y: 0 }, floor), true);
  assert.equal(canStrike(attacker, { x: -30, y: 0 }, floor), false);
  assert.equal(canStrike(attacker, { x: 60, y: 0 }, floor), false);
  assert.equal(
    canStrike(attacker, { x: 40, y: 0 }, { canMove: (x) => x < 20 }),
    false,
  );
});
test("damage grants a short grace period and knockback obeys collision", () => {
  const player = new Player();
  assert.equal(player.takeDamage(9, 0, 16), true);
  assert.equal(player.takeDamage(9, 0, 16), false);
  assert.equal(player.hp, 91);
  const slime = new Slime("test", 10, 10);
  slime.takeHit(0, 10);
  slime.update(0.05, player, { canMove: (x) => x <= 12 });
  assert.ok(slime.x <= 12);
  assert.equal(slime.hp, 1);
});
test("offline combat applies one hit per swing after windup", () => {
  const sim = new OfflineSimulation(842136);
  sim.update(0, { x: 0, y: 0 }, false);
  sim.slimes.clear();
  const slime = new Slime("test", 50, 16);
  sim.slimes.set(slime.id, slime);
  sim.player.faceX = 1;
  sim.player.faceY = 0;
  sim.update(1 / 60, { x: 0, y: 0 }, true);
  assert.equal(slime.hp, 2);
  for (let i = 0; i < 15; i++) sim.update(1 / 60, { x: 0, y: 0 }, false);
  assert.equal(slime.hp, 1);
  assert.equal(sim.kills, 0);
});
test("camera damping is time based, bounds zoom and snaps after teleport", () => {
  const a = new Camera(),
    b = new Camera(),
    target = { x: 100, y: 50, vx: 0, vy: 0 };
  for (let i = 0; i < 20; i++) a.update(0.05, target);
  for (let i = 0; i < 60; i++) b.update(1 / 60, target);
  assert.ok(Math.abs(a.x - b.x) < 0.001);
  a.setZoom(100);
  assert.equal(a.targetZoom, 2.5);
  a.setZoom(-1);
  assert.equal(a.targetZoom, 1);
  a.reducedMotion = true;
  a.shake(1);
  a.update(0.05, { x: 1000, y: 1000, vx: 126, vy: 0 });
  assert.equal(a.renderX, 1000);
  assert.equal(a.renderY, 1000);
});
