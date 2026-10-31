import test from "node:test";
import assert from "node:assert/strict";
import { findWalkingPath, clearPath, TapNavigator } from "../src/engine/TapNavigator.ts";
import { isShortTap, screenToWorld, screenToInterior } from "../src/input/tap.ts";
import { interiorCollision, ROOM_FURNITURE } from "../src/engine/InteriorRoom.ts";
import type { CollisionMap } from "../src/world/collision.ts";

const open: CollisionMap = { canMove: () => true };
const wall: CollisionMap = { canMove: (x, y) =>
  !(x >= 24 && x <= 64 && y >= -24 && y <= 48) };

test("toque curto tem tolerância sem converter arrasto ou gesto prolongado em destino", () => {
  assert.equal(isShortTap(10, 120), true);
  for (const [distance, ms] of [[14, 100], [4, 800], [NaN, 10], [1, -5]])
    assert.equal(isShortTap(distance, ms), false);
});
test("projeção de tela considera câmera, zoom e limites do canvas", () => {
  assert.deepEqual(screenToWorld({ x: 200, y: 100 }, 400, 200, { x: 50, y: 80 }, 2), { x: 50, y: 80 });
  assert.deepEqual(screenToWorld({ x: 400, y: 200 }, 400, 200, { x: 50, y: 80 }, 2), { x: 150, y: 130 });
  assert.equal(screenToWorld({ x: -1, y: 10 }, 400, 200, { x: 0, y: 0 }, 1), null);
  const center = screenToInterior({ x: 195, y: 422 / 2 }, 390, 422);
  assert.ok(center && Math.abs(center.x - 180) < 0.01 && Math.abs(center.y - 132) < 0.01);
  assert.equal(screenToInterior({ x: 0, y: 0 }, 390, 422), null);
});
test("rota direta preserva velocidade e termina perto do alvo", () => {
  assert.deepEqual(findWalkingPath({ x: 0, y: 0 }, { x: 80, y: 0 }, open), [{ x: 80, y: 0 }]);
  const nav = new TapNavigator();
  assert.equal(nav.go({ x: 0, y: 0 }, { x: 80, y: 0 }, open), true);
  assert.ok(nav.direction({ x: 0, y: 0 }, 1 / 60).x > 0.99);
  assert.ok(nav.direction({ x: 75, y: 0 }, 1 / 60).x < 0.3);
  assert.deepEqual(nav.direction({ x: 77, y: 0 }, 1 / 60), { x: 0, y: 0 });
  assert.equal(nav.target, null);
});
test("A* contorna uma parede sem atravessar quinas", () => {
  const start = { x: 0, y: 0 }, end = { x: 96, y: 0 };
  assert.equal(clearPath(start, end, wall), false);
  const route = findWalkingPath(start, end, wall);
  assert.ok(route && route.length >= 2);
  let previous = start;
  for (const point of route) {
    assert.equal(clearPath(previous, point, wall), true);
    previous = point;
  }
  assert.deepEqual(route[route.length - 1], end);
});
test("obstáculos e alcance inválido recusam caminhada sem travar", () => {
  const nav = new TapNavigator();
  assert.equal(nav.go({ x: 0, y: 0 }, { x: 32, y: 0 }, { canMove: x => x < 20 }), false);
  assert.equal(nav.go({ x: 0, y: 0 }, { x: 900, y: 0 }, open), false);
  assert.equal(nav.go({ x: 0, y: 0 }, { x: NaN, y: 0 }, open), false);
  assert.deepEqual(nav.direction({ x: 0, y: 0 }, 1 / 60), { x: 0, y: 0 });
  assert.equal(nav.target, null);
});
test("interiores calculam rota sobre a mesma mobília usada na colisão", () => {
  for (const furniture of Object.values(ROOM_FURNITURE)) {
    const world = interiorCollision(furniture);
    const start = { x: 180, y: 212 }, target = { x: 100, y: 180 };
    const route = findWalkingPath(start, target, world);
    assert.ok(route);
    let previous = start;
    for (const point of route!) {
      assert.equal(clearPath(previous, point, world), true);
      previous = point;
    }
  }
});
test("trava de segurança encerra navegação se herói não progride", () => {
  const nav = new TapNavigator();
  nav.go({ x: 0, y: 0 }, { x: 100, y: 0 }, open);
  for (let i = 0; i < 60; i++) nav.direction({ x: 0, y: 0 }, 1 / 60);
  assert.equal(nav.target, null);
});
