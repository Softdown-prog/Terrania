import assert from "node:assert/strict";
import test from "node:test";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { SPECIES_BEHAVIORS, pursuitStep } from "../src/monsters/behavior.ts";
import { REGIONAL_CREATURE_KINDS } from "../src/monsters/catalog.ts";
import { monsterPose } from "../src/render/monsterMotion.ts";

const open={canMove:()=>true};
test("todas as 31 espécies têm comportamento explícito e não duplicado",()=>{
  assert.deepEqual(Object.keys(SPECIES_BEHAVIORS).sort(),[...REGIONAL_CREATURE_KINDS].sort());
  assert.equal(new Set(Object.values(SPECIES_BEHAVIORS).map(x=>
    [x.gait,x.pursuit,x.cadence,x.weave].join(":"))).size,31);
  for(const kind of REGIONAL_CREATURE_KINDS){
    const b=SPECIES_BEHAVIORS[kind];
    assert.ok(b.cadence>.4&&b.cadence<3);
    assert.ok(b.weave>=0&&b.weave<.5);
  }
});
test("golem, lobo, escorpião e espírito não perseguem do mesmo modo",()=>{
  const kinds=["basalt-golem","glacial-wolf","dune-scorpion","frost-spirit"] as const;
  const steps=kinds.map(k=>pursuitStep(k,.35,150,20,151));
  assert.equal(new Set(steps.map(({x,y,pace})=>[x.toFixed(3),y.toFixed(3),pace.toFixed(3)].join(":"))).size,4);
  for(const {x,y,pace} of steps){
    assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(pace));
    assert.ok(Math.abs(Math.hypot(x,y)-1)<1e-12);
  }
});
test("vetor de perseguição é reproduzível para todas as espécies",()=>{
  for(const kind of REGIONAL_CREATURE_KINDS){
    assert.deepEqual(pursuitStep(kind,1/3,80,60,100),pursuitStep(kind,1/3,80,60,100));
    assert.deepEqual(pursuitStep(kind,1/3,0,0,0),{x:0,y:0,pace:0});
  }
});
test("passos e animação são específicos de cada espécie",()=>{
  const wolf=monsterPose({kind:"glacial-wolf",moving:1,motionPhase:Math.PI/2},.2);
  const golem=monsterPose({kind:"basalt-golem",moving:1,motionPhase:Math.PI/2},.2);
  assert.notDeepEqual(wolf,golem);
  for(const kind of REGIONAL_CREATURE_KINDS){
    const still=monsterPose({kind,moving:0,motionPhase:0},0);
    const walking=monsterPose({kind,moving:1,motionPhase:Math.PI/2},0);
    for(const value of Object.values(walking))assert.ok(Number.isFinite(value));
    if(!["hover","float","flap"].includes(SPECIES_BEHAVIORS[kind].gait))
      assert.notDeepEqual(still,walking,kind);
  }
});
test("movimento regional usa suas regras, sem update do Slime e sem cruzar bloqueio",()=>{
  const hero=new Player();hero.x=155;hero.y=0;
  const wolf=new RegionalMonster("wolf-id","glacial-wolf",0,0);
  const twin=new RegionalMonster("wolf-id","glacial-wolf",0,0);
  const blocked=new RegionalMonster("wolf-blocked","glacial-wolf",0,0);
  const old=Slime.prototype.update;
  Slime.prototype.update=()=>{throw new Error("Slime.update não pode ser herdado");};
  try{
    for(let i=0;i<30;i++){
      wolf.update(1/60,hero,open);
      twin.update(1/60,hero,open);
      blocked.update(1/60,hero,{canMove:()=>false});
    }
    assert.ok(wolf.x>0);
    assert.deepEqual([wolf.x,wolf.y,wolf.motionPhase],[twin.x,twin.y,twin.motionPhase]);
    assert.ok(wolf.motionPhase>0&&wolf.moving>0);
    assert.deepEqual([blocked.x,blocked.y],[0,0]);
    assert.equal(blocked.motionPhase,0);
    assert.equal(blocked.moving,0);
  }finally{Slime.prototype.update=old;}
});
