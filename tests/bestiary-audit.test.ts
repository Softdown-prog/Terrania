import test from "node:test";
import assert from "node:assert/strict";
import { Player } from "../src/actors/Player.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { ClassicTileWalker } from "../src/engine/ClassicTileWalker.ts";
import { CaveRoom } from "../src/engine/CaveRoom.ts";
import { Inventory } from "../src/engine/Inventory.ts";
import type { CaveEntrance } from "../src/world/caves.ts";

const empty={x:0,y:0};
const open={canMove:()=>true,speedAt:()=>1};
const entry:CaveEntrance={
  id:"audit:cave:basalt",tileX:-20000,tileY:0,x:0,y:0,
  theme:"basalt",seed:842136,name:"Galeria das Montanhas",kind:"hole",
};

test("cave: monsters defeated in an earlier visit never respawn on reentry",()=>{
  const first=new CaveRoom(entry);
  const ids=[...first.monsters.keys()];
  assert.ok(ids.length>=1);
  const second=new CaveRoom(entry,100,100,new Set(ids));
  assert.equal(second.monsters.size,0,"do not create fallback monster when all regular IDs are defeated");
  const partial=new CaveRoom(entry,100,100,new Set(ids.slice(0,1)));
  assert.equal(partial.monsters.has(ids[0]!),false);
  assert.ok(partial.monsters.size<=first.monsters.size);
});

test("cave: targeting a given mob never grants hits to a nearby second mob",()=>{
  const cave=new CaveRoom(entry);
  cave.monsters.clear();
  const x=cave.player.x,y=cave.player.y;
  cave.player.faceX=1;cave.player.faceY=0;
  const target=new RegionalMonster("target","basalt-golem",x+28,y);
  const other=new RegionalMonster("other","cliff-draconid",x+30,y+7);
  cave.monsters.set(target.id,target);
  cave.monsters.set(other.id,other);
  const before=other.hp;
  for(let i=0;i<10;i++)cave.update(1/60,empty,i===0,"starter",0,"target");
  assert.ok(target.hp<target.definition.maxHp,"the focused target should take a hit");
  assert.equal(other.hp,before,"neighbor must not receive an unrelated hit");
});

test("status effects lock real outdoor tile movement, then restore it",()=>{
  const player=new Player();
  player.x=16;player.y=16;
  const walker=new ClassicTileWalker();
  player.applyStatus("freeze",.6);
  for(let i=0;i<20;i++)walker.advance(1/60,{x:1,y:0},player,open);
  assert.equal(player.x,16,"freeze must prevent movement in the tile controller");
  for(let i=0;i<40;i++)walker.advance(1/60,{x:1,y:0},player,open);
  assert.ok(player.x>16,"walking resumes when freeze expires");
});

test("slow and stun change tile movement without changing collision authority",()=>{
  const normal=new Player(), slowed=new Player(), stunned=new Player();
  normal.x=slowed.x=stunned.x=16;
  normal.y=slowed.y=stunned.y=16;
  const a=new ClassicTileWalker(),b=new ClassicTileWalker(),c=new ClassicTileWalker();
  slowed.applyStatus("slow",2);
  stunned.applyStatus("stun",2);
  for(let i=0;i<17;i++){
    a.advance(1/60,{x:1,y:0},normal,open);
    b.advance(1/60,{x:1,y:0},slowed,open);
    c.advance(1/60,{x:1,y:0},stunned,open);
  }
  assert.ok(normal.x>slowed.x);
  assert.ok(slowed.x>16);
  assert.equal(stunned.x,16);
});

test("adventure vitals transfer to a separate cave hero without moving world coordinates",()=>{
  const outside=new Player(120),inside=new Player();
  outside.x=1200;outside.y=3500;
  outside.hp=77;
  outside.applyStatus("poison",6);
  outside.applyStatus("burn",4);
  outside.applyStatus("slow",3);
  assert.equal(outside.eatFood("apple"),"ate");
  inside.x=280;inside.y=740;
  inside.syncAdventureStateFrom(outside);
  assert.equal(inside.hp,77);
  assert.equal(inside.maxHp,120);
  assert.equal(inside.x,280);
  assert.equal(inside.y,740);
  assert.deepEqual(inside.debuffs,outside.debuffs);
  assert.deepEqual(inside.nutrition,outside.nutrition);
  inside.hp=38;
  inside.syncAdventureStateFrom(outside);
  assert.equal(inside.hp,77);
  inside.hp=45;
  outside.syncAdventureStateFrom(inside);
  assert.equal(outside.hp,45);
  assert.equal(outside.x,1200);
  assert.equal(outside.y,3500);
});

test("materials from both bestiary waves round-trip as owned inventory objects",()=>{
  const inv=new Inventory();
  assert.equal(inv.addMaterial("Minério de Ferro Bruto"),true);
  assert.equal(inv.addMaterial("Tridente das Marés"),true);
  assert.equal(inv.addMaterial("Unknown item"),false);
  const saved=inv.snapshot();
  assert.deepEqual(saved.materials,{"Minério de Ferro Bruto":1,"Tridente das Marés":1});
  const reloaded=new Inventory(saved);
  assert.deepEqual(reloaded.materials,inv.materials);
});
