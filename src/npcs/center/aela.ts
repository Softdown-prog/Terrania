import type { Npc, NpcAppearance, NpcDialogueState } from "../types.ts";
export const aelaNpc={id:"aela",name:"Aela",role:"Guardiã da clareira",x:80,y:-16} as const satisfies Npc;
export const aelaLook={ robe: "#456f4d", trim: "#b9c68b", accent: "#8fe0a8", skin: "#e0b88f", hair: "#b8763d", hairStyle: "long", prop: "staff", width: 1 } satisfies NpcAppearance;
export function aelaDialogue({defeated,goal,completed}:NpcDialogueState):readonly string[] {
  if(completed)return [
    "Você conseguiu! Cinco slimes derrotados. A vila está mais segura agora.",
    "Além das árvores há trilhas antigas e ruínas. Esta terra guarda muitos segredos.",
    "Volte quando quiser conversar. Mira conhece as estradas para as outras regiões.",
  ];
  if(defeated>0)return [
    "Vejo que já começou a proteger a clareira. Continue firme!",
    `Você derrotou ${defeated} de ${goal} slimes. Continue enfrentando os slimes na gruta de treinamento fora da vila.`,
    "Use a espada com Espaço ou J; no celular, toque no botão ATACAR.",
  ];
  return [
    "Saudações, viajante! Sou Aela, a guardiã desta clareira.",
    "A gruta a leste abriga slimes. Preciso que derrote cinco deles lá dentro para aprender o combate.",
    "Siga as avenidas até o portão leste e entre na primeira caverna. Treine, saia e volte para receber sua recompensa!",
  ];
}
