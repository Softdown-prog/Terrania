import test from "node:test";
import assert from "node:assert/strict";
import { SECOND_WAVE_KINDS, REGIONAL_CREATURE_KINDS, CREATURE_CATALOG } from "../src/actors/CreatureCatalog.ts";
import { caveMonsterKinds, RegionalMonster, rollCreatureLoot, regionalSurfaceSpawns } from "../src/actors/RegionalMonster.ts";
import { Player } from "../src/actors/Player.ts";
import { CaveRoom } from "../src/engine/CaveRoom.ts";
import type { CaveEntrance, CaveTheme } from "../src/world/caves.ts";
import { caveThemeAt } from "../src/world/caves.ts";
import { normalizeMaterials } from "../src/engine/Inventory.ts";

const profiles = [
  ["summit-griffin",260,33,"west","basalt"],
  ["magma-salamander",220,31,"west","basalt"],
  ["rotten-marsh-ent",350,27,"south","marsh"],
  ["poison-scout-toad",165,23,"south","marsh"],
  ["carrion-sandworm",310,35,"south","desert"],
  ["tundra-mammoth",450,40,"north","glacial"],
  ["frost-banshee",155,37,"north","glacial"],
  ["runic-polar-bear",340,34,"north","glacial"],
  ["abyssal-octopus",275,29,"east","coastal"],
  ["tide-hunter-triton",250,36,"east","coastal"],
] as const;
test("bestiário: catálogo consolida vinte espécies, sem repetir IDs, ficha e habitats",()=>{
  assert.equal(REGIONAL_CREATURE_KINDS.length,31);
  assert.equal(SECOND_WAVE_KINDS.length,10);
  assert.equal(new Set(REGIONAL_CREATURE_KINDS).size,31);
  for(const [kind,hp,attack,region,cave] of profiles){
    const species=CREATURE_CATALOG[kind];
    assert.equal(species.maxHp,hp,kind);
    assert.equal(species.contactDamage,attack,kind);
    assert.equal(species.region,region,kind);
    assert.deepEqual(species.caveThemes,[cave],kind);
    assert.ok(species.experience>0);
    assert.ok(species.loot.length>=2);
    for(const chance of species.loot)assert.ok(chance.chance>0&&chance.chance<=1);
  }
});
test("bestiário: todas as espécies novas participam da cavernagem correta",()=>{
  for(const [kind,,,,cave] of profiles)assert.ok(caveMonsterKinds(cave as CaveTheme).includes(kind));
  assert.equal(caveMonsterKinds("marsh").length,4);
  assert.equal(caveMonsterKinds("glacial").length,6);
  assert.equal(caveMonsterKinds("basalt").length,4);
  assert.equal(caveMonsterKinds("coastal").length,4);
  assert.equal(caveMonsterKinds("desert").length,13);
  assert.equal(caveThemeAt(19000,17000),"marsh");
});
test("cavernas: segunda onda participa de encontros e a entrada continua transitável",()=>{
  const seeds=[842136,99,1111];
  for(const theme of ["glacial","marsh","desert","coastal","basalt"] as const){
    const seen=new Set<string>();
    for(const seed of seeds)for(let i=0;i<18;i++){
      const entry:CaveEntrance={id:"wave2:"+theme+":"+seed+":"+i,seed,theme,
        tileX:i*117,tileY:seed%13+i*37,x:0,y:0,name:theme,kind:"hole"};
      const floor=new CaveRoom(entry);
      assert.ok(floor.monsters.size>0);
      for(const m of floor.monsters.values()){
        assert.ok(floor.collision.canMove(m.x,m.y));
        assert.ok(CREATURE_CATALOG[m.kind].caveThemes.includes(theme));
        seen.add(m.kind);
      }
    }
    for(const kind of SECOND_WAVE_KINDS.filter(k=>CREATURE_CATALOG[k].caveThemes.includes(theme)))
      assert.ok(seen.has(kind),kind+" deveria aparecer em "+theme);
  }
});
test("loot: probabilidades do segundo lote e materiais aceitam apenas nomes registrados",()=>{
  assert.deepEqual(CREATURE_CATALOG["tide-hunter-triton"].loot.map(l=>l.chance),[.65,.30,.04]);
  assert.deepEqual(CREATURE_CATALOG["frost-banshee"].loot.map(l=>l.chance),[.35,.12]);
  for(const kind of SECOND_WAVE_KINDS){
    const drop=rollCreatureLoot(kind,"seed:101:"+kind);
    assert.deepEqual(drop,rollCreatureLoot(kind,"seed:101:"+kind));
    assert.ok(drop.every(item=>CREATURE_CATALOG[kind].loot.some(l=>l.item===item)));
  }
  assert.deepEqual(normalizeMaterials({"Tridente das Marés":3,"Bolsa de Tinta Abissal":2,
    "script":999,"Espada de Coral Rara":-3}),
    {"Tridente das Marés":3,"Bolsa de Tinta Abissal":2});
});
test("efeitos de combate: queimadura 4 s e tinta prejudicam precisão, atordoamento impede ataque",()=>{
  const h=new Player(),world={canMove:()=>true};
  h.applyStatus("burn",4);
  assert.equal(h.debuffs.burn,4);
  const hp=h.hp;
  for(let i=0;i<62;i++)h.update(1/60,{x:0,y:0},world);
  assert.equal(h.hp,hp-3);
  h.applyStatus("stun",.7);
  assert.equal(h.startAttack(),false);
  h.applyStatus("blind",4);
  for(let i=0;i<52;i++)h.update(1/60,{x:0,y:0},world);
  const attempts:boolean[]=[];
  for(let n=0;n<3;n++){
    assert.equal(h.startAttack(),true);
    for(let i=0;i<8;i++)h.update(1/60,{x:0,y:0},world);
    attempts.push(h.consumeStrike());
    for(let i=0;i<50;i++)h.update(1/60,{x:0,y:0},world);
  }
  assert.deepEqual(attempts,[true,true,false]);
});
test("rajada do grifo desloca um tile sem atravessar obstáculos de colisão",()=>{
  const h=new Player(), world={canMove:(x:number)=>x>=90};
  h.x=100;h.y=100;
  h.pushFrom(200,100,32,world);
  assert.ok(h.x>=90&&h.x<100);
  assert.equal(h.y,100);
});
test("combate da salamandra: projétil possui conjuração e aplica queimadura contínua",()=>{
  const h=new Player(),world={canMove:()=>true};
  h.x=110;h.y=0;
  const m=new RegionalMonster("magma-test","magma-salamander",0,0);
  for(let i=0;i<180&&h.debuffs.burn===0;i++){
    m.update(1/60,h,world,0,false); // arena unitária fora da geografia da vila
    h.update(1/60,{x:0,y:0},world);
  }
  assert.ok(h.debuffs.burn>0,"rajada deve atingir e causar queimadura");
  assert.ok(h.hp<100);
});
test("superfície: não existem monstros regionais na vila e o spawn é reprodutível",()=>{
  assert.deepEqual(regionalSurfaceSpawns(0,0,842136),[]);
  const first=regionalSurfaceSpawns(1400,0,842136).map(x=>[x.id,x.kind,x.x,x.y]);
  const second=regionalSurfaceSpawns(1400,0,842136).map(x=>[x.id,x.kind,x.x,x.y]);
  assert.deepEqual(first,second);
});
