import { drawBasaltGolem } from "../src/render/creatures/west/golems/basaltGolem.ts";
import { drawHydra } from "../src/render/creatures/south/hydras/mireHydra.ts";
import { drawDraconid } from "../src/render/creatures/west/draconids/cliffDraconid.ts";
import { drawWolf } from "../src/render/creatures/north/wolves/glacialWolf.ts";
import { drawScorpion } from "../src/render/creatures/south/scorpions/duneScorpion.ts";
import { drawCrab } from "../src/render/creatures/east/crabs/coralCrab.ts";
import { drawSerpent } from "../src/render/creatures/east/serpents/stormSerpent.ts";
import { bear } from "../src/render/creatures/north/bears/runicPolarBear.ts";
import { salamander } from "../src/render/creatures/west/salamanders/magmaSalamander.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";
import { renderWave3Creature } from "../src/render/regionalWave3.ts";
import { renderRegionalCreature } from "../src/render/regionalCreatures.ts";
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
    "dune-rat":"south/rats/duneRat",
    "sand-goblin":"south/goblins/sandGoblin",
    "desert-orc":"south/orcs/desertOrc",
    "clay-troll":"south/trolls/clayTroll",
    "dune-scout":"south/smallfolk/duneScout",
    "oasis-elf":"south/elves/oasisElf",
    "mirage-imp":"south/demons/mirageImp",
    "horned-viper":"south/snakes/hornedViper",
    "carrion-vulture":"south/vultures/carrionVulture",
    "cactus-sprout":"south/plants/cactusSprout",
    "summit-griffin":"west/griffins/summitGriffin",
    "magma-salamander":"west/salamanders/magmaSalamander",
    "rotten-marsh-ent":"south/ents/rottenMarshEnt",
    "poison-scout-toad":"south/toads/poisonScoutToad",
    "carrion-sandworm":"south/worms/carrionSandworm",
    "tundra-mammoth":"north/mammoths/tundraMammoth",
    "frost-banshee":"north/banshees/frostBanshee",
    "runic-polar-bear":"north/bears/runicPolarBear",
    "abyssal-octopus":"east/octopuses/abyssalOctopus",
    "tide-hunter-triton":"east/tritons/tideHunterTriton",
    "basalt-golem":"west/golems/basaltGolem",
    "cliff-draconid":"west/draconids/cliffDraconid",
    "mire-hydra":"south/hydras/mireHydra",
    "dune-scorpion":"south/scorpions/duneScorpion",
    "solar-scarab":"south/beetles/solarScarab",
    "boreal-yeti":"north/yetis/borealYeti",
    "glacial-wolf":"north/wolves/glacialWolf",
    "frost-spirit":"north/spirits/frostSpirit",
    "coral-crab":"east/crabs/coralCrab",
    "storm-serpent":"east/serpents/stormSerpent",
    "sand-beetle":"south/beetles/sandBeetle",
  };
  assert.equal(REGIONAL_CREATURE_KINDS.length,31);
  for(const kind of REGIONAL_CREATURE_KINDS){
    const loc=paths[kind];
    assert.ok(loc,kind+" não tem arte individual");
    const full="src/render/creatures/"+loc+".ts";
    assert.ok(existsSync(full),kind+" não possui arquivo de anatomia");
    const contents=readFileSync(full,"utf8");
    assert.ok(contents.length>350,kind+" ainda é só uma linha de ficha");
  }
  assert.ok(readFileSync("src/render/creatures/center/slimes/slime.ts","utf8").includes("export function renderSlime"),
    "Slime precisa do próprio arquivo de anatomia");
  assert.ok(readFileSync("src/render/actors.ts","utf8").includes('export { renderSlime }'),
    "API pública antiga de renderSlime deve continuar funcionando");
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

test("32 desenhos acompanham as categorias de cada ficha sem anatomias órfãs", async()=>{
  const { existsSync, readdirSync, readFileSync }=await import("node:fs");
  const root="src/monsters";
  const regions=["center","north","south","east","west"] as const;
  let artCount=0;
  for(const region of regions){
    for(const family of readdirSync(root+"/"+region,{withFileTypes:true}).filter(x=>x.isDirectory())){
      for(const item of readdirSync(root+"/"+region+"/"+family.name,{withFileTypes:true})){
        assert.ok(item.isFile()&&item.name.endsWith(".ts"),
          region+"/"+family.name+" contém item que não é ficha TypeScript");
        const species=item.name.slice(0,-3);
        const camel=species.replace(/-([a-z])/g,(_,letter:string)=>letter.toUpperCase());
        const path="src/render/creatures/"+region+"/"+family.name+"/"+camel+".ts";
        assert.ok(existsSync(path),"arte faltando para "+region+"/"+family.name+"/"+species);
        assert.ok(readFileSync(path,"utf8").length>350,"arte sem implementação: "+path);
        artCount++;
      }
    }
  }
  assert.equal(artCount,Object.keys(CREATURE_CATALOG).length);
  for(const legacy of ["src/render/creatures/wave2","src/render/creatures/regional",
      "src/render/creatures/south/geometry.ts","src/render/sandBeetle.ts"]){
    assert.equal(existsSync(legacy),false,"caminho antigo não pode coexistir: "+legacy);
  }
});


test("render de monstros: registro apenas delega a paleta e função exclusivas por espécie",async()=>{
  const { readFileSync }=await import("node:fs");
  const { REGIONAL_CREATURE_KINDS }=await import("../src/actors/CreatureCatalog.ts");
  const root=readFileSync("src/render/regionalCreatures.ts","utf8");
  assert.equal(REGIONAL_CREATURE_KINDS.length,31);
  for(const kind of REGIONAL_CREATURE_KINDS){
    const named="render"+kind.split("-").map(part=>part[0]!.toUpperCase()+part.slice(1)).join("")+"Creature";
    if(kind!=="sand-beetle"){
      const pattern=new RegExp('import\\s*\\{\\s*'+named+'\\s*\\}\\s*from\\s*"\\./creatures/([^"]+)\\.ts"');
      const match=pattern.exec(root);
      assert.ok(match,kind+" ausente do registro de renderizadores individuais");
      const art=readFileSync("src/render/creatures/"+match[1]+".ts","utf8");
      assert.ok(art.includes("const CREATURE_PALETTE:"),kind+" não possui paleta própria");
      assert.ok(art.includes("export function "+named+"("),kind+" não possui função de render própria");
      assert.ok(art.includes("Frame(ctx,actor,"),kind+" não usa composição Canvas comum");
    }
    const actor={kind,hp:CREATURE_CATALOG[kind].maxHp,id:"visual:"+kind,
      motionPhase:1.7,moving:0.8,casting:0.3};
    const a=capture(ctx=>renderRegionalCreature(ctx,actor,0,0,2.4));
    const b=capture(ctx=>renderRegionalCreature(ctx,actor,0,0,2.4));
    assert.ok(a.paintOps>12,kind+" não tem anatomia visível");
    assert.equal(a.saves,a.restores,kind+" deixou o Canvas com estado desbalanceado");
    assert.equal(a.signature,b.signature,kind+" perdeu determinismo no desenho");
  }
  for(const old of ["regionalCreatures","regionalWave2","regionalWave3"]){
    const code=readFileSync("src/render/"+old+".ts","utf8");
    assert.ok(!code.includes("switch("),old+" voltou a agrupar os desenhos");
    assert.ok(!/#[a-fA-F0-9]{6}/.test(code),old+" voltou a agrupar paletas");
  }
  for(const part of ["wave2Frame","wave3Frame","regionalFrame"]){
    const shared=readFileSync("src/render/creatures/shared/"+part+".ts","utf8");
    assert.ok(!shared.includes("switch("),part+" contém seleção de espécie");
  }
});

/**
 * Direto na anatomia, sem o Frame compartilhado: prova que são as articulações
 * e os efeitos exclusivos da espécie que reagem à simulação (e não apenas
 * sombra, escala ou o círculo genérico de conjuração).
 */
test("seis anatomias especializadas animam passada e conjuração reais, com saída determinística",()=>{
  const regional={base:"#687f99",light:"#f0e5cc",dark:"#27364b",accent:"#d59d67",eye:"#fdf0a3"};
  const bulky={base:"#a4a9ad",dark:"#344351",light:"#edf8f7",accent:"#ff9955",eyes:"#f6d181"};
  type Detail=(ctx:CanvasRenderingContext2D,phase:number,moving:number,casting:number)=>void;
  const species:ReadonlyArray<{kind:string;draw:Detail}>=[
    {kind:"glacial-wolf",draw:(c,p,m,a)=>drawWolf(c,regional,1.3,p,m,a)},
    {kind:"dune-scorpion",draw:(c,p,m,a)=>drawScorpion(c,regional,1.3,p,m,a)},
    {kind:"coral-crab",draw:(c,p,m,a)=>drawCrab(c,regional,1.3,p,m,a)},
    {kind:"storm-serpent",draw:(c,p,m,a)=>drawSerpent(c,regional,1.3,p,m,a)},
    {kind:"runic-polar-bear",draw:(c,p,m,a)=>bear(c,bulky,1.3,p,m,a)},
    {kind:"magma-salamander",draw:(c,p,m,a)=>salamander(c,bulky,1.3,p,m,a)},
  ];
  const signatures=new Set<string>();
  for(const {kind,draw} of species){
    const idle=capture(c=>draw(c,0,0,0));
    const walk=capture(c=>draw(c,2.1,1,0));
    const prepare=capture(c=>draw(c,0,0,.95));
    assert.ok(idle.paintOps>=35,kind+" sem volume anatômico mínimo");
    assert.ok(idle.paintOps<650,kind+" excedeu orçamento básico de operações Canvas");
    assert.ok(idle.curves>=14,kind+" sem traços anatômicos suficientes");
    assert.equal(idle.saves,idle.restores,kind+" desequilibrou estado do contexto");
    assert.notEqual(idle.signature,walk.signature,kind+" não articula locomoção");
    assert.notEqual(idle.signature,prepare.signature,kind+" não prepara ataque em sua anatomia");
    assert.equal(idle.signature,capture(c=>draw(c,0,0,0)).signature,kind+" não determinístico");
    assert.equal(walk.signature,capture(c=>draw(c,2.1,1,0)).signature,kind+" passada não determinística");
    assert.ok(!signatures.has(idle.signature),kind+" desenho idêntico ao de outra espécie");
    signatures.add(idle.signature);
  }
});

test("seis renderizadores especializados usam estado visual sem alterar ficha ou loot",()=>{
  for(const kind of ["glacial-wolf","dune-scorpion","coral-crab",
    "storm-serpent","runic-polar-bear","magma-salamander"] as const){
    const base={kind,hp:CREATURE_CATALOG[kind].maxHp,id:"visual-reaction:"+kind};
    const rest=capture(c=>renderRegionalCreature(c,{...base,moving:0,motionPhase:0,casting:0},0,0,1.3));
    const action=capture(c=>renderRegionalCreature(c,{...base,moving:1,motionPhase:2.1,casting:.9},0,0,1.3));
    assert.ok(action.paintOps>=rest.paintOps,kind+" perdeu detalhes na ação");
    assert.notEqual(rest.signature,action.signature,kind+" perdeu estado de movimento/ataque");
    assert.equal(action.saves,action.restores,kind+" desequilibrou Canvas");
    assert.equal(base.hp,CREATURE_CATALOG[kind].maxHp,kind+" alterou ficha de combate");
  }
});

/** O segundo lote responde à simulação na geometria própria de cada espécie. */
test("golem, hidra e draconídeo articulam deslocamento e ataque na anatomia, sem efeitos globais",()=>{
  const palette={base:"#68737b",light:"#e2d4b7",dark:"#2c3446",accent:"#a6b75f",eye:"#ffe196"};
  type Anatomy=(ctx:CanvasRenderingContext2D,c:typeof palette,
    time:number,phase:number,moving:number,casting:number)=>void;
  const species: ReadonlyArray<{kind:"basalt-golem"|"mire-hydra"|"cliff-draconid";draw:Anatomy}>=[
    {kind:"basalt-golem",draw:drawBasaltGolem},
    {kind:"mire-hydra",draw:drawHydra},
    {kind:"cliff-draconid",draw:drawDraconid},
  ];
  const signatures=new Set<string>();
  for(const {kind,draw} of species){
    const at=(phase:number,moving:number,casting:number)=>{
      return capture(ctx=>draw(ctx,palette,1.7,phase,moving,casting));
    };
    const rest=at(0,0,0);
    const still=at(3.4,0,0);
    const step=at(2.1,1,0);
    const windup=at(0,0,.95);
    assert.ok(rest.paintOps>45,kind+" ficou sem materiais e anatomia suficientes");
    assert.ok(rest.paintOps<550,kind+" excedeu o orçamento básico de Canvas");
    assert.ok(rest.curves>12,kind+" ficou sem curvas e partes anatômicas");
    assert.equal(rest.saves,rest.restores,kind+" desbalanceou o contexto Canvas");
    assert.equal(rest.signature,still.signature,kind+" animou a passada sem deslocamento real");
    assert.notEqual(rest.signature,step.signature,kind+" não reage à passada real");
    assert.notEqual(rest.signature,windup.signature,kind+" não prepara o ataque na anatomia");
    assert.ok(windup.paintOps>rest.paintOps,kind+" não ganhou detalhes durante a preparação");
    assert.equal(rest.signature,at(0,0,0).signature,kind+" não é determinístico em repouso");
    assert.equal(step.signature,at(2.1,1,0).signature,kind+" não é determinístico em movimento");
    assert.ok(!signatures.has(rest.signature),kind+" compartilha silhueta com outra espécie");
    signatures.add(rest.signature);
  }
});

test("segundo lote preserva contrato público, vida, combate e determinismo",()=>{
  for(const kind of ["basalt-golem","mire-hydra","cliff-draconid"] as const){
    const hp=CREATURE_CATALOG[kind].maxHp;
    const actor={kind,hp,id:"render-test:"+kind,moving:1,motionPhase:2.1,casting:.85};
    const a=capture(ctx=>renderRegionalCreature(ctx,actor,30,48,1.7));
    const b=capture(ctx=>renderRegionalCreature(ctx,actor,30,48,1.7));
    assert.ok(a.paintOps>45,kind+" não é desenhado via registro público");
    assert.equal(a.saves,a.restores,kind+" mudou o estado do Canvas externo");
    assert.equal(a.signature,b.signature,kind+" perdeu reprodução determinística");
    assert.equal(actor.hp,hp,kind+" modificou atributos fora do render");
  }
});
