import test from "node:test";
import assert from "node:assert/strict";
import { WEAPONS, WEAPON_IDS, weaponUnlocked, isWeaponId } from "../src/engine/Weapons.ts";
import { MAX_LEVEL, MAX_EXPERIENCE, experienceForLevel, levelForExperience } from "../src/engine/Experience.ts";
import { Inventory } from "../src/engine/Inventory.ts";
import { Slime } from "../src/actors/Slime.ts";
import { Player } from "../src/actors/Player.ts";
import { applySwordImpact, swordHitDamage } from "../src/engine/SwordCombat.ts";
import { drawKnightSword, drawKnightTrail } from "../src/render/swords.ts";
import { Recorder } from "./helpers/recordingContext.ts";

const stages=[
  ["starter",0,8,.8,null],
  ["forge",10,16,1,null],
  ["bronze",20,26,.95,null],
  ["copper",30,38,1.35,"push"],
  ["dunes",45,52,1.15,"bleed"],
  ["boreal",60,68,1.1,"ice"],
  ["obsidian",70,84,1.25,"fire"],
  ["marsh",80,98,1.3,"poison"],
  ["tempest",90,115,1.15,"lightning"],
  ["astral",100,140,1.4,"astral"],
] as const;
const OPEN={canMove:()=>true,speedAt:()=>1};
const hero=()=>{const h=new Player();h.x=0;h.y=0;h.faceX=1;return h;};

test("progressão da ficha: dez armas únicas, nível, dano e recarga exatos",()=>{
  assert.equal(WEAPON_IDS.length,10);
  assert.equal(new Set(WEAPON_IDS).size,10);
  for(const [id,level,damage,interval,special] of stages){
    const w=WEAPONS[id];
    assert.equal(w.level,level,id);
    assert.equal(w.damage,damage,id);
    assert.equal(w.interval,interval,id);
    assert.equal(w.special,special,id);
    assert.ok(w.windup>0 && w.windup<.28);
    assert.ok(w.trail.opacity>=.4&&w.trail.opacity<=1);
  }
  assert.equal(isWeaponId("__proto__"),false);
});
test("nível 100 é alcançável; começo em nível 1 permite a arma de nível 0",()=>{
  assert.equal(MAX_LEVEL,100);
  assert.equal(levelForExperience(0),1);
  assert.equal(levelForExperience(experienceForLevel(100)),100);
  assert.equal(levelForExperience(MAX_EXPERIENCE),100);
  assert.equal(weaponUnlocked("starter",1,false),true);
  assert.equal(weaponUnlocked("astral",99,true),false);
  assert.equal(weaponUnlocked("astral",100,false),true);
});
test("equipamento por nível: protege contra saves forjados e conserva a compra antiga",()=>{
  const untrusted=new Inventory({loadout:{equipped:"astral",forged:true}},1);
  assert.equal(untrusted.loadout.equipped,"starter");
  assert.equal(untrusted.equipWeapon("astral",99),"level-too-low");
  assert.equal(untrusted.equipWeapon("astral",100),"equipped");
  const restored=new Inventory(untrusted.snapshot(),100);
  assert.equal(restored.loadout.equipped,"astral");
  const legacy=new Inventory({loadout:{equipped:"forge",forged:true}},10);
  assert.equal(legacy.loadout.equipped,"forge");
  const unowned=new Inventory(undefined,100);
  assert.equal(unowned.equipWeapon("forge",100),"not-owned");
  assert.equal(unowned.equipWeapon("bronze",19),"level-too-low");
  assert.equal(unowned.equipWeapon("bronze",20),"equipped");
});
test("tempo de recarga passa a ser da arma e não do cooldown global antigo",()=>{
  const h=hero();
  assert.equal(h.startAttack("starter"),true);
  assert.equal(h.attackCooldown,.8);
  h.update(.1,{x:0,y:0},OPEN);
  assert.equal(h.startAttack("forge"),false);
  for(let i=0;i<8;i++)h.update(.1,{x:0,y:0},OPEN);
  assert.equal(h.startAttack("forge"),true);
  assert.equal(h.attackCooldown,1);
  assert.equal(h.strikeDamage,16);
});
test("defesa é real em criaturas blindadas e lâmina astral ignora 25%",()=>{
  const enemy=new Slime("armored",100,0,"basalt-golem");
  assert.equal(enemy.defense,20);
  assert.equal(swordHitDamage("forge",enemy),1);
  assert.equal(swordHitDamage("astral",enemy),125);
  assert.equal(swordHitDamage("astral",new Slime("rat",40,0,"dune-rat")),140);
});
test("gelo desacelera monstro em 20% e fogo e ácido causam dano por segundo",()=>{
  const caster=hero(),wolf=new Slime("wolf",15,0,"glacial-wolf");
  assert.equal(wolf.swordSpeedMultiplier,1);
  applySwordImpact("boreal",caster,wolf,[wolf],OPEN);
  assert.equal(wolf.swordSpeedMultiplier,.8);
  for(let i=0;i<130;i++)wolf.update(1/60,caster,OPEN);
  assert.equal(wolf.swordSpeedMultiplier,1);
  const fire=new Slime("fire",0,0,"basalt-golem");
  applySwordImpact("obsidian",caster,fire,[fire],OPEN);
  for(let i=0;i<240;i++)fire.update(1/60,caster,OPEN);
  assert.ok(fire.hp<=CREATURE_HP("basalt-golem")-18,"four burn ticks should be inflicted");
  const poison=new Slime("acid",0,0,"tundra-mammoth");
  applySwordImpact("marsh",caster,poison,[poison],OPEN);
  for(let i=0;i<300;i++)poison.update(1/60,caster,OPEN);
  assert.ok(poison.hp<=CREATURE_HP("tundra-mammoth")-40,"five acid ticks at 10 HP/s");
});
function CREATURE_HP(kind:"basalt-golem"|"tundra-mammoth"){return kind==="basalt-golem"?320:450;}
test("faísca elétrica não atravessa colisões e atinge no máximo dois vizinhos",()=>{
  const p=hero(),target=new Slime("target",20,0),a=new Slime("a",29,4),
    b=new Slime("b",34,0),c=new Slime("c",35,4);
  const result=applySwordImpact("tempest",p,target,[target,a,b,c],OPEN);
  assert.equal(result.extra.length,2);
  assert.equal(a.hp<3,true);
  assert.equal(b.hp<3,true);
  assert.equal(c.hp,3);
  const wall={canMove:(x:number)=>x<=25};
  const blocked=applySwordImpact("tempest",p,target,[target,a,b,c],wall);
  assert.equal(blocked.extra.length,0);
});
test("arte e rastro: todos os dez modelos são determinísticos e sem imagens",()=>{
  const signatures=new Set<string>();
  for(const id of WEAPON_IDS){
    const a=new Recorder(),b=new Recorder();
    drawKnightSword(a.ctx,id,1);
    drawKnightSword(b.ctx,id,1);
    assert.equal(a.metrics().signature,b.metrics().signature,id);
    assert.ok(a.metrics().paintOps>=12,id);
    assert.ok(a.metrics().gradients>=2,id);
    assert.ok(a.metrics().width>20 && a.metrics().height>4,id);
    signatures.add(a.metrics().signature);
    const t=new Recorder();
    drawKnightTrail(t.ctx,id,0,[-1.2,-1,-.8,-.4,0,.2],.9);
    assert.ok(t.metrics().paintOps>2,id);
  }
  assert.equal(signatures.size,10);
});
