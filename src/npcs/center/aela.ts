import type { Npc, NpcAppearance, NpcDialogueState } from "../types.ts";
export const aelaNpc={id:"aela",name:"Aela",role:"Guardiã da clareira",x:80,y:-16} as const satisfies Npc;
export const aelaLook={ robe: "#456f4d", trim: "#b9c68b", accent: "#8fe0a8", skin: "#e0b88f", hair: "#b8763d", hairStyle: "long", prop: "staff", width: 1 } satisfies NpcAppearance;
export function aelaDialogue({defeated,goal,completed}:NpcDialogueState):readonly string[] {
  if(completed)return [
    "Você conseguiu! Cinco slimes derrotados. A clareira pode descansar por enquanto.",
    "Além das árvores há trilhas antigas e ruínas. Esta terra guarda muitos segredos.",
    "Volte quando quiser conversar. Novas missões chegarão com a expansão do mundo.",
  ];
  if(defeated>0)return [
    "Vejo que já começou a proteger a clareira. Continue firme!",
    `Você derrotou ${defeated} de ${goal} slimes. Explore as trilhas fora do círculo de pedras.`,
    "Use a espada com Espaço ou J; no celular, toque no botão ATACAR.",
  ];
  return [
    "Saudações, viajante! Sou Aela, a guardiã desta clareira.",
    "Os slimes estão se espalhando pela floresta. Preciso de ajuda para afastar cinco deles.",
    "Siga as trilhas além do arco de pedra, mas cuide da sua vida. Volte aqui para contar seus feitos!",
  ];
}
