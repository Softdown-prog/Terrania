import type { Npc, NpcAppearance, NpcDialogueState } from "../types.ts";
export const miraNpc={id:"mira",name:"Mira",role:"Cartógrafa",x:304,y:16} as const satisfies Npc;
export const miraLook={ robe: "#4f7c8a", trim: "#d8c58e", accent: "#e9d9a4", skin: "#d9ae86", hair: "#2f2a3a", hairStyle: "short", prop: "scroll", width: 1 } satisfies NpcAppearance;
export function miraDialogue({completed}:NpcDialogueState):readonly string[] {
  return completed
    ? ["Aela me contou sobre sua vitória!", "Há ruínas e cavernas além da floresta. Por enquanto, conheça a vila."]
    : ["Sou Mira, cartógrafa da Vila da Travessia.", "Siga para leste, leia as placas e conheça os moradores.", "Aela ainda precisa de ajuda com os slimes."];
}
