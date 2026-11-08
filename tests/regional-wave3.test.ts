import test from "node:test";
import assert from "node:assert/strict";
import { CREATURE_CATALOG, THIRD_WAVE_KINDS, REGIONAL_CREATURE_KINDS } from "../src/actors/CreatureCatalog.ts";
import { RegionalMonster, caveMonsterKinds, regionalSurfaceSpawns, rollCreatureLoot,
  selectRegionalSpecies } from "../src/actors/RegionalMonster.ts";
import { Player } from "../src/actors/Player.ts";
import { Inventory } from "../src/engine/Inventory.ts";
import { getWorldRegion } from "../src/world/regions.ts";
import { getBiomeAt } from "../src/world/biomes.ts";
import { caveThemeAt } from "../src/world/caves.ts";
import { TILE_SIZE, CHUNK_TILES } from "../src/world/terrain.ts";

const cases = [
  ["dune-rat",35,6,[.5,.4,.1]],
  ["sand-goblin",65,11,[.85,.15,.6]],
  ["nomad-orc",110,17,[.55,.25,.5,.4]],
  ["dry-clay-troll",145,15,[.75,.45,.6]],
  ["dune-halfling",75,12,[.5,.65,.35,.5]],
  ["oasis-ranger",90,16,[.5,.6,.18]],
  ["mirage-imp",55,14,[.45]],
  ["horned-viper",45,10,[.5,.4]],
  ["southern-vulture",50,9,[.7,.3]],
  ["animated-cactus",60,8,[.4,.65,.55]],
] as const;
const open={canMove:()=>true,speedAt:()=>1};
test("South 21–30: all sheets correspond to real unique low-tier creatures",()=>{
  assert.equal(THIRD_WAVE_KINDS.length,10);
  assert.equal(REGIONAL_CREATURE_KINDS.length,30);
  assert.equal(new Set(REGIONAL_CREATURE_KINDS).size,30);
  for(const [kind,hp,damage,prob] of cases){
    const def=CREATURE_CATALOG[kind];
    assert.equal(def.maxHp,hp,kind);
    assert.equal(def.contactDamage,damage,kind);
    assert.deepEqual(def.loot.map(l=>l.chance),prob,kind);
    assert.equal(def.region,"south");
    assert.ok(def.caveThemes.includes("desert"));
    assert.ok(def.spawnWeight && def.spawnWeight>=4);
    assert.ok(def.experience>0&&def.experience<=100);
    assert.ok(def.biomes.every(b=>["dunes","oasis","ruins"].includes(b)));
  }
  assert.deepEqual(CREATURE_CATALOG["dry-clay-troll"].caveThemes,["desert","marsh"]);
  assert.equal(caveMonsterKinds("desert").length,13);
  assert.ok(caveMonsterKinds("marsh").includes("dry-clay-troll"));
});
test("drop lottery deterministic and saves materials without inventing consumables",()=>{
  const inv=new Inventory();
  for(const kind of THIRD_WAVE_KINDS){
    const drops=rollCreatureLoot(kind,"south:seed:124:"+kind);
    assert.deepEqual(drops,rollCreatureLoot(kind,"south:seed:124:"+kind));
    for(const item of drops)assert.ok(inv.addMaterial(item));
  }
  assert.equal(CREATURE_CATALOG["mirage-imp"].loot.length,1);
  assert.equal(CREATURE_CATALOG["mirage-imp"].loot[0]!.chance,.45);
  const restored=new Inventory(inv.snapshot());
  assert.deepEqual(restored.materials,inv.materials);
});
test("high-frequency South spawns bounded 3/chunk, weighted toward common fauna, no spawn outside habitats",()=>{
  let found=0,common=0,rare=0;
  for(let cy=1300;cy<1350;cy++)for(let cx=-5;cx<=5;cx++){
    const a=regionalSurfaceSpawns(cx,cy,842136);
    const b=regionalSurfaceSpawns(cx,cy,842136);
    assert.deepEqual(a.map(m=>[m.id,m.kind,m.x,m.y]),b.map(m=>[m.id,m.kind,m.x,m.y]));
    assert.ok(a.length<=3);
    for(const mob of a){
      found++;
      const tx=Math.floor(mob.x/TILE_SIZE),ty=Math.floor(mob.y/TILE_SIZE);
      assert.equal(Math.floor(tx/CHUNK_TILES),cx);
      assert.equal(Math.floor(ty/CHUNK_TILES),cy);
      assert.equal(getWorldRegion(tx,ty),"south");
      const def=CREATURE_CATALOG[mob.kind];
      if(caveThemeAt(tx,ty)==="marsh")assert.ok(def.caveThemes.includes("marsh"));
      else assert.ok(def.biomes.includes(getBiomeAt(tx,ty,842136)));
      if(THIRD_WAVE_KINDS.some(kind=>kind===mob.kind))common++;
      else rare++;
    }
  }
  assert.ok(found>35,"the southern wilderness must contain repeated low-tier encounters");
  assert.ok(common>rare*2, "common fauna should appear more frequently than elite creatures");
  assert.deepEqual(regionalSurfaceSpawns(0,0,842136),[]);
});
test("weighted species sampler is deterministic and favors common creatures",()=>{
  const species=["dune-rat","carrion-sandworm"] as const;
  assert.equal(selectRegionalSpecies([],0),null);
  assert.equal(selectRegionalSpecies(species,0),"dune-rat");
  assert.equal(selectRegionalSpecies(species,.99),"carrion-sandworm");
  let common=0;
  for(let i=0;i<100;i++)if(selectRegionalSpecies(species,(i+.5)/100)==="dune-rat")common++;
  assert.ok(common>=85);
});
test("viper venom deals 2 HP/s for 4 seconds; rat infection is distinct and weaker",()=>{
  const h=new Player();
  h.applyStatus("poison",4,2);
  h.applyStatus("poison",4,2); // repeated viper bites refresh, do not escalate to 3 HP/s
  assert.equal(h.debuffs.poison,4);
  const start=h.hp;
  for(let i=0;i<65;i++)h.update(1/60,{x:0,y:0},open);
  assert.equal(h.hp,start-2);
  const r=new Player();
  r.applyStatus("infection",3);
  for(let i=0;i<65;i++)r.update(1/60,{x:0,y:0},open);
  assert.equal(r.hp,99);
  assert.equal(r.debuffs.poison,0);
});
test("cactus reflects exactly 2 damage only to a starter short-sword hit",()=>{
  const cactus=new RegionalMonster("cactus","animated-cactus",0,0),h=new Player();
  cactus.onSwordHit(h,"forge");
  assert.equal(h.hp,100);
  cactus.onSwordHit(h,"starter");
  assert.equal(h.hp,98);
  cactus.onSwordHit(h,"starter");
  assert.equal(h.hp,96,"spines work even during ordinary invulnerability frames");
});
test("clay troll regenerates exactly 1 HP/s while disengaged, never above full health",()=>{
  const troll=new RegionalMonster("t","dry-clay-troll",0,0);
  const hero=new Player();
  hero.x=600;hero.y=600;
  troll.takeHit(100,0,12);
  const damaged=troll.hp;
  for(let i=0;i<360;i++)troll.update(1/60,hero,open);
  assert.ok(troll.hp>=damaged+1 && troll.hp<=damaged+2);
  for(let i=0;i<2100;i++)troll.update(1/60,hero,open);
  assert.equal(troll.hp,troll.definition.maxHp);
});
test("goblin does not throw sand before its HP drops below 35%",()=>{
  const h=new Player();h.x=80;h.y=0;
  const goblin=new RegionalMonster("g","sand-goblin",0,0);
  for(let i=0;i<25;i++)goblin.update(1/60,h,open);
  assert.equal(goblin.casting,0);
  goblin.takeHit(300,0,45);
  let casting=false;
  for(let i=0;i<180;i++){
    goblin.update(1/60,h,open);
    if(goblin.casting>0){casting=true;break;}
  }
  assert.equal(casting,true);
});

test("rat infection applies with deterministic approximately 10% chance per real hit",()=>{
  const count=(seed:string):number=>{
    let infected=0;
    for(let i=0;i<256;i++){
      const rat=new RegionalMonster(seed+":"+i,"dune-rat",0,0);
      const hero=new Player();hero.x=20;hero.y=0;
      rat.update(1/60,hero,open);
      if(hero.debuffs.infection>0)infected++;
    }
    return infected;
  };
  const a=count("rats"),b=count("rats");
  assert.equal(a,b);
  assert.ok(a>=12&&a<=44,"infection must be rare but present, not a guaranteed status");
});
