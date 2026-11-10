import test from "node:test";
import assert from "node:assert/strict";
import { MOUNT_IDS, MOUNTS } from "../src/actors/MountCatalog.ts";
import { MOUNT_QUESTS } from "../src/world/mountQuests.ts";
import { advanceMountQuest, currentMountQuestStep, mountQuestHint,
  normalizeMountQuest, startMountQuest, synchronizeQuestKills } from "../src/engine/MountQuestState.ts";
import { MountStable, STABLE_MASTER, WILD_HOOFPRINTS, WILD_WARHORSE,
  normalizeMountSave } from "../src/engine/MountStable.ts";

test("contrato: as dez quests têm roteiro próprio, região, gatilho e ordem válida",()=>{
  assert.deepEqual(Object.keys(MOUNT_QUESTS).sort(),[...MOUNT_IDS].sort());
  const ids=new Set<string>();
  for(const id of MOUNT_IDS){
    const q=MOUNT_QUESTS[id];
    assert.equal(q.id,id);
    assert.equal(q.minimumLevel,MOUNTS[id].level,id);
    assert.ok(q.introduction.length>65);
    assert.ok(q.trigger.length>15);
    assert.ok(q.initialGift.length>5);
    assert.ok(q.steps.length>=4);
    assert.ok(!ids.has(q.title),q.title);
    ids.add(q.title);
    assert.equal(new Set(q.steps.map(x=>x.id)).size,q.steps.length);
    for(const s of q.steps){
      assert.ok(s.target.length>3&&s.hint.length>20);
      assert.ok(Number.isSafeInteger(s.count)&&s.count>=1);
    }
    assert.equal(q.playable,id==="warhorse","sem quests fictícias habilitadas");
  }
});
test("reducer: não permite habilitar nenhuma das nove quests sem sistemas regionais",()=>{
  for(const id of MOUNT_IDS.filter(id=>id!=="warhorse")){
    assert.equal(startMountQuest(id,0),null,id);
    assert.equal(normalizeMountQuest({id,step:0,count:0,killsAtStart:0,gift:"falso"}),null,id);
  }
});
test("reducer: objetivos exigem eventos específicos; não há pulo nem recompensas por cliques",()=>{
  const p=startMountQuest("warhorse",22)!;
  assert.ok(p);
  assert.equal(p.gift,"Maçã Silvestre Doce");
  assert.equal(currentMountQuestStep(p)?.id,"tracks");
  assert.equal(advanceMountQuest(p,{kind:"interact",target:"warhorse"}),p);
  assert.equal(advanceMountQuest(p,{kind:"inspect",target:"garrano-tracks",amount:0}),p);
  const tracked=advanceMountQuest(p,{kind:"inspect",target:"garrano-tracks"});
  assert.equal(tracked.step,1);
  assert.equal(synchronizeQuestKills(tracked,22),tracked);
  assert.equal(synchronizeQuestKills(tracked,26).step,1);
  assert.match(mountQuestHint(tracked,26),/4\/5/);
  const done=synchronizeQuestKills(tracked,27);
  assert.equal(done.step,2);
  assert.equal(advanceMountQuest(done,{kind:"craft",target:"sela"}),done);
  const made=advanceMountQuest(done,{kind:"craft",target:"cabresto"});
  assert.equal(made.step,3);
  assert.equal(advanceMountQuest(made,{kind:"interact",target:"warhorse"}).step,4);
  assert.equal(advanceMountQuest(made,{kind:"escort",target:"stablemaster"}),made);
});
test("save: reidrata apenas progresso legítimo, clamps de contagem e meta bloqueada",()=>{
  const good=startMountQuest("warhorse",10)!;
  const s=normalizeMountQuest({...good,count:1234});
  assert.ok(s);
  assert.equal(s.count,0);
  assert.equal(s.killsAtStart,10);
  assert.equal(s.gift,"Maçã Silvestre Doce");
  assert.equal(normalizeMountQuest({...good,step:99}),null);
  assert.equal(normalizeMountQuest({...good,killsAtStart:-50})?.killsAtStart,0);
  assert.equal(normalizeMountQuest({...good,step:2,count:99})?.count,0);
  assert.equal(normalizeMountQuest({id:"nonexistent",step:0}),null);
  assert.equal(normalizeMountSave({stableTier:1,ridingTier:1,quest:good}).quest?.id,"warhorse");
});
test("quest vivo: volta ao estábulo após salvar/recarregar; loot não é duplicado",()=>{
  let gel=18;const spend=(n:number)=>gel>=n?(gel-=n,true):false;
  let stable=new MountStable();
  assert.equal(stable.upgrade(15,gel,spend,STABLE_MASTER.x,STABLE_MASTER.y),"built");
  assert.equal(stable.train(15,STABLE_MASTER.x,STABLE_MASTER.y),"trained");
  assert.equal(stable.beginWarhorse(15,STABLE_MASTER.x,STABLE_MASTER.y,3),"quest-started");
  stable=new MountStable(stable.snapshot());
  assert.equal(stable.inspectTracks(WILD_HOOFPRINTS.x,WILD_HOOFPRINTS.y),"tracks-found");
  assert.equal(stable.tame(15,7,WILD_WARHORSE.x,WILD_WARHORSE.y),"slimes-needed");
  stable.synchronizeKills(8);
  assert.equal(stable.craftHalter(gel,spend,STABLE_MASTER.x,STABLE_MASTER.y),"halter-made");
  assert.equal(gel,3);
  assert.equal(stable.tame(15,8,WILD_WARHORSE.x,WILD_WARHORSE.y),"calmed");
  const saved=stable.snapshot();
  assert.equal(saved.quest?.step,4);
  stable=new MountStable(saved);
  assert.equal(stable.has("warhorse"),false);
  assert.equal(stable.returnWarhorse(STABLE_MASTER.x,STABLE_MASTER.y),"returned");
  assert.equal(stable.returnWarhorse(STABLE_MASTER.x,STABLE_MASTER.y),"missing-quest");
  assert.equal(stable.has("warhorse"),true);
  assert.equal(stable.snapshot().quest,undefined);
});

test("ADR 0014: nível para domar sempre acompanha o catálogo de montarias", () => {
  const entry = MOUNTS.warhorse as { level: number };
  const oldLevel = entry.level;
  const stable = new MountStable({ stableTier: 1, ridingTier: 1,
    quest: { id: "warhorse", step: 3, count: 0, killsAtStart: 0, gift: "Maçã Silvestre Doce" } });
  try {
    entry.level = oldLevel + 1;
    assert.equal(stable.tame(oldLevel, 0, WILD_WARHORSE.x, WILD_WARHORSE.y), "no-training");
    assert.equal(stable.tame(oldLevel + 1, 0, WILD_WARHORSE.x, WILD_WARHORSE.y), "calmed");
  } finally { entry.level = oldLevel; }
});
