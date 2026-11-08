import test from "node:test";
import assert from "node:assert/strict";
import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS } from "../src/actors/CreatureCatalog.ts";
import { regionalSurfaceSpawns, caveMonsterKinds, rollCreatureLoot, RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { CaveRoom } from "../src/engine/CaveRoom.ts";
import type { CaveEntrance, CaveTheme } from "../src/world/caves.ts";
import { getWorldRegion } from "../src/world/regions.ts";
import { Player } from "../src/actors/Player.ts";

const themes = ["basalt","marsh","desert","glacial","coastal"] as const satisfies readonly CaveTheme[];

test("bestiário: vinte espécies com ficha completa e loot válido", () => {
  assert.equal(REGIONAL_CREATURE_KINDS.length,30);
  assert.equal(new Set(REGIONAL_CREATURE_KINDS).size,30);
  for (const kind of REGIONAL_CREATURE_KINDS) {
    const def=CREATURE_CATALOG[kind];
    assert.ok(def.name.length>8);
    assert.ok(def.maxHp>=35 && def.maxHp<=450);
    assert.ok(def.contactDamage>=6 && def.contactDamage<=40);
    assert.ok(def.experience>0);
    assert.ok(def.loot.length>=1);
    assert.ok(def.caveThemes.length>0);
    assert.ok(def.biomes.length>0);
    for(const entry of def.loot) assert.ok(entry.chance>0&&entry.chance<=1);
  }
  assert.equal(CREATURE_CATALOG.slime.contactDamage,9);
  assert.equal(CREATURE_CATALOG.slime.maxHp,2);
  assert.equal(CREATURE_CATALOG["solar-scarab"].autoLoot,true);
  assert.deepEqual(CREATURE_CATALOG["storm-serpent"].loot.map(x=>x.chance),[.4,.12,.03]);
});

test("geografia: cinco habitats subterrâneos recebem só suas espécies", () => {
  const expected: Record<typeof themes[number],number>={basalt:4,marsh:4,desert:13,glacial:6,coastal:4};
  for(const theme of themes){
    const kinds=caveMonsterKinds(theme);
    assert.equal(kinds.length,expected[theme],theme);
    for(const kind of kinds) assert.ok(CREATURE_CATALOG[kind].caveThemes.includes(theme));
  }
  assert.deepEqual(caveMonsterKinds("verdant"),[]);
});

test("superfície: monstros estáveis por seed, ausentes da vila central", () => {
  assert.deepEqual(regionalSurfaceSpawns(0,0,842136),[]);
  let count=0;
  for(let i=0;i<90;i++){
    const first=regionalSurfaceSpawns(-1550-i,0,842136);
    assert.deepEqual(first.map(x=>[x.id,x.kind,x.x,x.y]),
      regionalSurfaceSpawns(-1550-i,0,842136).map(x=>[x.id,x.kind,x.x,x.y]));
    for(const mob of first){
      assert.ok(mob instanceof RegionalMonster);
      assert.equal(getWorldRegion(Math.floor(mob.x/32),Math.floor(mob.y/32)),"west");
      assert.equal(CREATURE_CATALOG[mob.kind].region,"west");
      count++;
    }
  }
  assert.ok(count>0,"deve haver encontros na cordilheira");
});

test("cavernas: inimigos em pisos acessíveis, longe da escada",()=>{
  const seed=842136;
  for(const [i,theme] of themes.entries()){
    const entry:CaveEntrance={id:"cave:test:"+theme,seed,tileX:i*40,tileY:i*47,
      x:0,y:0,name:"Gruta "+theme,theme,kind:"hole"};
    const first=new CaveRoom(entry);
    const second=new CaveRoom(entry);
    assert.ok(first.monsters.size>0,theme);
    assert.ok(first.monsters.size<=4);
    assert.deepEqual([...first.monsters.values()].map(m=>[m.id,m.kind,m.x,m.y]),
      [...second.monsters.values()].map(m=>[m.id,m.kind,m.x,m.y]));
    for(const mob of first.monsters.values()){
      assert.ok(first.collision.canMove(mob.x,mob.y));
      assert.ok(CREATURE_CATALOG[mob.kind].caveThemes.includes(theme));
      assert.ok(Math.hypot(mob.x-first.player.x,mob.y-first.player.y)>70);
    }
  }
});

test("debuff: veneno cumulativo e congelamento temporário",()=>{
  const hero=new Player(), open={canMove:()=>true};
  hero.x=500;hero.y=500;
  hero.applyStatus("poison",6);
  hero.applyStatus("poison",6);
  assert.equal(hero.debuffs.poison,6);
  const start=hero.hp;
  for(let i=0;i<70;i++)hero.update(1/60,{x:0,y:0},open);
  assert.ok(hero.hp<=start-2);
  hero.applyStatus("freeze",1);
  const x=hero.x;
  hero.update(1/60,{x:1,y:0},open);
  assert.equal(hero.x,x);
});

test("loot: rolagem por id reproduzível e poeira dourada automática",()=>{
  for(const kind of REGIONAL_CREATURE_KINDS){
    const first=rollCreatureLoot(kind,"mob:4242:"+kind);
    assert.deepEqual(first,rollCreatureLoot(kind,"mob:4242:"+kind));
    assert.ok(first.every(item=>CREATURE_CATALOG[kind].loot.some(loot=>loot.item===item)));
  }
  assert.deepEqual(rollCreatureLoot("solar-scarab","auto:1"),["Poeira Dourada"]);
});
