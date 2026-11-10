import { MAX_KILLS } from "./Limits.ts";
import { MOUNT_IDS, type MountId } from "../actors/MountCatalog.ts";
import { MOUNT_QUESTS, type QuestEventKind, type MountQuestStep } from "../world/mountQuests.ts";

/** Reducer determinístico: eventos só completam o objetivo corrente. */
export interface MountQuestProgress {
  readonly id: MountId;
  readonly step: number;
  readonly count: number;
  readonly killsAtStart: number;
  readonly gift: string;
}
export interface MountQuestEvent {
  readonly kind: QuestEventKind;
  readonly target: string;
  readonly amount?: number;
}
export function startMountQuest(id:MountId,kills:number):MountQuestProgress|null {
  const def=MOUNT_QUESTS[id];
  if(!def.playable)return null;
  return {id,step:0,count:0,killsAtStart:
    Number.isSafeInteger(kills)?Math.max(0,Math.min(MAX_KILLS,kills)):0,
    gift:def.initialGift};
}
export function normalizeMountQuest(value:unknown):MountQuestProgress|null {
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const s=value as Partial<MountQuestProgress>;
  if(!MOUNT_IDS.some(id=>id===s.id)||!MOUNT_QUESTS[s.id!].playable)return null;
  const steps=MOUNT_QUESTS[s.id!].steps;
  if(typeof s.step!=="number"||!Number.isSafeInteger(s.step)||
      s.step<0||s.step>=steps.length)return null;
  const goal=steps[s.step]!.count;
  const count=typeof s.count==="number"&&Number.isSafeInteger(s.count)&&s.count>=0
    ?Math.min(s.count,goal-1):0;
  const killsAtStart=typeof s.killsAtStart==="number"&&Number.isSafeInteger(s.killsAtStart)
    ?Math.min(MAX_KILLS,Math.max(0,s.killsAtStart)):0;
  return {id:s.id!,step:s.step,count,killsAtStart,
    gift:MOUNT_QUESTS[s.id!].initialGift};
}
export function currentMountQuestStep(progress:MountQuestProgress):MountQuestStep|null {
  return MOUNT_QUESTS[progress.id].steps[progress.step]??null;
}
export function advanceMountQuest(progress:MountQuestProgress,event:MountQuestEvent):MountQuestProgress {
  const objective=currentMountQuestStep(progress);
  if(!objective||objective.event!==event.kind||objective.target!==event.target)return progress;
  const amount=event.amount??1;
  if(!Number.isSafeInteger(amount)||amount<=0)return progress;
  const next=Math.min(objective.count,progress.count+amount);
  return next>=objective.count
    ? {...progress,step:progress.step+1,count:0}
    : {...progress,count:next};
}
/** Mortes só contam após ativação, mesmo que o herói já tenha derrotado slimes antes. */
export function synchronizeQuestKills(progress:MountQuestProgress,kills:number):MountQuestProgress {
  const objective=currentMountQuestStep(progress);
  if(objective?.event!=="defeat"||objective.target!=="slime"||
      !Number.isSafeInteger(kills)||kills<0)return progress;
  const after=Math.max(0,kills-progress.killsAtStart);
  const remaining=Math.max(0,after-progress.count);
  return remaining>0 ? advanceMountQuest(progress,{kind:"defeat",target:"slime",amount:remaining}) : progress;
}
export function mountQuestHint(progress:MountQuestProgress,kills:number):string {
  const p=synchronizeQuestKills(progress,kills);
  const obj=currentMountQuestStep(p);
  if(!obj)return "Objetivos concluídos. Retorne ao estábulo.";
  if(obj.event==="defeat")return obj.hint+" ("+
    Math.min(obj.count,Math.max(0,kills-p.killsAtStart))+"/"+obj.count+")";
  return obj.hint;
}
