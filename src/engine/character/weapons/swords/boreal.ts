import type { WeaponDefinition } from "../../Weapons.ts";

/** Ficha autoritativa individual da espada boreal; combate e inventário consomem o catálogo central. */
export const BOREAL_SWORD = {name:"Espada de Cristal Boreal",level:60,damage:68,interval:1.1,windup:0.11,nature:"hybrid",special:"ice",trail:{first:"#80e5ff",second:"#ffffff",opacity:1}} as const satisfies WeaponDefinition;
