import test from "node:test";
import assert from "node:assert/strict";
import { caveEntranceInCell, caveEntranceNear, caveThemeAt, caveEntrancesInArea } from "../src/world/caves.ts";
import { CaveFloor, CaveRoom, CAVE_WIDTH, CAVE_HEIGHT, CAVE_EXIT } from "../src/engine/CaveRoom.ts";

test("cavernas seguem a região: gelo, deserto, costa, montanha e brejo sudeste", () => {
  assert.equal(caveThemeAt(0,-26000),"glacial");
  assert.equal(caveThemeAt(0,26000),"desert");
  assert.equal(caveThemeAt(26000,0),"coastal");
  assert.equal(caveThemeAt(-26000,0),"basalt");
  assert.equal(caveThemeAt(19000,17000),"marsh");
  assert.equal(caveThemeAt(0,0),"verdant");
});

test("entradas estáveis por célula e seed, sem alterar a colisão da superfície", () => {
  const seed=842136;
  const first=caveEntranceInCell(0,0,seed);
  assert.ok(first,"a primeira caverna precisa existir perto da vila");
  assert.deepEqual(first,caveEntranceInCell(0,0,seed));
  assert.deepEqual(caveEntranceNear(first.x,first.y,seed),first);
  assert.ok(caveEntrancesInArea(first.tileX-1,first.tileY-1,first.tileX+1,first.tileY+1,seed)
    .some(e=>e.id===first.id));
  assert.equal(caveEntranceNear(first.x+300,first.y+300,seed,15),null);
  assert.deepEqual(caveEntrancesInArea(-1e6,-1e6,1e6,1e6,seed),[]);
});

test("cada primeiro andar tem câmaras conectadas, paredes sólidas e saída transitável", () => {
  for(const seed of [42,842136,987654321]) {
    const entry=caveEntranceInCell(0,0,seed);
    assert.ok(entry);
    const f=new CaveFloor(entry);
    assert.deepEqual(f.cells,new CaveFloor(entry).cells);
    assert.equal(f.at(-1,12),0);
    assert.equal(f.at(CAVE_WIDTH,2),0);
    assert.equal(f.at(CAVE_EXIT.x,CAVE_EXIT.y),1);
    const walkable=f.cells.reduce((s,t)=>s+(t===1?1:0),0);
    assert.ok(walkable>180 && walkable<1100,"a caverna não deve ser vazia nem bloqueada");
    const seen=new Set<string>(),todo:[[number,number]]=[[CAVE_EXIT.x,CAVE_EXIT.y]];
    while(todo.length) {
      const [x,y]=todo.pop()!;
      const key=x+","+y;
      if(seen.has(key)||f.at(x,y)!==1)continue;
      seen.add(key);
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])todo.push([x+dx,y+dy]);
    }
    assert.ok(seen.size>=150,"as câmaras devem permanecer conectadas");
    assert.equal(seen.size,walkable,"toda região transitável deve estar conectada à saída");
    assert.equal(f.collision.canMove(-1,30),false);
    const room=new CaveRoom(entry);
    assert.equal(room.collision.canMove(room.player.x,room.player.y),true);
    assert.equal(room.nearExit,false);
    room.player.y=(CAVE_EXIT.y+.5)*32;
    assert.equal(room.reachedExit,true);
  }
});
