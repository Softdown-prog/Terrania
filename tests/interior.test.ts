import test from "node:test";
import assert from "node:assert/strict";
import { InteriorRoom, ROOM_FURNITURE, ROOM_HEIGHT, ROOM_WIDTH } from "../src/engine/InteriorRoom.ts";
import { BUILDINGS } from "../src/world/village.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";

test("todos os interiores permitem entrar, caminhar e sair sem bloquear a porta", () => {
  for (const building of BUILDINGS) {
    const room = new InteriorRoom(building.id);
    assert.equal(room.building.id, building.id);
    assert.equal(room.collision.canMove(room.player.x, room.player.y), true);
    assert.equal(room.reachedExit, false);
    for (let i = 0; i < 32; i++) room.update(1 / 60, { x: 0, y: 1 });
    assert.equal(room.reachedExit, true);
  }
  assert.throws(() => new InteriorRoom("inexistente"), /desconhecido/);
});
test("cada sala tem arranjo próprio e colisão correspondente à mobília desenhada", () => {
  assert.notDeepEqual(ROOM_FURNITURE.council, ROOM_FURNITURE.forge);
  assert.notDeepEqual(ROOM_FURNITURE.forge, ROOM_FURNITURE.inn);
  for (const building of BUILDINGS) {
    const room = new InteriorRoom(building.id);
    assert.equal(room.collision.canMove(-1, 100), false);
    assert.equal(room.collision.canMove(ROOM_WIDTH + 1, 100), false);
    assert.equal(room.collision.canMove(180, ROOM_HEIGHT + 1), false);
    assert.equal(room.collision.canMove(180, 0), false);
    assert.equal(room.collision.canMove(Number.NaN, 100), false);
    for (const f of room.furniture) {
      assert.equal(room.collision.canMove(f.x + f.width / 2, f.y + f.height / 2), false);
    }
    for (let i = 0; i < 240; i++) room.update(1 / 60, { x: 0, y: -1 });
    assert.ok(room.player.y > 145, "mobília central não pode ser atravessada");
    assert.equal(room.player.x, 180);
    assert.equal(room.player.attackTime, 0);
  }
});
test("visitar outro interior não altera o save do mundo externo", () => {
  const sim = new OfflineSimulation(842136);
  const before = sim.snapshot();
  for (const b of BUILDINGS) {
    const room = new InteriorRoom(b.id);
    for (let i = 0; i < 50; i++) room.update(1 / 60, { x: 1, y: 0 });
  }
  assert.deepEqual(sim.snapshot(), before);
});
