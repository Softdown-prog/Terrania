/** Cavalo de Batalha: montaria de treino, investida em linha reta e sela de couro. A ficha define regras, nunca Canvas. */
import type { MountDefinition } from "../MountCatalog.ts";

export const warhorse = {
    id:"warhorse",name:"Cavalo de Batalha",tier:1,level:15,saddle:"Sela de Couro Simples",region:"west",
    hp:200,stamina:180,speedBonus:.40,attack:12,attackName:"Coice de Impacto",ability:"charge",
    abilityDescription:"Investida Firme: +20% de velocidade durante 4 s ao correr em linha reta.",
    dropsOnTame:[{item:"Crina Forte",chance:.8},{item:"Couro Comum",chance:1}],
    bait:"Maçã Silvestre",
} satisfies MountDefinition;
