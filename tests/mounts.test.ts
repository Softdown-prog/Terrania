import test from "node:test";
import assert from "node:assert/strict";
import { MOUNTS, MOUNT_IDS, RIDING_LEVEL, STABLE_UPGRADE_GEL } from "../src/actors/MountCatalog.ts";
import { MountStable, STABLE_MASTER, WILD_HOOFPRINTS, WILD_WARHORSE,
  sampleMountCaptureLoot,normalizeMountSave } from "../src/engine/mounts/MountStable.ts";
import { experienceForLevel, levelForExperience, MAX_LEVEL } from "../src/engine/character/Experience.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { ClassicTileWalker } from "../src/engine/movement/ClassicTileWalker.ts";

test("montarias: dez espécies únicas com atributos, tiers, selas, iscas e quests completas",()=>{
  assert.equal(MOUNT_IDS.length,10);
  assert.equal(new Set(MOUNT_IDS).size,10);
  const expected=[
    [200,180,.40,12,1,15],[230,220,.30,15,1,25],
    [310,260,.45,18,2,35],[450,320,.55,35,3,55],
    [280,200,.35,22,2,40],[550,180,.25,40,2,45],
    [400,450,.60,25,3,60],[380,340,.50,30,3,65],
    [480,300,.20,10,1,30],[300,280,.25,15,2,40],
  ] as const;
  MOUNT_IDS.forEach((id,i)=>{
    const m=MOUNTS[id],x=expected[i]!;
    assert.equal(m.id,id);
    assert.deepEqual([m.hp,m.stamina,m.speedBonus,m.attack,m.tier,m.level],x,id);
    assert.ok(m.saddle.length>=8&&m.bait.length>=8);
    assert.ok(m.name.length>7&&m.abilityDescription.length>25);
    assert.ok(m.dropsOnTame.length===2&&m.dropsOnTame.every(d=>d.chance>0&&d.chance<=1));
    assert.ok(m.level>=RIDING_LEVEL[m.tier]);
  });
  assert.equal(MAX_LEVEL>=65,true,"o limite do herói deve permitir Cavalaria III e o Grifo-Sombrio");
  assert.equal(levelForExperience(experienceForLevel(65)),65);
  assert.equal(MOUNTS["tidal-hippocampus"].waterSpeedBonus,.75);
  assert.equal(MOUNTS["silver-unicorn"].ability,"purify");
  assert.equal(MOUNTS["cargo-beetle"].ability,"cargo");
  assert.deepEqual(STABLE_UPGRADE_GEL,{1:12,2:25,3:40});
});
test("estábulo: nível, gel e Cavalaria não podem ser burlados por botões",()=>{
  let gel=45;
  const spend=(amount:number):boolean=>{
    if(gel<amount)return false;
    gel-=amount;return true;
  };
  const stable=new MountStable();
  const {x,y}=STABLE_MASTER;
  assert.equal(stable.upgrade(15,gel,spend,99999,99999),"too-far");
  assert.equal(stable.upgrade(14,gel,spend,x,y),"no-level");
  assert.equal(gel,45);
  assert.equal(stable.upgrade(15,gel,spend,x,y),"built");
  assert.equal(gel,33);
  assert.equal(stable.beginWarhorse(15,x,y),"no-training");
  assert.equal(stable.train(14,x,y),"no-level");
  assert.equal(stable.train(15,x,y),"trained");
  assert.equal(stable.beginWarhorse(15,x,y),"quest-started");
  assert.equal(stable.upgrade(34,gel,spend,x,y),"no-level");
  assert.equal(stable.upgrade(35,gel,spend,x,y),"upgraded");
  assert.equal(gel,8);
  assert.equal(stable.train(35,x,y),"trained");
  assert.equal(stable.upgrade(55,gel,spend,x,y),"no-gel");
  assert.equal(stable.stableTier,2);
});
test("Garrano Fugitivo: Eron entrega maçã, cascos, cinco slimes novos, cabresto, escolta e sela",()=>{
  let gel=30;const spend=(n:number)=>gel>=n?(gel-=n,true):false;
  const s=new MountStable();
  assert.equal(s.upgrade(15,gel,spend,STABLE_MASTER.x,STABLE_MASTER.y),"built");
  assert.equal(s.train(15,STABLE_MASTER.x,STABLE_MASTER.y),"trained");
  assert.equal(s.beginWarhorse(15,STABLE_MASTER.x,STABLE_MASTER.y,5),"quest-started");
  assert.equal(s.quest?.gift,"Maçã Silvestre Doce");
  assert.equal(s.tame(15,10,WILD_WARHORSE.x,WILD_WARHORSE.y),"not-ready");
  assert.equal(s.inspectTracks(0,0),"too-far");
  assert.equal(s.inspectTracks(WILD_HOOFPRINTS.x,WILD_HOOFPRINTS.y),"tracks-found");
  assert.equal(s.tame(15,9,WILD_WARHORSE.x,WILD_WARHORSE.y),"slimes-needed");
  s.synchronizeKills(10);
  assert.equal(s.quest?.step,2);
  assert.equal(s.craftHalter(gel,spend,STABLE_MASTER.x,STABLE_MASTER.y),"halter-made");
  assert.equal(gel,15);
  assert.equal(s.tame(15,10,WILD_WARHORSE.x,WILD_WARHORSE.y),"calmed");
  assert.equal(s.has("warhorse"),false,"acalmar não concede montaria antes de voltar");
  assert.equal(s.returnWarhorse(0,0),"too-far");
  assert.equal(s.returnWarhorse(STABLE_MASTER.x,STABLE_MASTER.y),"returned");
  assert.equal(s.returnWarhorse(STABLE_MASTER.x,STABLE_MASTER.y),"missing-quest");
  assert.equal(s.has("warhorse"),true);
  assert.equal(s.quest,null);
  assert.equal(s.mount("warhorse",15,0,0),"too-far");
  assert.equal(s.mount("warhorse",15,STABLE_MASTER.x,STABLE_MASTER.y),"mounted");
  assert.equal(s.active,"warhorse");
  assert.equal(s.stamina,180);
  assert.equal(s.speedMultiplier(),1.4);
  assert.equal(s.dismount(),"dismounted");
  assert.equal(s.speedMultiplier(),1);
  assert.deepEqual(sampleMountCaptureLoot("warhorse",842136),sampleMountCaptureLoot("warhorse",842136));
  assert.ok(sampleMountCaptureLoot("warhorse",842136).includes("Couro Comum"));
});
test("riding: carga exige direção reta, stamina limitada, recuperação e fadiga",()=>{
  const s=new MountStable({
    stableTier:1,ridingTier:1,owned:["warhorse"],saddled:["warhorse"],
  });
  assert.equal(s.mount("warhorse",15,STABLE_MASTER.x,STABLE_MASTER.y),"mounted");
  for(let i=0;i<130;i++)s.update(1/60,{x:1,y:0},true);
  assert.ok(s.speedMultiplier()>1.4,"investida deve surgir após 2 segundos em reta");
  assert.ok(s.stamina<180);
  for(let i=0;i<300;i++)s.update(1/60,{x:0,y:0},false);
  assert.ok(s.stamina<=180);
  for(let i=0;i<1500&&s.active;i++)s.update(1/60,{x:1,y:0},true);
  assert.equal(s.active,null,"montaria exausta desmonta sem velocidade infinita");
});
test("save de montaria: IDs falsos, tiers inválidos e sela inexistente não ativam cavalgada",()=>{
  assert.deepEqual(normalizeMountSave({stableTier:999, ridingTier:3,
    owned:["warhorse","bad-id","warhorse"],saddled:[],active:"warhorse",stamina:9999}),
    {owned:["warhorse"]});
  assert.deepEqual(normalizeMountSave({stableTier:1,ridingTier:1,
    owned:["warhorse"],saddled:["warhorse"],active:"warhorse",stamina:9999}),
    {stableTier:1,ridingTier:1,owned:["warhorse"],saddled:["warhorse"],active:"warhorse",stamina:180});
  const sim=new OfflineSimulation(842136,{seed:842136,x:432,y:48,hp:100,kills:5,defeated:[],
    experience:experienceForLevel(15),mounts:{
      stableTier:1,ridingTier:1,owned:["warhorse"],saddled:["warhorse"],active:"warhorse",stamina:170,
    }});
  assert.equal(sim.mounts.active,"warhorse");
  assert.equal(new OfflineSimulation(842136,sim.snapshot()).mounts.active,"warhorse");
  assert.equal(sim.respawn(),false);
  sim.player.hp=0;
  assert.equal(sim.respawn(),true);
  assert.equal(sim.mounts.active,null,"derrota precisa desmontar");
});
test("passos clássicos: montaria acelera no mesmo caminho e nunca ignora colisão",()=>{
  const seed=842136;
  const base=new OfflineSimulation(seed,{seed,x:208,y:48,hp:100,kills:0,defeated:[]});
  const mounted=new OfflineSimulation(seed,{seed,x:208,y:48,hp:100,kills:0,defeated:[],
    mounts:{stableTier:1,ridingTier:1,owned:["warhorse"],saddled:["warhorse"],
      active:"warhorse",stamina:180}});
  const a=new ClassicTileWalker(),b=new ClassicTileWalker();
  for(let i=0;i<55;i++){
    base.update(1/60,{x:1,y:0},false,null,a);
    mounted.update(1/60,{x:1,y:0},false,null,b);
  }
  assert.ok(mounted.player.x>base.player.x+20,
    "o mesmo passo deve percorrer mais com o cavalo");
  assert.ok(mounted.collision.canMove(mounted.player.x,mounted.player.y));
});
