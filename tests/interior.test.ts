import test from "node:test";
import assert from "node:assert/strict";
import { InteriorRoom, INTERIOR_COLLISION, ROOM_HEIGHT, ROOM_WIDTH, FURNITURE } from "../src/engine/InteriorRoom.ts";
import { BUILDINGS } from "../src/world/village.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
test("todos os edifícios têm interior com entrada transitável e saída acessível", () => {
  for (const building of BUILDINGS) {
    const room = new InteriorRoom(building.id);
    assert.equal(room.building.id, building.id);
    assert.equal(INTERIOR_COLLISION.canMove(room.player.x, room.player.y), true);
    assert.equal(room.reachedExit, false);
    for(let i=0;i<32;i++) room.update(1/60,{x:0,y:1});
    assert.equal(room.reachedExit,true);
  }
  assert.throws(() => new InteriorRoom("inexistente"), /desconhecido/);
});
test("paredes e mobília bloqueiam, sem atravessar obstáculos", () => {
  assert.equal(INTERIOR_COLLISION.canMove(-1,100),false);
  assert.equal(INTERIOR_COLLISION.canMove(ROOM_WIDTH+1,100),false);
  assert.equal(INTERIOR_COLLISION.canMove(180,ROOM_HEIGHT+1),false);
  assert.equal(INTERIOR_COLLISION.canMove(180,0),false);
  for (const f of FURNITURE) {
    assert.equal(INTERIOR_COLLISION.canMove(f.x+f.width/2,f.y+f.height/2),false);
  }
  const room=new InteriorRoom("inn");
  for(let i=0;i<240;i++)room.update(1/60,{x:0,y:-1});
  assert.ok(room.player.y>142,"mesa sólida barra a passagem central");
  assert.equal(room.player.x,180);
  assert.equal(room.player.attackTime,0);
});
test("mudar de mapa interno não altera save do mundo externo", () => {
  const sim=new OfflineSimulation(842136);
  const before=sim.snapshot();
  const room=new InteriorRoom("council");
  for(let i=0;i<50;i++)room.update(1/60,{x:1,y:0});
  assert.deepEqual(sim.snapshot(),before);
  assert.equal(room.player.hp,100);
});
