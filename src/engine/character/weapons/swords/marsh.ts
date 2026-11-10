import type { WeaponDefinition } from "../../Weapons.ts";

/** Ficha autoritativa individual da espada marsh; combate e inventário consomem o catálogo central. */
export const MARSH_SWORD = {name:"Cutelo Peçonhento do Charco",level:80,damage:98,interval:1.3,windup:0.14,nature:"hybrid",special:"poison",trail:{first:"#76ff03",second:"#6a1b9a",opacity:1}} as const satisfies WeaponDefinition;
