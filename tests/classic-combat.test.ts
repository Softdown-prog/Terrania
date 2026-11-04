import test from "node:test";
import assert from "node:assert/strict";
import { ClassicCombat, CLASSIC_ATTACK_INTERVAL } from "../src/engine/ClassicCombat.ts";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";

const OPEN = {canMove:()=>true};
const STILL = {x:0,y:0};
function pair(x=50) {
  const slime=new Slime("s",x,16);
  return {slime,mobs:new Map([[slime.id,slime]])};
}
test("click near a creature locks exactly one target",()=>{
  const c=new ClassicCombat(), {slime,mobs}=pair();
  assert.equal(c.selectAt({x:50,y:16},mobs.values()),true);
  assert.equal(c.targetId,slime.id);
  assert.equal(c.selectAt({x:250,y:250},mobs.values()),false);
  assert.equal(c.targetId,slime.id,"clicking terrain does not drop target");
  c.cancel();assert.equal(c.targetId,null);
  assert.equal(c.selectAt({x:NaN,y:16},mobs.values()),false);
  assert.equal(c.select("unknown",mobs),false);
});
test("classic attack fires automatically on a fixed interval, not every frame",()=>{
  const c=new ClassicCombat(),h=new Player(),{slime,mobs}=pair();
  c.select(slime.id,mobs);
  assert.equal(c.tick(1/60,h,mobs,OPEN),true);
  assert.equal(c.cooldown,CLASSIC_ATTACK_INTERVAL);
  h.startAttack();
  for(let i=0;i<50;i++){h.update(1/60,STILL,OPEN);assert.equal(c.tick(1/60,h,mobs,OPEN),false);}
  let triggered=false;
  for(let i=0;i<50;i++){
    h.update(1/60,STILL,OPEN);
    if(c.tick(1/60,h,mobs,OPEN)) {triggered=true;break;}
  }
  assert.equal(triggered,true);
});
test("selection respects walls, distance and lost targets",()=>{
  const c=new ClassicCombat(),h=new Player(),{slime,mobs}=pair(50);
  c.select(slime.id,mobs);
  assert.equal(c.tick(1/60,h,mobs,{canMove:(x:number)=>x<30}),false);
  slime.x=500;assert.equal(c.tick(1/60,h,mobs,OPEN),false);
  slime.x=50; assert.equal(c.tick(1/60,h,mobs,OPEN),true);
  mobs.delete(slime.id);
  assert.equal(c.tick(1/60,h,mobs,OPEN),false);
  assert.equal(c.targetId,null);
});
test("classic auto-strike damages only its selected slime; old manual strike stays unchanged",()=>{
  const sim=new OfflineSimulation(842136);
  sim.update(0,STILL,false);
  sim.slimes.clear();
  const one=new Slime("one",50,16),two=new Slime("two",44,16);
  sim.slimes.set(one.id,one);sim.slimes.set(two.id,two);
  const c=new ClassicCombat();
  c.select(one.id,sim.slimes);
  for(let i=0;i<19;i++){
    const attack=c.tick(1/60,sim.player,sim.slimes,sim.collision);
    sim.update(1/60,STILL,attack,c.targetId);
  }
  assert.equal(one.hp,1);
  assert.equal(two.hp,2);
  const normal=new OfflineSimulation(842136);
  normal.update(0,STILL,false);normal.slimes.clear();
  const a=new Slime("a",50,16),b=new Slime("b",44,16);
  normal.slimes.set(a.id,a);normal.slimes.set(b.id,b);
  normal.player.faceX=1;normal.player.faceY=0;
  normal.update(1/60,STILL,true);
  for(let i=0;i<19;i++)normal.update(1/60,STILL,false);
  assert.equal(a.hp,1);
  assert.equal(b.hp,1,"legacy manual attack remains unchanged outside classic mode");
});
