import { Player } from "../../src/actors/Player.ts";
import { Slime } from "../../src/actors/Slime.ts";
import { SeedCollision } from "../../src/world/collision.ts";
import { canStrike } from "../../src/engine/combat.ts";
import { villageGround } from "../../src/world/village.ts";

const seed=842136;
const world=new SeedCollision(seed);
const round=n=>Number(n.toFixed(6));
function placement() {
  for(let y=-480;y<=480;y+=32)for(let x=-480;x<=480;x+=32) {
    if(villageGround(Math.floor(x/32),Math.floor(y/32)))continue;
    const attacker=new Player();
    attacker.x=x;attacker.y=y;attacker.faceX=1;attacker.faceY=0;
    if(world.canMove(x,y)&&world.canMove(x+35,y) &&
      canStrike(attacker,{x:x+35,y},world))return [x,y];
  }
  throw Error("No combat placement");
}
const [x,y]=placement();
const hero=new Player();
hero.x=x;hero.y=y;hero.faceX=1;hero.faceY=0;
const mob=new Slime("fixture",x+35,y);
let strikes=0;
const trace=[];
for(let step=0;step<26;step++) {
  const dt=.05;
  const dx=step>=18 && step<23?1:0;
  hero.update(dt,{x:dx,y:0},world);
  if(step===0||step===11)hero.startAttack();
  if(hero.consumeStrike()&&mob.hp>0&&canStrike(hero,mob,world)) {
    mob.takeHit(hero.x,hero.y);
    strikes++;
  }
  if(mob.hp>0)mob.update(dt,hero,world);
  // Exercise invulnerability and knockback without depending on slime contact.
  if(step===14||step===15||step===25)hero.takeDamage(7,mob.x,mob.y);
  trace.push({
    p:[hero.x,hero.y,hero.vx,hero.vy,hero.faceX,hero.faceY,hero.attackTime,hero.hurtTime].map(round),
    hp:hero.hp,
    mob:[mob.x,mob.y,mob.bounce,mob.hurtTime,mob.contactCooldown].map(round),
    mobHp:mob.hp,
    strikes,
  });
}
console.log(JSON.stringify({position:[x,y],trace}));
