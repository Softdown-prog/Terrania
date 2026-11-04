import assert from "node:assert/strict";
import test from "node:test";
import { Player } from "../src/actors/Player.ts";
import { Monster } from "../src/actors/Monster.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";

const FLOOR = { canMove: () => true };
const STILL = { x: 0, y: 0 };
const DT = 1 / 60;
function advance(player: Player, monster: Monster, frames: number, move = STILL): void {
  for (let i = 0; i < frames; i++) {
    player.update(DT, move, FLOOR);
    monster.update(DT, player, FLOOR, true);
  }
}

test("esquiva percorre distância real, concede i-frames e respeita cooldown", () => {
  const player = new Player();
  player.x = 3000;
  player.y = 3000;
  assert.equal(player.startDodge({x:1,y:0}), true);
  assert.equal(player.startAttack(), false);
  assert.equal(player.startHeavyAttack(), false);
  assert.equal(player.startDodge({x:0,y:1}), false);
  assert.equal(player.takeDamage(16,3100,3000), false);
  for (let i = 0; i < 14; i++) player.update(DT, STILL, FLOOR);
  assert.ok(player.x > 3060 && player.x < 3064, "dash must traverse ~63 world units");
  assert.equal(player.dodgeTime, 0);
  assert.equal(player.startDodge({x:1,y:0}), false);
  // The immunity expires after the dash, not after an entire cooldown.
  for (let i=0;i<5;i++) player.update(DT,STILL,FLOOR);
  assert.equal(player.takeDamage(16,3100,3000), true);
  assert.equal(player.hp,84);
  for (let i=0;i<60;i++) player.update(DT,STILL,FLOOR);
  assert.equal(player.startDodge({x:0,y:-1}), true);
});

test("esquiva respeita paredes, não atravessa colisões nem aceita direção inválida", () => {
  const player = new Player();
  assert.equal(player.startDodge({x:NaN,y:Infinity}), true,
    "invalid joystick input safely falls back to facing");
  for (let i=0;i<16;i++) player.update(DT,STILL,{canMove: x => x <= 32});
  assert.ok(player.x <= 32, "body cannot tunnel through blocking tile");
  player.hp=0;
  assert.equal(player.startDodge({x:1,y:0}),false);
});

test("lobo anuncia salto no chão, acerta alvo parado e mantém intervalo entre investidas", () => {
  const player = new Player(); player.x=3000; player.y=3000;
  const wolf = new Monster("wolf","warning-wolf",3110,3000);
  wolf.update(DT,player,FLOOR,true);
  assert.ok(wolf.specialWindup > 0);
  assert.equal(wolf.specialTargetX,3000);
  assert.equal(wolf.specialTargetY,3000);
  assert.equal(player.hp,100);
  advance(player,wolf,34);
  assert.equal(wolf.specialWindup,0);
  assert.equal(player.hp,84,"lunge deals 16 after visible windup");
  assert.ok(wolf.specialCooldown > 2);
  assert.ok(wolf.x < 3110);
  // The same kind without opt-in preserves the previous Go-parity rules.
  const parityWolf = new Monster("wolf","legacy",3110,3000);
  parityWolf.update(DT,player,FLOOR);
  assert.equal(parityWolf.specialWindup,0);
});

test("esquiva evita salto do lobo e teia da aranha", () => {
  for (const kind of ["wolf","spider"] as const) {
    const player=new Player(); player.x=3000;player.y=3000;
    const mob=new Monster(kind,kind+"-dodged",kind==="wolf"?3110:3090,3000);
    mob.update(DT,player,FLOOR,true);
    assert.ok(mob.specialWindup>0);
    assert.equal(player.startDodge({x:-1,y:0}),true);
    advance(player,mob,40);
    assert.equal(mob.specialWindup,0);
    assert.equal(player.hp,100,kind+" hit an evading target");
    assert.equal(player.webSlowTime,0);
  }
});

test("teia avisa antes, causa dano uma vez e desacelera somente se atingir", () => {
  const player=new Player(); player.x=3000;player.y=3000;
  const spider=new Monster("spider","web",3090,3000);
  spider.update(DT,player,FLOOR,true);
  assert.ok(spider.specialWindup>0);
  advance(player,spider,36);
  assert.equal(spider.specialWindup,0);
  assert.equal(player.hp,92);
  assert.ok(player.webSlowTime > 1);
  const comparison=new Player(); comparison.x=3000;comparison.y=3000;
  // Ignore the hurt knockback: position changes are measured after clearing it
  // via a zero movement phase, while the debuff still has time remaining.
  for(let i=0;i<10;i++) {player.update(DT,STILL,FLOOR);comparison.update(DT,STILL,FLOOR);}
  const before=player.x;
  const base=comparison.x;
  for(let i=0;i<12;i++){player.update(DT,{x:1,y:0},FLOOR);comparison.update(DT,{x:1,y:0},FLOOR);}
  assert.ok(player.x-before < comparison.x-base);
  const hp=player.hp;
  advance(player,spider,10);
  assert.equal(player.hp,hp, "special must not damage again without a new tell");
});

test("golpe interrompe preparação e parede interrompe salto", () => {
  const player=new Player();player.x=3000;player.y=3000;
  const interrupted=new Monster("wolf","stagger",3110,3000);
  interrupted.update(DT,player,FLOOR,true);
  interrupted.takeHit(3000,3000);
  assert.equal(interrupted.specialWindup,0);
  assert.ok(interrupted.specialCooldown>=0.8);
  // Simulate a real wall between wolf and target, not a graphical overlay.
  const blocked=new Monster("wolf","blocked",3110,3000);
  const wall={canMove:(x:number)=>x<=3020||x>=3060};
  blocked.update(DT,player,wall,true);
  for(let i=0;i<35;i++) blocked.update(DT,player,wall,true);
  assert.equal(blocked.specialWindup,0);
  assert.ok(blocked.x>=3060);
  assert.equal(player.hp,100);
});

test("motor offline liga ataques especiais; nunca escreve telemetria no save", () => {
  const sim=new OfflineSimulation(842136);
  sim.update(0,STILL,false);
  // Trigger the new chunk exactly once, then isolate a real encounter.
  sim.player.x=3000;sim.player.y=3000;
  sim.update(DT,STILL,false);
  sim.slimes.clear();
  const spider=new Monster("spider","sim-spider",3090,3000);
  sim.slimes.set(spider.id,spider);
  sim.update(DT,STILL,false);
  assert.ok(spider.specialWindup>0);
  sim.update(DT,{x:-1,y:0},false,false,true);
  assert.ok(sim.player.dodgeTime>0);
  const snapshot=sim.snapshot();
  assert.equal("dodgeTime" in snapshot,false);
  assert.equal("webSlowTime" in snapshot,false);
  const restored=new OfflineSimulation(842136,snapshot);
  assert.equal(restored.player.dodgeCooldown,0);
  assert.equal(restored.player.webSlowTime,0);
});
