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

test("um Slime sobreposto pode ser atingido sem mudar a direção do herói", () => {
  const fight = new ClassicCombat(), hero = new Player(), { slime, mobs } = pair(16);
  hero.faceX = -1;
  hero.faceY = 0;
  fight.select(slime.id, mobs);

  assert.equal(fight.tick(1 / 60, hero, mobs, { canMove: () => false }), false);
  assert.equal(fight.tick(1 / 60, hero, mobs, OPEN), true);
  assert.deepEqual([hero.faceX, hero.faceY], [-1, 0]);
  assert.equal(fight.strikeTargetId, slime.id);
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
    sim.update(1/60,STILL,attack,c.strikeTargetId);
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

test("classic without a live target never turns a pending strike into area damage",()=> {
  const sim=new OfflineSimulation(842136);
  sim.update(0,STILL,false);sim.slimes.clear();
  const bystander=new Slime("bystander",50,16);
  sim.slimes.set(bystander.id,bystander);
  sim.player.faceX=1;sim.player.faceY=0;
  assert.equal(sim.player.startAttack(),true);
  for(let i=0;i<18;i++)sim.update(1/60,STILL,false,null);
  assert.equal(bystander.hp,2);
});

for (const [change, afterWindup, afterNextSwing] of [
  ["switch", [2, 2], [2, 1]],
  ["cancel and reselect", [2, 2], [1, 2]],
  ["reselect same target", [1, 2], [0, 2]],
] as const) {
  test(`a classic swing respects its original selection during windup: ${change}`, () => {
    const sim = new OfflineSimulation(842136);
    sim.update(0, STILL, false);
    sim.slimes.clear();
    const first = new Slime("first", 50, 16);
    const second = new Slime("second", 44, 16);
    sim.slimes.set(first.id, first);
    sim.slimes.set(second.id, second);
    const fight = new ClassicCombat();
    fight.select(first.id, sim.slimes);
    const step = () => {
      const attack = fight.tick(1 / 60, sim.player, sim.slimes, sim.collision);
      sim.update(1 / 60, STILL, attack, fight.strikeTargetId);
    };

    step();
    assert.ok(sim.player.attackTime > 0);
    if (change === "cancel and reselect") fight.cancel();
    fight.select(change === "switch" ? second.id : first.id, sim.slimes);
    for (let frame = 0; frame < 20; frame++) step();

    assert.deepEqual([first.hp, second.hp], afterWindup);
    assert.ok(fight.cooldown > 1);

    for (let frame = 0; frame < 90; frame++) step();
    assert.deepEqual([first.hp, second.hp], afterNextSwing);
  });
}

test("cancelar e selecionar novamente não antecipa o intervalo clássico", () => {
  const fight = new ClassicCombat(), hero = new Player(), { slime, mobs } = pair();
  fight.select(slime.id, mobs);
  assert.equal(fight.tick(1 / 60, hero, mobs, OPEN), true);
  hero.startAttack();
  for (let frame = 0; frame < 40; frame++) {
    hero.update(1 / 60, STILL, OPEN);
    assert.equal(fight.tick(1 / 60, hero, mobs, OPEN), false);
  }
  assert.equal(hero.attackCooldown, 0, "a recarga do jogador já acabou, mas a clássica não");
  const remaining = fight.cooldown;
  fight.cancel();
  assert.equal(fight.targetId, null);
  assert.equal(fight.cooldown, remaining);
  fight.select(slime.id, mobs);
  assert.equal(fight.tick(1 / 60, hero, mobs, OPEN), false);
});

test("perder um alvo pela simulação ou pelo HUD preserva a recarga para o próximo", () => {
  for (const loss of ["removed", "dead", "label"] as const) {
    const fight = new ClassicCombat(), hero = new Player(), { slime, mobs } = pair();
    const next = new Slime("next", 48, 16);
    mobs.set(next.id, next);
    fight.select(slime.id, mobs);
    assert.equal(fight.tick(1 / 60, hero, mobs, OPEN), true);
    if (loss === "dead") slime.hp = 0;
    else mobs.delete(slime.id);
    if (loss === "label") assert.equal(fight.label(mobs), null);
    else assert.equal(fight.tick(1 / 60, hero, mobs, OPEN), false);
    assert.equal(fight.targetId, null);
    assert.ok(fight.cooldown > 1.5);
    fight.select(next.id, mobs);
    assert.equal(fight.tick(1 / 60, hero, mobs, OPEN), false);
  }
});

test("cancelar repetidamente não aumenta a cadência de ataques", () => {
  const fight = new ClassicCombat(), hero = new Player(), { slime, mobs } = pair();
  const attacks: number[] = [];
  for (let frame = 0; frame < 200; frame++) {
    fight.cancel();
    fight.select(slime.id, mobs);
    if (fight.tick(1 / 60, hero, mobs, OPEN)) {
      assert.equal(hero.startAttack(), true);
      attacks.push(frame);
    }
    hero.update(1 / 60, STILL, OPEN);
  }
  assert.equal(attacks.length, 3);
  for (let i = 1; i < attacks.length; i++)
    assert.ok((attacks[i]! - attacks[i - 1]!) / 60 >= CLASSIC_ATTACK_INTERVAL - 1 / 60);
});

test("a recarga continua contando sem alvo e entradas inválidas não a alteram", () => {
  const fight = new ClassicCombat(), hero = new Player(), { slime, mobs } = pair();
  fight.select(slime.id, mobs);
  assert.equal(fight.tick(1 / 60, hero, mobs, OPEN), true);
  fight.cancel();
  for (const dt of [NaN, Infinity, 0, -1]) {
    assert.equal(fight.tick(dt, hero, mobs, OPEN), false);
    assert.equal(fight.cooldown, CLASSIC_ATTACK_INTERVAL);
  }
  for (let frame = 0; frame < 97; frame++)
    assert.equal(fight.tick(1 / 60, hero, mobs, OPEN), false);
  assert.equal(fight.cooldown, 0);
  fight.select(slime.id, mobs);
  assert.equal(fight.tick(1 / 60, hero, mobs, OPEN), true);
});

test("reset de mundo ou herói novo limpa foco e relógio da simulação anterior", () => {
  const fight = new ClassicCombat(), { slime, mobs } = pair();
  fight.select(slime.id, mobs);
  assert.equal(fight.tick(1 / 60, new Player(), mobs, OPEN), true);
  fight.reset();
  assert.equal(fight.targetId, null);
  assert.equal(fight.cooldown, 0);
  fight.select(slime.id, mobs);
  assert.equal(fight.tick(1 / 60, new Player(), mobs, OPEN), true);
});
