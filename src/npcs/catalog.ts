import { BUILDINGS, SIGNS } from "../world/village.ts";
import { aelaQuestProgress } from "../world/aelaQuest.ts";
import { CENTER_NPCS, CENTER_NPC_LOOKS, CENTER_NPC_DIALOGUES } from "./center/index.ts";
import { aelaDialogue } from "./center/aela.ts";
import type { Npc, NpcAppearance, NpcDialogueState } from "./types.ts";

export const NPC_TALK_RANGE=82;
/** Somente os cinco NPCs reais; placas e portas não são NPCs. */
export const NPC_CHARACTERS:readonly Npc[]=CENTER_NPCS;
export const NPC_LOOKS:Readonly<Record<string,NpcAppearance>>=CENTER_NPC_LOOKS;
export const NPCS:readonly Npc[]=[
  ...NPC_CHARACTERS,
  ...SIGNS.map(s=>({...s,kind:"sign" as const,role:"Aviso da vila"})),
  ...BUILDINGS.map(b=>({id:b.id,name:b.name,role:"Interior",x:b.x,y:b.y+29,kind:"door" as const})),
];
/** Sem alterar alcance, ordem nem restrição frontal das portas. */
export function nearestNpc(x:number,y:number):Npc|null {
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  let nearest:Npc|null=null;
  let distance=NPC_TALK_RANGE;
  for(const npc of NPCS){
    if(npc.kind==="door"&&(Math.abs(npc.x-x)>25||Math.abs(npc.y-y)>28))continue;
    const d=Math.hypot(npc.x-x,npc.y-y);
    if(d<=distance){nearest=npc;distance=d;}
  }
  return nearest;
}
/** Encaminha cada conversa para a ficha do personagem sem duplicar regras. */
export function npcDialogue(npc:Npc,kills:number,forgeAvailable=false):readonly string[]{
  const {defeated,goal,completed}=aelaQuestProgress(kills);
  const state:NpcDialogueState={defeated,goal,completed,forgeAvailable};
  const dialogue=CENTER_NPC_DIALOGUES[npc.id];
  if(dialogue)return dialogue(state);
  if(npc.id==="entrance")return ["Vila da Travessia — bem-vindo!", "Ao leste fica a praça. Ao sul, a hospedaria."];
  if(npc.id==="square")return ["Aviso: cuidado com os monstros fora da vila!", "Ajude Aela na clareira. Outras tarefas virão em etapas futuras."];
  if(npc.kind==="door")return ["Use E perto da porta para entrar em "+npc.name+"."];
  return aelaDialogue(state);
}
export type { Npc, NpcAppearance, NpcDialogueState } from "./types.ts";
