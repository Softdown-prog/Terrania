import test from "node:test";
import assert from "node:assert/strict";
import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS, SOUTH_COMMON_KINDS } from "../src/actors/CreatureCatalog.ts";
import { RegionalMonster, southCommonSpawns, caveMonsterKinds, rollCreatureLoot } from "../src/actors/RegionalMonster.ts";
import { Player } from "../src/actors/Player.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { Inventory } from "../src/engine/character/Inventory.ts";
import { getBiomeAt } from "../src/world/biomes.ts";
import { getWorldRegion } from "../src/world/regions.ts";
import { caveThemeAt, type CaveEntrance } from "../src/world/caves.ts";
import { TILE_SIZE, CHUNK_TILES, getTile } from "../src/world/terrain.ts";

const profiles=[
  ["dune-rat",35,6,3,[.5,.4,.1]],
  ["sand-goblin",65,11,3,[.85,.15,.6]],
  ["desert-orc",110,17,4,[.55,.25,.5,.4]],
  ["clay-troll",145,15,3,[.75,.45,.6]],
  ["dune-scout",75,12,4,[.5,.65,.35,.5]],
  ["oasis-elf",90,16,3,[.5,.6,.18]],
  ["mirage-imp",55,14,1,[.45]],
  ["horned-viper",45,10,2,[.5,.4]],
  ["carrion-vulture",50,9,2,[.7,.3]],
  ["cactus-sprout",60,8,3,[.4,.65,.55]],
] as const;
const collision={canMove:()=>true,speedAt:()=>1};

test("terceiro lote: 10 espécies comuns e 31 regionais com o novo besouro, fichas consistentes",()=>{
  assert.equal(SOUTH_COMMON_KINDS.length,10);
  assert.equal(REGIONAL_CREATURE_KINDS.length,31);
  assert.equal(new Set(REGIONAL_CREATURE_KINDS).size,31);
  for(const [kind,hp,attack,n,percentages] of profiles) {
    const def=CREATURE_CATALOG[kind];
    assert.equal(def.maxHp,hp,kind);
    assert.equal(def.contactDamage,attack,kind);
    assert.equal(def.region,"south",kind);
    assert.equal(def.loot.length,n,kind);
    assert.deepEqual(def.loot.map(item=>item.chance),percentages,kind);
    assert.ok(def.experience>=12 && def.experience<100);
  }
  assert.deepEqual(CREATURE_CATALOG["clay-troll"].caveThemes,["marsh","desert"]);
  assert.equal(caveMonsterKinds("desert").length,13);
  assert.equal(caveMonsterKinds("marsh").length,4);
});

test("sul: muitos encontros de baixo tier, determinísticos e só em biomas e tiles válidos",()=>{
  const seed=842136;
  let observed=0,eligible=0;
  const species=new Set<string>();
  for(let cx=-40;cx<40;cx++)for(let cy=1550;cy<1553;cy++){
    const first=southCommonSpawns(cx,cy,seed);
    assert.deepEqual(first.map(m=>[m.id,m.kind,m.x,m.y]),
      southCommonSpawns(cx,cy,seed).map(m=>[m.id,m.kind,m.x,m.y]));
    eligible++;
    for(const m of first){
      observed++;species.add(m.kind);
      assert.equal(getWorldRegion(Math.floor(m.x/TILE_SIZE),Math.floor(m.y/TILE_SIZE)),"south");
      assert.ok(SOUTH_COMMON_KINDS.some(x=>x===m.kind) || m.kind === "sand-beetle");
      const tx=Math.floor(m.x/TILE_SIZE),ty=Math.floor(m.y/TILE_SIZE);
      assert.equal(Math.floor(tx/CHUNK_TILES),cx);
      assert.equal(Math.floor(ty/CHUNK_TILES),cy);
      assert.ok(CREATURE_CATALOG[m.kind].biomes.includes(getBiomeAt(tx,ty,seed)) ||
        (m.kind === "sand-beetle" && getTile(tx,ty,seed).ground === "path"));
      assert.ok(CREATURE_CATALOG[m.kind].caveThemes.includes(caveThemeAt(tx,ty)) ||
        (m.kind === "sand-beetle" && caveThemeAt(tx,ty) === "desert"));
      assert.ok(m.hp<=145);
    }
  }
  assert.ok(observed>Math.floor(eligible*.35),"tier comum deve ser encontrado com muita frequência");
  assert.ok(species.size>=4,"terreno deve apresentar variedade de inimigos");
  assert.deepEqual(southCommonSpawns(0,0,seed),[],"vila inicial sem esta fauna agressiva");
});

test("dungeons do sul: maioria da população é do tier comum",()=>{
  let common=0,all=0;
  for(let i=0;i<32;i++){
    const entrance:CaveEntrance={id:"common-cave:"+i,theme:"desert",kind:"hole",
      tileX:i*200,tileY:17000+i*47,x:0,y:0,seed:842136+i,name:"Cripta das Dunas"};
    const room=new CaveRoom(entrance);
    assert.ok(room.monsters.size>0);
    for(const mob of room.monsters.values()){
      all++;
      if(SOUTH_COMMON_KINDS.some(kind=>kind===mob.kind))common++;
    }
  }
  assert.ok(common>all*.5,"dungeon deve ser majoritariamente preenchido por tier baixo");
});

test("rato: infecção leve tem aproximadamente 10% de chance por mordida e dura três segundos",()=>{
  let infected=0;
  for(let i=0;i<240;i++){
    const h=new Player();h.x=20;h.y=0;
    const rat=new RegionalMonster("infection-rate:"+i,"dune-rat",0,0);
    rat.update(1/60,h,collision,0,false);
    if(h.debuffs.infection>0){
      infected++;
      assert.equal(h.debuffs.infection,3);
    }
  }
  assert.ok(infected>=10 && infected<=42,"infecção deve ser rara, não garantida");
  const h=new Player();h.applyStatus("infection",3);
  for(let i=0;i<185;i++)h.update(1/60,{x:0,y:0},collision);
  assert.ok(h.hp>=97 && h.hp<=98);
});

test("víbora: toxina fraca causa dois HP por segundo sem usar veneno cumulativo do pântano",()=>{
  const h=new Player();
  h.applyStatus("weak-venom",4);
  const start=h.hp;
  for(let i=0;i<200;i++)h.update(1/60,{x:0,y:0},collision);
  assert.ok(h.hp<=start-6);
  assert.equal(h.debuffs.poison,0);
});

test("goblin: só tenta arremessar areia quando a vida está baixa",()=>{
  const hero=new Player();hero.x=100;hero.y=0;
  const goblin=new RegionalMonster("goblin-run","sand-goblin",0,0);
  goblin.update(1/60,hero,collision,0,false);
  assert.equal(goblin.casting,0);
  goblin.hp=20;goblin.update(1/60,hero,collision,0,false);
  assert.ok(goblin.casting>0);
  const nearHero=new Player();nearHero.x=45;nearHero.y=0;
  const fleeing=new RegionalMonster("fleeing","sand-goblin",0,0);
  fleeing.hp=18;
  fleeing.update(.1,nearHero,collision,0,false);
  assert.ok(fleeing.x<0,"goblin should retreat when wounded and approached");
});

test("troll: recupera um HP por segundo somente após afastar-se do combate",()=>{
  const troll=new RegionalMonster("clay","clay-troll",0,0);
  const hero=new Player();hero.x=400;hero.y=400;
  troll.takeHit(0,0,30);
  const wounded=troll.hp;
  for(let i=0;i<54;i++)troll.update(.1,hero,collision,0,false);
  assert.ok(troll.hp>wounded);
  assert.ok(troll.hp<=wounded+2);
});

test("cacto: apenas espada curta provoca contra-ataque fixo de dois HP",()=>{
  const hero=new Player(),cactus=new RegionalMonster("thorns","cactus-sprout",0,0);
  hero.x=-600;hero.y=-600; // unidade de combate fora da região protegida
  cactus.onSwordHit(hero,"starter");
  assert.equal(hero.hp,100);
  cactus.onSwordHit(hero,"forge");
  assert.equal(hero.hp,98);
  cactus.onSwordHit(hero,"forge");
  assert.equal(hero.hp,96);
  hero.x=16;hero.y=16;
  cactus.onSwordHit(hero,"forge");
  assert.equal(hero.hp,96,"a proteção da vila impede dano refletido");
});

test("miragem: status diminui acerto; saques são reproduzíveis sem drop obrigatório",()=>{
  const hero=new Player(),imp=new RegionalMonster("imp","mirage-imp",0,0);
  hero.x=90;hero.y=0;
  for(let i=0;i<150&&hero.debuffs.blind<=0;i++){
    imp.update(1/60,hero,collision,0,false);
    hero.update(1/60,{x:0,y:0},collision);
  }
  assert.ok(hero.debuffs.blind>0);
  for(const kind of SOUTH_COMMON_KINDS)
    assert.deepEqual(rollCreatureLoot(kind,kind+":123"),rollCreatureLoot(kind,kind+":123"));
  assert.deepEqual(CREATURE_CATALOG["mirage-imp"].loot.map(x=>x.chance),[.45]);
  const inv=new Inventory();
  for(const item of CREATURE_CATALOG["dune-rat"].loot)assert.ok(inv.addMaterial(item.item));
  assert.equal(inv.materials["Rabo de Rato"],1);
});


test("elfo: lança solar adiciona dois de fogo ao dano de contato",()=>{
  const hero=new Player(),elf=new RegionalMonster("sun-lance","oasis-elf",0,0);
  hero.x=20;hero.y=0;
  elf.update(1/60,hero,collision,0,false);
  assert.equal(hero.hp,82);
});

test("abutre: velocidade realmente aumenta contra uma vítima abaixo da metade da vida",()=>{
  const healthy=new Player(),weak=new Player();
  healthy.x=weak.x=100;healthy.y=weak.y=0;weak.hp=40;
  const calm=new RegionalMonster("vulture-a","carrion-vulture",0,0);
  const aggressive=new RegionalMonster("vulture-b","carrion-vulture",0,0);
  calm.update(.1,healthy,collision,0,false);
  aggressive.update(.1,weak,collision,0,false);
  assert.ok(aggressive.x>calm.x*1.3);
});

test("orc: terceiro golpe bem-sucedido causa um único empurrão leve",()=>{
  const hero=new Player(500),orc=new RegionalMonster("club","desert-orc",0,0);
  let pushed=0;
  for(let i=0;i<49;i++){
    hero.update(.1,{x:0,y:0},collision);
    hero.x=25;hero.y=0;
    orc.update(.1,hero,collision,0,false);
    if(hero.x>25.5)pushed++;
  }
  assert.equal(pushed,1);
});
