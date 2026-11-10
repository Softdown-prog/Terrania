/** Leão do Fogo: aura flamejante e ataque de garras. A ficha define regras, nunca Canvas. */
import type { MountDefinition } from "../MountCatalog.ts";

export const fireLion = {
    id:"fire-lion",name:"Leão do Fogo / Cazador",tier:3,level:55,saddle:"Sela de Escamas Vulcânicas",region:"west",
    hp:450,stamina:320,speedBonus:.55,attack:35,attackName:"Morder / Garras de Fogo",ability:"fire-aura",
    abilityDescription:"Crina Ardente: ilumina e causa 5 de dano de fogo por contato.",
    dropsOnTame:[{item:"Juba de Fogo",chance:.3},{item:"Dente de Leão-Maravilha",chance:.15}],
    bait:"Amuleto de Brasa",
} satisfies MountDefinition;
