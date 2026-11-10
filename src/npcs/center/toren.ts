import type { Npc, NpcAppearance, NpcDialogueState } from "../types.ts";
export const torenNpc={id:"toren",name:"Toren",role:"Ferreiro",x:538,y:32} as const satisfies Npc;
export const torenLook={ robe: "#7a5a43", trim: "#a98859", accent: "#ff9a4d", skin: "#c99a73", hair: "#3f2c20", hairStyle: "bald", prop: "hammer", width: 1.14, beard: "#4a3426", apron: "#3d3029" } satisfies NpcAppearance;
export function torenDialogue({forgeAvailable,completed}:NpcDialogueState):readonly string[] {
  if(forgeAvailable)return ["Sou Toren, ferreiro da Vila da Travessia.", "Trouxe gel de Slime? Posso trocar por uma espada forjada aqui na vila."];
  return completed
    ? ["Parabéns por proteger a clareira!", "Minha oficina está aberta para visitas. Equipamentos serão adicionados depois."]
    : ["Sou Toren, ferreiro.", "Chegue perto da porta e pressione E para visitar a oficina.", "Ainda não ofereço comércio."];
}
