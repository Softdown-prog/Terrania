import test from "node:test";
import assert from "node:assert/strict";
import { SOUTH_CITY,SOUTH_BUILDINGS,SOUTH_SIGNS,SOUTH_CITY_PROPS,
  southCityGround,southCitySafe,southCityBlocks,southPoint } from "../src/world/southCity.ts";
import { getTile, TILE_SIZE } from "../src/world/terrain.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { protectedSurfaceTile } from "../src/world/village.ts";
import { Slime, slimeSpawns } from "../src/actors/Slime.ts";
import { Player } from "../src/actors/Player.ts";
import { RegionalMonster, southCommonSpawns, regionalSurfaceSpawns } from "../src/actors/RegionalMonster.ts";
import { SOUTH_NPCS, SOUTH_NPC_LOOKS, SOUTH_DIALOGUES } from "../src/npcs/south/index.ts";
import { nearestNpc, npcDialogue } from "../src/npcs/catalog.ts";
import { InteriorRoom } from "../src/engine/InteriorRoom.ts";

test("Poço Negro é uma cidade maior que Travessia, inserida nos Ermos do Sul",async()=>{
  const { getWorldRegion }=await import("../src/world/regions.ts");
  assert.equal((SOUTH_CITY.maxX-SOUTH_CITY.minX+1)*(SOUTH_CITY.maxY-SOUTH_CITY.minY+1),56*48);
  assert.equal(getWorldRegion(0,SOUTH_CITY.centerY),"south");
  assert.equal(SOUTH_BUILDINGS.length,12);
  assert.equal(SOUTH_SIGNS.length,4);
  assert.ok(SOUTH_CITY_PROPS.length>100);
  assert.equal(southCitySafe(0,SOUTH_CITY.centerY),true);
  assert.equal(southCitySafe(0,SOUTH_CITY.centerY-25),false);
  assert.equal(protectedSurfaceTile(0,SOUTH_CITY.centerY),true);
  assert.equal(protectedSurfaceTile(0,SOUTH_CITY.centerY+25),false);
});
test("terreno urbano determinístico, acessível nas quatro seeds e livre de spawns",()=>{
  for(const seed of [0,42,842136,4294967295]){
    for(let lx=-28;lx<=27;lx++)for(let ly=-24;ly<=23;ly++){
      const tile=getTile(lx,SOUTH_CITY.centerY+ly,seed);
      assert.equal(tile.tree,false);assert.equal(tile.rock,false);
      assert.ok(tile.ground==="path"||tile.ground==="sand");
    }
    assert.equal(southCityGround(0,SOUTH_CITY.centerY-38),"path");
    assert.equal(southCityGround(0,SOUTH_CITY.centerY+35),"path");
    assert.equal(southCityGround(70,SOUTH_CITY.centerY+26),"path");
    for(let cx=-2;cx<=2;cx++)
      for(let cy=Math.floor(SOUTH_CITY.centerY/16)-2;cy<=Math.floor(SOUTH_CITY.centerY/16)+2;cy++){
        for(const mob of [...slimeSpawns(cx,cy,seed),...southCommonSpawns(cx,cy,seed),
          ...regionalSurfaceSpawns(cx,cy,seed)]){
          assert.equal(southCitySafe(Math.floor(mob.x/32),Math.floor(mob.y/32)),false);
        }
      }
  }
});
test("muralhas barram entrada lateral, os dois portões são transitáveis, poço é sólido",()=>{
  const y=SOUTH_CITY.centerY;
  const px=(lx:number,ly:number)=>southPoint(lx,ly);
  for(const seed of [42,842136]){
    assert.equal(canMoveOnSeed(px(0,-24).x,px(0,-24).y,seed),true);
    assert.equal(canMoveOnSeed(px(0,23).x,px(0,23).y,seed),true);
    assert.equal(canMoveOnSeed(px(8,-24).x,px(8,-24).y,seed),false);
    assert.equal(canMoveOnSeed(px(-28,0).x,px(-28,0).y,seed),false);
    assert.equal(canMoveOnSeed(px(27,0).x,px(27,0).y,seed),false);
    assert.equal(canMoveOnSeed(px(0,0).x,px(0,0).y,seed),false);
    assert.equal(southCityBlocks(px(8,0).x,px(8,0).y,7),false);
    for(const building of SOUTH_BUILDINGS){
      assert.equal(canMoveOnSeed(building.x,building.y-20,seed),false,building.id);
    }
  }
  assert.ok(y>10000);
});
test("combate normal, mágico, espinhos e explosão não violam a proteção",()=>{
  const hero=new Player(),p=southPoint(0,7);
  hero.x=p.x;hero.y=p.y;
  const mob=[new Slime("slime",p.x+20,p.y),
    new RegionalMonster("wolf","glacial-wolf",p.x+20,p.y),
    new RegionalMonster("mage","magma-salamander",p.x+50,p.y)];
  for(const enemy of mob)for(let i=0;i<90;i++)enemy.update(1/60,hero,{canMove:()=>true});
  assert.equal(hero.hp,hero.maxHp);
  const cactus=new RegionalMonster("thorns","cactus-sprout",p.x+30,p.y);
  cactus.onSwordHit(hero,"forge");
  assert.equal(hero.hp,hero.maxHp);
  const scarab=new RegionalMonster("burst","solar-scarab",p.x+20,p.y);
  scarab.deathBurst(hero,{canMove:()=>true});
  assert.equal(hero.hp,hero.maxHp);
  const outside=southPoint(0,25);
  assert.equal(southCitySafe(0,yFrom(outside)),false);
});
function yFrom(p:{y:number}):number{return Math.floor(p.y/TILE_SIZE)}
test("NPCs do Sul são únicos, falam sem inventar transações e três interiores funcionam",()=>{
  assert.equal(SOUTH_NPCS.length,12);
  const ids=SOUTH_NPCS.map(n=>n.id);
  assert.equal(new Set(ids).size,12);
  for(const npc of SOUTH_NPCS){
    assert.ok(southCitySafe(Math.floor(npc.x/32),Math.floor(npc.y/32)),npc.id);
    assert.ok(SOUTH_NPC_LOOKS[npc.id],npc.id);
    assert.equal(npcDialogue(npc,0).length,3,npc.id);
    assert.deepEqual(npcDialogue(npc,0),SOUTH_DIALOGUES[npc.id]);
  }
  assert.equal(SOUTH_BUILDINGS.filter(b=>b.interior).length,3);
  for(const b of SOUTH_BUILDINGS){
    if(b.interior){
      const near=nearestNpc(b.x,b.y+29);
      assert.equal(near?.id,b.id);
      const room=new InteriorRoom(b.id);
      assert.equal(room.building.id,b.id);
      assert.equal(room.collision.canMove(room.player.x,room.player.y),true);
      for(let i=0;i<32;i++)room.update(1/60,{x:0,y:1});
      assert.equal(room.reachedExit,true);
    }else{
      assert.throws(()=>new InteriorRoom(b.id),/desconhecido/);
    }
  }
});
