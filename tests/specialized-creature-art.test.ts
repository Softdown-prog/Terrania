import test from "node:test";
import assert from "node:assert/strict";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";
import { renderWave3Creature } from "../src/render/regionalWave3.ts";
import { renderMount } from "../src/render/mounts.ts";
import { CREATURE_CATALOG } from "../src/actors/CreatureCatalog.ts";
import { MOUNTS } from "../src/actors/MountCatalog.ts";

function capture(draw:(ctx:CanvasRenderingContext2D)=>void){
  const recorder=new Recorder();
  return withFakeDocument(recorder,()=>{draw(recorder.ctx);return recorder.metrics();});
}
test("cada espécie do primeiro lote tem silhueta/articulação própria, sem repetir traço",()=>{
  const variants=["dune-rat","sand-goblin","desert-orc"] as const;
  const frames=variants.map(kind=>capture(c=>renderWave3Creature(c,{
    kind,hp:CREATURE_CATALOG[kind].maxHp,id:"unique-"+kind,
    moving:1,motionPhase:3,casting:.6,
  },0,0,1.1)));
  for(const metrics of frames){
    assert.ok(metrics.paintOps>125,"o desenho final precisa ter camadas reais");
    assert.ok(metrics.curves>95,"precisa de anatomia e detalhes além de poucos círculos");
    assert.ok(metrics.gradients>3,"precisa de luz, volume e materiais distintos");
    assert.ok(metrics.colors>20,"precisa de paleta/material ricos");
    assert.equal(metrics.saves,metrics.restores,"Canvas save/restore desbalanceado");
  }
  assert.equal(new Set(frames.map(f=>f.signature)).size,variants.length);
});
test("ferimentos, movimento e preparação de ataque mudam de fato o desenho",()=>{
  for(const kind of ["dune-rat","sand-goblin","desert-orc"] as const){
    const base={kind,id:"test-"+kind,hp:CREATURE_CATALOG[kind].maxHp};
    const idle=capture(c=>renderWave3Creature(c,{...base,moving:0,motionPhase:0,casting:0},0,0,1));
    const moving=capture(c=>renderWave3Creature(c,{...base,moving:1,motionPhase:2.8,casting:0},0,0,1));
    const injured=capture(c=>renderWave3Creature(c,{...base,hp:Math.floor(base.hp*.3),
      hurtTime:.2,moving:0,casting:.85},0,0,1));
    assert.notEqual(idle.signature,moving.signature,kind+" não reage à passada");
    assert.notEqual(idle.signature,injured.signature,kind+" não mostra ferimento/ataque");
    assert.equal(idle.signature,capture(c=>renderWave3Creature(c,{...base,moving:0,motionPhase:0,casting:0},0,0,1)).signature);
  }
});
test("as duas montarias do Sul ganharam anatomia própria; catálogo e loot permanecem válidos",()=>{
  for(const id of ["sand-basilisk","cargo-beetle"] as const){
    const initial=capture(c=>renderMount(c,id,0,0,1.2));
    const later=capture(c=>renderMount(c,id,0,0,2.8));
    assert.ok(initial.paintOps>130,id+" ainda sem detalhamento de material");
    assert.ok(initial.gradients>3,id+" sem volume/sombras");
    assert.equal(initial.saves,initial.restores);
    assert.notEqual(initial.signature,later.signature,id+" completamente estática");
    assert.equal(initial.signature,capture(c=>renderMount(c,id,0,0,1.2)).signature);
    assert.ok(MOUNTS[id].dropsOnTame.length>=2,id+" deve manter loot canônico");
  }
  const a=capture(c=>renderMount(c,"sand-basilisk",0,0,1));
  const b=capture(c=>renderMount(c,"cargo-beetle",0,0,1));
  assert.notEqual(a.signature,b.signature);
});
test("profundidade visual não altera parâmetros de combate e loot",()=>{
  assert.equal(CREATURE_CATALOG["dune-rat"].special,"infected-bite");
  assert.equal(CREATURE_CATALOG["sand-goblin"].special,"sand-throw");
  assert.equal(CREATURE_CATALOG["desert-orc"].special,"orc-club");
  assert.ok(CREATURE_CATALOG["dune-rat"].loot.some(v=>v.item==="Rabo de Rato"));
  assert.ok(CREATURE_CATALOG["sand-goblin"].loot.some(v=>v.item==="Adaga Enferrujada"));
  assert.ok(CREATURE_CATALOG["desert-orc"].loot.some(v=>v.item==="Osso Talhado"));
});


test("32 criaturas possuem corpo procedural específico, e não só ficha de atributos", async()=>{
  const { REGIONAL_CREATURE_KINDS }=await import("../src/actors/CreatureCatalog.ts");
  const { readFileSync, existsSync }=await import("node:fs");
  const paths: Record<string,string>={
    "dune-rat":"south/duneRat",
    "sand-goblin":"south/sandGoblin",
    "desert-orc":"south/desertOrc",
    "clay-troll":"south/clayTroll",
    "dune-scout":"south/duneScout",
    "oasis-elf":"south/oasisElf",
    "mirage-imp":"south/mirageImp",
    "horned-viper":"south/hornedViper",
    "carrion-vulture":"south/carrionVulture",
    "cactus-sprout":"south/cactusSprout",
    "summit-griffin":"wave2/summitGriffin",
    "magma-salamander":"wave2/magmaSalamander",
    "rotten-marsh-ent":"wave2/rottenMarshEnt",
    "poison-scout-toad":"wave2/poisonScoutToad",
    "carrion-sandworm":"wave2/carrionSandworm",
    "tundra-mammoth":"wave2/tundraMammoth",
    "frost-banshee":"wave2/frostBanshee",
    "runic-polar-bear":"wave2/runicPolarBear",
    "abyssal-octopus":"wave2/abyssalOctopus",
    "tide-hunter-triton":"wave2/tideHunterTriton",
    "basalt-golem":"regional/basaltGolem",
    "cliff-draconid":"regional/cliffDraconid",
    "mire-hydra":"regional/mireHydra",
    "dune-scorpion":"regional/duneScorpion",
    "solar-scarab":"regional/solarScarab",
    "boreal-yeti":"regional/borealYeti",
    "glacial-wolf":"regional/glacialWolf",
    "frost-spirit":"regional/frostSpirit",
    "coral-crab":"regional/coralCrab",
    "storm-serpent":"regional/stormSerpent",
    "sand-beetle":"../sandBeetle",
  };
  assert.equal(REGIONAL_CREATURE_KINDS.length,31);
  for(const kind of REGIONAL_CREATURE_KINDS){
    const loc=paths[kind];
    assert.ok(loc,kind+" não tem arte individual");
    const full=loc.startsWith("../")?"src/render/"+loc.slice(3)+".ts":
      "src/render/creatures/"+loc+".ts";
    assert.ok(existsSync(full),kind+" não possui arquivo de anatomia");
    const contents=readFileSync(full,"utf8");
    assert.ok(contents.length>350,kind+" ainda é só uma linha de ficha");
  }
  assert.ok(readFileSync("src/render/actors.ts","utf8").includes("function renderSlime") ||
    readFileSync("src/render/actors.ts","utf8").includes("export function renderSlime"));
});


test("dez montarias possuem arquivo visual único, além de ficha de atributos própria",async()=>{
  const { MOUNT_IDS }=await import("../src/actors/MountCatalog.ts");
  const { existsSync,readFileSync }=await import("node:fs");
  const names: Record<string,string>={
    "warhorse":"warhorse","mountain-goat":"mountainGoat",
    "imperial-elk":"imperialElk","fire-lion":"fireLion",
    "sand-basilisk":"sandBasilisk","cavern-bear":"cavernBear",
    "silver-unicorn":"silverUnicorn","dark-griffin":"darkGriffin",
    "cargo-beetle":"cargoBeetle","tidal-hippocampus":"tidalHippocampus",
  };
  assert.equal(MOUNT_IDS.length,10);
  const signatures=new Set<string>();
  for(const id of MOUNT_IDS){
    const filename=names[id];
    const art=`src/render/creatures/mounts/${filename}.ts`;
    const stats=`src/actors/mounts/${filename}.ts`;
    assert.ok(existsSync(art),id+" sem desenho individual");
    assert.ok(existsSync(stats),id+" sem ficha individual");
    assert.ok(readFileSync(art,"utf8").length>1500,id+" sem anatomia detalhada");
    const first=capture(c=>renderMount(c,id,0,0,2.2));
    const moving=capture(c=>renderMount(c,id,0,0,3.5));
    assert.ok(first.paintOps>55,id+" ainda desenhado por formas insuficientes");
    assert.ok(first.gradients>=3,id+" sem material volumétrico");
    assert.ok(first.curves>35,id+" sem curvas anatômicas");
    assert.equal(first.saves,first.restores,id+" contexto Canvas desbalanceado");
    assert.notEqual(first.signature,moving.signature,id+" sem reação temporal");
    assert.equal(first.signature,capture(c=>renderMount(c,id,0,0,2.2)).signature,id+" não determinístico");
    assert.ok(!signatures.has(first.signature),id+" compartilha a mesma silhueta/traçado");
    signatures.add(first.signature);
  }
});
