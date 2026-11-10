import test from "node:test";
import assert from "node:assert/strict";
import { caveEntranceInCell, caveEntranceNear, caveThemeAt, caveEntrancesInArea } from "../src/world/caves.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { CaveFloor, CAVE_WIDTH, CAVE_HEIGHT, CAVE_EXIT } from "../src/world/caveFloor.ts";

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

test("caverna de treino fica fora da vila, contém cinco slimes e premia só uma vez", async () => {
  const { villageGround } = await import("../src/world/village.ts");
  const { OfflineSimulation } = await import("../src/engine/OfflineSimulation.ts");
  const { applyCaveVictories } = await import("../src/engine/rooms/CaveRewards.ts");
  for (const seed of [42,842136,987654321]) {
    const entry=caveEntranceInCell(0,0,seed);
    assert.ok(entry);
    assert.equal(entry.tileX,44);
    assert.equal(entry.tileY,11);
    assert.equal(villageGround(entry.tileX,entry.tileY),null);
    const cave=new CaveRoom(entry);
    assert.ok(cave.monsters.size>=5,"a gruta deve conter cinco slimes de treinamento");
    assert.ok([...cave.monsters.values()].every(m=>m.kind==="slime"));
    const total=cave.monsters.size;
    const sim=new OfflineSimulation(seed);
    for(const mob of [...cave.monsters.values()].slice(0,5))mob.hp=0;
    cave.update(1/60,{x:0,y:0});
    assert.equal(applyCaveVictories(sim,cave),true);
    assert.equal(sim.trainingKills,5);
    assert.equal(sim.inventory.claimAelaReward(sim.trainingKills),true);
    assert.equal(applyCaveVictories(sim,cave),false);
    const revisit=new CaveRoom(entry,100,100,sim.defeated);
    assert.equal(revisit.monsters.size,total-5);
  }
});
test("abates na superfície não contam no tutorial, mas preservam a progressão geral", async () => {
  const { OfflineSimulation } = await import("../src/engine/OfflineSimulation.ts");
  const sim=new OfflineSimulation(842136);
  sim.update(1/60,{x:0,y:0},false);
  sim.slimes.clear();
  sim.player.x=16; sim.player.y=16;
  assert.equal(sim.trainingKills,0);
  const original=sim.snapshot();
  assert.equal(original.trainingKills,0);
  const restored=new OfflineSimulation(sim.seed,{...original,kills:4,trainingKills:0});
  assert.equal(restored.kills,4);
  assert.equal(restored.trainingKills,0);
  assert.equal(restored.inventory.claimAelaReward(restored.trainingKills),false);
});