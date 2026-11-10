import test from "node:test";
import assert from "node:assert/strict";
import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS, sandBeetleBuried } from "../src/actors/CreatureCatalog.ts";
import { RegionalMonster, southCommonSpawns, caveMonsterKinds } from "../src/actors/RegionalMonster.ts";
import { Player } from "../src/actors/Player.ts";
import { WEAPONS } from "../src/engine/character/Weapons.ts";
import { swordHitDamage } from "../src/engine/combat/SwordCombat.ts";
import { getWorldRegion } from "../src/world/regions.ts";
import { getBiomeAt } from "../src/world/biomes.ts";
import { getTile, TILE_SIZE } from "../src/world/terrain.ts";
import { renderSandBeetle } from "../src/render/sandBeetle.ts";
import { Recorder } from "./helpers/recordingContext.ts";

const collision = {canMove: () => true, speedAt: () => 1};

test("Besouro da Areia: 9x10, nível recomendado 5–18, 40 HP, golpe físico 7 e somente deserto",()=>{
  const def = CREATURE_CATALOG["sand-beetle"];
  assert.equal(def.name,"Besouro da Areia");
  assert.equal(def.maxHp,40);
  assert.equal(def.contactDamage,7);
  assert.equal(def.nature,"physical");
  assert.equal(def.special,"none");
  assert.ok(def.range<30);
  assert.equal(def.region,"south");
  assert.deepEqual(def.recommendedLevels,[5,18]);
  assert.ok(def.biomes.includes("dunes") && def.biomes.includes("ruins") && def.biomes.includes("trail"));
  assert.deepEqual(def.caveThemes,[],"espécie de superfície não invade cavernas");
  assert.ok(!caveMonsterKinds("desert").includes("sand-beetle"));
  assert.ok(REGIONAL_CREATURE_KINDS.includes("sand-beetle"));
});

test("Besouro: mandíbulas causam 7 de contato e nunca aplicam magia/status",()=>{
  const hero=new Player(), beetle=new RegionalMonster("bite","sand-beetle",0,0);
  hero.x=20;hero.y=0;
  beetle.update(1/60,hero,collision);
  assert.equal(hero.hp,93);
  assert.ok(Object.values(hero.debuffs).every(value=>value===0));
  beetle.update(1/60,hero,collision);
  assert.equal(hero.hp,93,"a recarga impede ataque a cada frame");
});

test("Besouro: defesa +2 exclusivamente quando a vida cai abaixo de 20%",()=>{
  const beetle=new RegionalMonster("buried","sand-beetle",0,0);
  assert.equal(beetle.defense,0);
  assert.equal(sandBeetleBuried(8),false);
  beetle.hp=8;
  assert.equal(beetle.defense,0,"20% exato não ativa");
  beetle.hp=7;
  assert.equal(sandBeetleBuried(7),true);
  assert.equal(beetle.defense,2);
  assert.equal(swordHitDamage("starter",beetle),Math.max(1,WEAPONS.starter.damage-2));
  beetle.hp=0;
  assert.equal(beetle.defense,0);
  assert.equal(sandBeetleBuried(0),false);
});

test("Besouro: surge em tiles válidos no Sul, incluindo dunas e trilhas, nunca na vila",()=>{
  assert.deepEqual(southCommonSpawns(0,0,842136),[]);
  let found=0;
  for(let cx=-40;cx<40;cx++)for(let cy=1550;cy<1555;cy++){
    const mobs=southCommonSpawns(cx,cy,842136);
    assert.deepEqual(mobs.map(m=>[m.id,m.kind,m.x,m.y]),
      southCommonSpawns(cx,cy,842136).map(m=>[m.id,m.kind,m.x,m.y]));
    for(const m of mobs.filter(x=>x.kind==="sand-beetle")){
      found++;
      const tx=Math.floor(m.x/TILE_SIZE),ty=Math.floor(m.y/TILE_SIZE);
      assert.equal(getWorldRegion(tx,ty),"south");
      assert.ok(CREATURE_CATALOG[m.kind].biomes.includes(getBiomeAt(tx,ty,842136)) ||
        getTile(tx,ty,842136).ground==="path");
      assert.equal(caveMonsterKinds("desert").includes(m.kind),false);
    }
  }
  assert.ok(found>=5,"a espécie precisa ser encontrável no deserto");
});

test("Besouro: arte procedural pequena, estável e distinta quando se enterra",()=>{
  const frame=(hp:number):ReturnType<Recorder["metrics"]>=>{
    const recorder=new Recorder();
    renderSandBeetle(recorder.ctx,{hp},100,100,1);
    return recorder.metrics();
  };
  const healthy=frame(40),wounded=frame(7),repeat=frame(40);
  assert.equal(healthy.signature,repeat.signature);
  assert.notEqual(healthy.signature,wounded.signature);
  assert.equal(healthy.saves,healthy.restores);
  assert.equal(wounded.saves,wounded.restores);
  assert.ok(healthy.width<=11.5 && healthy.height<=12.5,
    "corpo deve continuar pequeno em pixels do mundo");
  assert.ok(healthy.width>=7 && healthy.height>=8);
});
