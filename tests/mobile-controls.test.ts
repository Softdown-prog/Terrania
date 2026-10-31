import test from "node:test";
import assert from "node:assert/strict";
import { stickVector } from "../src/input/joystick.ts";

test("joystick ignora tremor central, sem arrastar o personagem", () => {
  assert.deepEqual(stickVector(0, 0, 40), { x: 0, y: 0, thumbX: 0, thumbY: 0 });
  const small = stickVector(3, 2, 40);
  assert.equal(small.x, 0);
  assert.equal(small.y, 0);
  assert.notEqual(small.thumbX, 0);
});
test("controle analógico preserva intensidade e direção diagonal", () => {
  const half = stickVector(20, 0, 40);
  assert.ok(half.x > 0.3 && half.x < 0.5);
  assert.equal(half.y, 0);
  const diagonal = stickVector(40, 40, 40);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12);
  assert.ok(Math.abs(Math.hypot(diagonal.thumbX, diagonal.thumbY) - 40) < 1e-12);
});
test("toque além da borda é limitado e dados inválidos não geram NaN", () => {
  assert.deepEqual(stickVector(1000, 0, 40), { x: 1, y: 0, thumbX: 40, thumbY: 0 });
  for (const result of [
    stickVector(NaN, 1, 40),
    stickVector(1, Infinity, 40),
    stickVector(2, 5, 0),
    stickVector(2, 5, NaN),
  ]) assert.deepEqual(result, { x: 0, y: 0, thumbX: 0, thumbY: 0 });
});
