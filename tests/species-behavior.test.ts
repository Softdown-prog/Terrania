import assert from "node:assert/strict";
import test from "node:test";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { SPECIES_BEHAVIORS, pursuitStep, speciesRetreats } from "../src/monsters/behavior.ts";
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
  const hero=new Player();hero.x=155;hero.y=-600;
  const wolf=new RegionalMonster("wolf-id","glacial-wolf",0,-600);
  const twin=new RegionalMonster("wolf-id","glacial-wolf",0,-600);
  const blocked=new RegionalMonster("wolf-blocked","glacial-wolf",0,-600);
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
    assert.deepEqual([blocked.x,blocked.y],[0,-600]);
    assert.equal(blocked.motionPhase,0);
    assert.equal(blocked.moving,0);
  }finally{Slime.prototype.update=old;}
});

test("recuo por espécie é parametrizado: algumas fogem no amarelo, outras no vermelho", () => {
  assert.equal(speciesRetreats("dune-rat",49,100),true);
  assert.equal(speciesRetreats("dune-rat",70,100),false);
  assert.equal(speciesRetreats("carrion-vulture",24,100),true);
  assert.equal(speciesRetreats("carrion-vulture",40,100),false);
  assert.equal(speciesRetreats("basalt-golem",1,100),false);
  const hero=new Player();hero.x=0;hero.y=-600;
  const rat=new RegionalMonster("rato","dune-rat",45,-600);
  rat.hp=Math.floor(rat.definition.maxHp*.4);
  const x=rat.x;
  for(let i=0;i<25;i++)rat.update(1/60,hero,open);
  assert.ok(rat.x>x, "fuga aumenta distância em relação ao herói");
  assert.equal(hero.hp,hero.maxHp);
});
test("o registro usa o comportamento exportado pela ficha, sem duplicação",async()=>{
  const { readFileSync, existsSync }=await import("node:fs");
  const { duneRatBehavior }=await import("../src/monsters/south/rats/dune-rat.ts");
  const { sandGoblinBehavior }=await import("../src/monsters/south/goblins/sand-goblin.ts");
  const { desertOrcBehavior }=await import("../src/monsters/south/orcs/desert-orc.ts");
  assert.strictEqual(SPECIES_BEHAVIORS["dune-rat"],duneRatBehavior);
  assert.strictEqual(SPECIES_BEHAVIORS["sand-goblin"],sandGoblinBehavior);
  assert.strictEqual(SPECIES_BEHAVIORS["desert-orc"],desertOrcBehavior);
  const { readdirSync }=await import("node:fs");
  let found=0;
  for(const region of ["north","south","east","west"]){
    const regionRoot="src/monsters/"+region;
    for(const category of readdirSync(regionRoot,{withFileTypes:true}).filter(x=>x.isDirectory())){
      for(const file of readdirSync(regionRoot+"/"+category.name).filter(x=>x.endsWith(".ts"))){
        const species=file.slice(0,-3);
        const name=species.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())+"Behavior";
        const path=regionRoot+"/"+category.name+"/"+file;
        assert.ok(existsSync(path));
        assert.ok(readFileSync(path,"utf8").includes("export const "+name+" = "),
          "comportamento ainda centralizado: "+species);
        found++;
      }
    }
  }
  assert.equal(found,REGIONAL_CREATURE_KINDS.length);
  const central=readFileSync("src/monsters/behavior.ts","utf8");
  assert.ok(!central.includes('"dune-rat": { gait:'),"registro não pode duplicar perfil");
});

test("infecção de rato reproduz o sorteio determinístico da mordida original",async()=>{
  const { duneRatInfectionOnBite }=await import("../src/monsters/south/rats/dune-rat.ts");
  const { hash2 }=await import("../src/world/random.ts");
  for(const seed of [0,123,43121,987654321]){
    for(let hit=1;hit<=80;hit++){
      assert.equal(duneRatInfectionOnBite(seed,hit),hash2(seed,hit,73021)<.1);
      assert.equal(duneRatInfectionOnBite(seed,hit),duneRatInfectionOnBite(seed,hit));
    }
  }
});
test("goblin só arremessa areia quando encurralado e orc empurra no terceiro acerto",async()=>{
  const { sandGoblinCornered }=await import("../src/monsters/south/goblins/sand-goblin.ts");
  const { desertOrcClubKnockback,DESERT_ORC_CLUB_PUSH_DISTANCE }=
    await import("../src/monsters/south/orcs/desert-orc.ts");
  assert.equal(sandGoblinCornered(23,65),false);
  assert.equal(sandGoblinCornered(22,65),true);
  assert.equal(sandGoblinCornered(35,100),true);
  assert.equal(DESERT_ORC_CLUB_PUSH_DISTANCE,12);
  assert.deepEqual(Array.from({length:9},(_,i)=>desertOrcClubKnockback(i+1)),
    [false,false,true,false,false,true,false,false,true]);
});
test("troll de argila se cura aos poucos, com espera e distância reais",async()=>{
  const { clayTrollRegeneration }=await import("../src/monsters/south/trolls/clay-troll.ts");
  assert.deepEqual(clayTrollRegeneration(95,100,4,200,0,.1),{hp:95,elapsed:0});
  assert.deepEqual(clayTrollRegeneration(95,100,6,120,0,.1),{hp:95,elapsed:0});
  assert.deepEqual(clayTrollRegeneration(95,100,6,200,.9,.2),{hp:96,elapsed:.10000000000000009});
  assert.deepEqual(clayTrollRegeneration(99,100,6,200,.9,2),{hp:100,elapsed:1.9});
  const hero=new Player();hero.x=1000;hero.y=-600;
  const troll=new RegionalMonster("troll-regen","clay-troll",0,-600);
  troll.hp=troll.definition.maxHp-4;
  for(let i=0;i<110;i++)troll.update(.1,hero,open,0,false);
  assert.equal(troll.hp,troll.definition.maxHp,"troll tem de regenerar 4 HP no motor vivo");
});
