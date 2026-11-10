/** Lagarto das Areias: resistência ao calor e deslocamento na areia. A ficha define regras, nunca Canvas. */
import type { MountDefinition } from "../MountCatalog.ts";

export const sandBasilisk = {
    id:"sand-basilisk",name:"Lagarto das Areias",tier:2,level:40,saddle:"Sela de Escamas Rígidas",region:"south",
    hp:280,stamina:200,speedBonus:.35,attack:22,attackName:"Ataque com Cauda",ability:"desert",
    abilityDescription:"Fervor Desértico: sem fadiga extra no calor e sobre areia movediça por 5 s.",
    dropsOnTame:[{item:"Escama Arenosa",chance:.6},{item:"Glândula de Calor",chance:.2}],
    bait:"Suco de Cacto",
} satisfies MountDefinition;
