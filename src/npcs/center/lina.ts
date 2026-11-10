import type { Npc, NpcAppearance, NpcDialogueState } from "../types.ts";
export const linaNpc={id:"lina",name:"Lina",role:"Anfitriã",x:448,y:250} as const satisfies Npc;
export const linaLook={ robe: "#9a6c66", trim: "#ecdcb9", accent: "#ffd37a", skin: "#e3bb94", hair: "#6c3d2c", hairStyle: "bun", prop: "lantern", width: 1, apron: "#eadfc2" } satisfies NpcAppearance;
export function linaDialogue({completed}:NpcDialogueState):readonly string[] {
  return completed
    ? ["Obrigado por ajudar Aela!", "Visite a hospedaria. Mais histórias e tarefas chegarão depois."]
    : ["Sou Lina, anfitriã da Travessia.", "Entre na hospedaria pela porta atrás de mim.", "Por enquanto não há serviço de descanso."];
}
