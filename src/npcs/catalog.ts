import { BUILDINGS, SIGNS } from "../world/village.ts";
import { aelaQuestProgress } from "../world/aelaQuest.ts";
import { CENTER_NPCS, CENTER_NPC_LOOKS, CENTER_NPC_DIALOGUES } from "./center/index.ts";
import { aelaDialogue } from "./center/aela.ts";
import type { Npc, NpcAppearance, NpcDialogueState } from "./types.ts";

export const NPC_TALK_RANGE=82;
/** Patrulhas curtas: Aela e Eron ficam fixos para as missões. */
const PATROLS: Readonly<Record<string, { x: number; y: number }>> = {
  mira: { x: 65, y: 0 }, toren: { x: 35, y: 0 }, lina: { x: 0, y: 36 },
};
export function npcPositionAt(npc: Npc, time = 0): { x: number; y: number; walking: boolean } {
  const route = PATROLS[npc.id];
  if (!route || !Number.isFinite(time)) return { x: npc.x, y: npc.y, walking: false };
  const phase = Math.max(0, time) * .35;
  const step = Math.sin(phase);
  return { x: npc.x + route.x * step, y: npc.y + route.y * step,
    walking: Math.abs(Math.cos(phase)) > .08 };
}
/** Somente os cinco NPCs reais; placas e portas não são NPCs. */
export const NPC_CHARACTERS:readonly Npc[]=CENTER_NPCS;
export const NPC_LOOKS:Readonly<Record<string,NpcAppearance>>=CENTER_NPC_LOOKS;
export const NPCS:readonly Npc[]=[
  ...NPC_CHARACTERS,
  ...SIGNS.map(s=>({...s,kind:"sign" as const,role:"Aviso da vila"})),
  ...BUILDINGS.map(b=>({id:b.id,name:b.name,role:"Interior",x:b.x,y:b.y+29,kind:"door" as const})),
];
/** Sem alterar alcance, ordem nem restrição frontal das portas. */
export function nearestNpc(x:number,y:number,time=0):Npc|null {
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  let nearest:Npc|null=null;
  let distance=NPC_TALK_RANGE;
  for(const npc of NPCS){
    const pos = npcPositionAt(npc,time);
    if(npc.kind==="door"&&(Math.abs(pos.x-x)>25||Math.abs(pos.y-y)>28))continue;
    const d=Math.hypot(pos.x-x,pos.y-y);
    if(d<=distance){nearest={...npc,x:pos.x,y:pos.y};distance=d;}
  }
  return nearest;
}
/** Encaminha cada conversa para a ficha do personagem sem duplicar regras. */
export function npcDialogue(npc:Npc,kills:number,forgeAvailable=false):readonly string[]{
  const {defeated,goal,completed}=aelaQuestProgress(kills);
  const state:NpcDialogueState={defeated,goal,completed,forgeAvailable};
  const dialogue=CENTER_NPC_DIALOGUES[npc.id];
  if(dialogue)return dialogue(state);
  if(npc.id==="entrance")return ["Vila da Travessia — área protegida contra monstros.", "Da praça, siga para leste até a gruta de treinamento."];
  if(npc.id==="square")return ["Aela precisa de cinco slimes derrotados na primeira gruta a leste.", "Os caminhos ligam hospedaria, mercado, arquivo, curandeiros e armazém."];
  if(npc.id==="market-sign")return ["Mercado da Travessia. Barracas e abastecimento em expansão.", "As lojas serão ativadas em etapas posteriores."];
  if(npc.id==="east-gate")return ["Você está saindo da área protegida. Monstros podem atacar do outro lado!", "Siga a trilha leste até a Gruta dos Slimes e retorne à Aela."];
  if(npc.kind==="door")return ["Use E perto da porta para entrar em "+npc.name+"."];
  return aelaDialogue(state);
}
export type { Npc, NpcAppearance, NpcDialogueState } from "./types.ts";
