/** Unicórnio de Prata: purificação durante o galope. A ficha define regras, nunca Canvas. */
import type { MountDefinition } from "../MountCatalog.ts";

export const silverUnicorn = {
    id:"silver-unicorn",name:"Unicórnio de Prata",tier:3,level:60,saddle:"Sela Real Prateada",region:"east-west",
    hp:400,stamina:450,speedBonus:.60,attack:25,attackName:"Espetada Mágica",ability:"purify",
    abilityDescription:"Purificação: cura 5 HP/s e remove envenenamento enquanto galopa.",
    dropsOnTame:[{item:"Chifre Mágico Quebrado",chance:.2},{item:"Crina de Prata",chance:.4}],
    bait:"Água Pura da Fonte dos Anjos",
} satisfies MountDefinition;
