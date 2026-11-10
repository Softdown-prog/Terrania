/** Grifo-Sombrio: planar sobre vãos onde a rota permite. A ficha define regras, nunca Canvas. */
import type { MountDefinition } from "../MountCatalog.ts";

export const darkGriffin = {
    id:"dark-griffin",name:"Grifo-Sombrio",tier:3,level:65,saddle:"Sela de Montaria Aérea",region:"west-north",
    hp:380,stamina:340,speedBonus:.50,attack:30,attackName:"Ataque de Garras",ability:"glide",
    abilityDescription:"Voo Curto: planar sobre vãos sem atravessar obstáculos fora do trajeto permitido.",
    dropsOnTame:[{item:"Pena Espessa de Grifo",chance:.5},{item:"Olho de Águia",chance:.15}],
    bait:"Carne de Caça Lendária",
} satisfies MountDefinition;
