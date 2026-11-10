import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { WEAPON_IDS, WEAPONS, weaponUnlocked, type WeaponDefinition } from "../src/engine/character/Weapons.ts";

const directory="src/engine/character/weapons/swords";
const swordFiles=WEAPON_IDS.map(id=>id+".ts");
const stages=[
  ["starter",0,8,.8,null],["forge",10,16,1,null],
  ["bronze",20,26,.95,null],["copper",30,38,1.35,"push"],
  ["dunes",45,52,1.15,"bleed"],["boreal",60,68,1.1,"ice"],
  ["obsidian",70,84,1.25,"fire"],["marsh",80,98,1.3,"poison"],
  ["tempest",90,115,1.15,"lightning"],["astral",100,140,1.4,"astral"],
] as const;

test("dez fichas individuais em weapons/swords; nenhuma espada continua inline em Weapons.ts",()=>{
  assert.equal(WEAPON_IDS.length,10);
  assert.deepEqual(readdirSync(directory).filter(n=>n.endsWith(".ts")).sort(),[...swordFiles].sort());
  const barrel=readFileSync("src/engine/character/Weapons.ts","utf8");
  for(const id of WEAPON_IDS) {
    const name=id.toUpperCase()+"_SWORD";
    const source=readFileSync(directory+"/"+id+".ts","utf8");
    assert.ok(source.includes("export const "+name+" = "),id);
    assert.ok(source.includes("satisfies WeaponDefinition"),id);
    assert.ok(source.includes('import type { WeaponDefinition }'),id);
    assert.ok(barrel.includes('from "./weapons/swords/'+id+'.ts"'),id);
    assert.ok(barrel.includes(id+": "+name),id);
    assert.equal(barrel.includes('"'+id+'": {name:'),false,id);
  }
});

test("fichas preservam progressão, atributos e compatibilidade de compra/forja",()=>{
  assert.deepEqual(Object.keys(WEAPONS),[...WEAPON_IDS]);
  for(const [id,level,damage,interval,special] of stages) {
    const def:WeaponDefinition=WEAPONS[id];
    assert.equal(def.level,level,id);
    assert.equal(def.damage,damage,id);
    assert.equal(def.interval,interval,id);
    assert.equal(def.special,special,id);
    assert.ok(def.windup>0 && def.windup<.28,id);
    assert.ok(def.trail.opacity>0 && def.trail.opacity<=1,id);
    assert.equal(weaponUnlocked(id,Math.max(1,level),id==="forge"),true,id);
  }
  assert.equal(WEAPONS.starter.name,"Espada de Treino de Carvalho");
  assert.equal(WEAPONS.forge.name,"Espada Curta de Ferro Batido");
  assert.equal(weaponUnlocked("forge",10,false),false);
  assert.equal(weaponUnlocked("astral",99,true),false);
});

test("os perfis visuais pertencem às dez fichas, não ao renderizador",()=>{
  const renderer=readFileSync("src/render/swords.ts","utf8");
  assert.equal(renderer.includes("const SHAPES"),false);
  assert.ok(renderer.includes("WEAPONS[weapon].visual"));
  const lengths=[31,35,35,39,40,40,42,41,43,44];
  const widths=[3.1,3.7,4,5.6,5.1,5.5,6.3,5.7,4.4,5.3];
  const signatures=new Set<string>();
  for(const [i,id] of WEAPON_IDS.entries()){
    const visual=WEAPONS[id].visual;
    assert.equal(visual.length,lengths[i],id);
    assert.equal(visual.width,widths[i],id);
    for(const key of ["blade","shade","glint","guard","grip"] as const)
      assert.match(visual[key],/^#[0-9a-f]{6}$/i,id+"."+key);
    assert.ok(readFileSync(directory+"/"+id+".ts","utf8").includes("visual: {"),id);
    signatures.add([visual.length,visual.width,visual.blade,visual.guard,visual.curved,visual.serrated,visual.rune].join(":"));
  }
  assert.equal(signatures.size,10);
  assert.equal(WEAPONS.starter.visual.trailLineWidth,1);
  assert.equal(WEAPONS.dunes.visual.guardReach,5);
  assert.equal(WEAPONS.tempest.visual.trailAccent,"bolts");
  assert.equal(WEAPONS.astral.visual.ornament,"stars");
  assert.equal(WEAPONS.obsidian.visual.ornament,"magma");
  assert.equal(WEAPONS.marsh.visual.ornament,"venom");
});

test("rastros elementais pertencem às fichas, não são inferidos pelo ID",()=>{
  const accents = {
    dunes:"sand",boreal:"ice-shards",obsidian:"embers",
    marsh:"venom-drops",tempest:"bolts",astral:"stars",
  } as const;
  const renderer=readFileSync("src/render/swords.ts","utf8");
  assert.ok(renderer.includes("function swordSlashAccent("));
  for(const id of Object.keys(accents) as (keyof typeof accents)[]) {
    const accent=accents[id];
    assert.equal(WEAPONS[id].visual.trailAccent,accent,id);
    assert.ok(renderer.includes('case "'+accent+'"'),accent+" não desenhado");
  }
  for(const id of ["starter","forge","bronze","copper"] as const)
    assert.equal(WEAPONS[id].visual.trailAccent,undefined,id);
  assert.equal(renderer.includes('trailAccent==="particles"'),false);
});
